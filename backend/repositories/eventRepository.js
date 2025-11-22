const { getPool } = require("../db/pool");
const { v4: uuidv4 } = require("uuid");

function parseTags(tagsValue) {
  if (!tagsValue) return [];

  if (Array.isArray(tagsValue)) {
    return tagsValue;
  }

  try {
    const parsed = JSON.parse(tagsValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse event tags JSON:", error.message);
    return [];
  }
}

function sanitizeFilterValue(value) {
  if (value === undefined || value === null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const lower = trimmed.toLowerCase();
    if (lower === "undefined" || lower === "null" || lower === "nan") {
      return null;
    }

    return trimmed;
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return null;
  }

  return value;
}

function parseNumericFilter(value) {
  const sanitized = sanitizeFilterValue(value);
  if (sanitized === null) return null;

  const numberValue = Number.parseInt(sanitized, 10);
  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

function buildEventFilterWhereClause(filters = {}) {
  const clauses = [];
  const params = [];

  const addClause = (clause, values) => {
    clauses.push(clause);
    if (Array.isArray(values)) {
      params.push(...values);
    } else if (values !== undefined) {
      params.push(values);
    }
  };

  const status = sanitizeFilterValue(filters.status);
  if (status) {
    addClause("e.status = ?", status);
  }

  const eventType = sanitizeFilterValue(filters.event_type);
  if (eventType) {
    addClause("e.event_type = ?", eventType);
  }

  const locationType = sanitizeFilterValue(filters.location_type);
  if (locationType) {
    addClause("e.location_type = ?", locationType);
  }

  const dateFrom = sanitizeFilterValue(filters.date_from);
  if (dateFrom) {
    addClause("e.start_datetime >= ?", dateFrom);
  }

  const dateTo = sanitizeFilterValue(filters.date_to);
  if (dateTo) {
    addClause("e.end_datetime <= ?", dateTo);
  }

  const searchTermRaw = sanitizeFilterValue(filters.search);
  if (searchTermRaw) {
    const searchTerm = `%${searchTermRaw}%`;
    addClause("(e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)", [
      searchTerm,
      searchTerm,
      searchTerm,
    ]);
  }

  const createdBy = sanitizeFilterValue(filters.created_by);
  if (createdBy) {
    addClause("e.created_by_user_id = ?", createdBy);
  }

  const whereClause = clauses.length ? ` AND ${clauses.join(" AND ")}` : "";
  return { whereClause, params };
}

function resolvePagination(filters = {}) {
  const limitValue = parseNumericFilter(filters.limit);
  const offsetValue = parseNumericFilter(filters.offset);

  if (limitValue === null || limitValue <= 0) {
    return { limit: null, offset: null };
  }

  const safeLimit = Math.min(limitValue, 500);
  const safeOffset = Math.max(offsetValue || 0, 0);
  return { limit: safeLimit, offset: safeOffset };
}

class EventRepository {
  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  async createEvent(eventData, createdByUserId) {
    const {
      title,
      description,
      event_type,
      location,
      location_type,
      start_datetime,
      end_datetime,
      max_participants,
      min_participants,
      registration_deadline,
      image_url,
      tags,
      requirements,
      contact_email,
      contact_phone,
    } = eventData;

    const uid = uuidv4();
    const tagsJson = tags ? JSON.stringify(tags) : null;

    await getPool().execute(
      `INSERT INTO events (
        uid, title, description, event_type, location, location_type,
        start_datetime, end_datetime, max_participants, min_participants,
        registration_deadline, created_by_user_id, image_url, tags,
        requirements, contact_email, contact_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        uid,
        title,
        description || null,
        event_type || "other",
        location || null,
        location_type || "on_site",
        start_datetime,
        end_datetime,
        max_participants || null,
        min_participants || 0,
        registration_deadline || null,
        createdByUserId,
        image_url || null,
        tagsJson,
        requirements || null,
        contact_email || null,
        contact_phone || null,
      ]
    );

    return this.getEventByUid(uid);
  }

  async updateEvent(eventUid, updates) {
    const allowedFields = [
      "title",
      "description",
      "event_type",
      "location",
      "location_type",
      "start_datetime",
      "end_datetime",
      "max_participants",
      "min_participants",
      "registration_deadline",
      "image_url",
      "tags",
      "requirements",
      "contact_email",
      "contact_phone",
    ];

    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(
          key === "tags" ? JSON.stringify(updates[key]) : updates[key]
        );
      }
    });

    if (fields.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(eventUid);

    await getPool().execute(
      `UPDATE events SET ${fields.join(", ")} WHERE uid = ?`,
      values
    );

    return this.getEventByUid(eventUid);
  }

  async deleteEvent(eventUid) {
    const [result] = await getPool().execute(
      "DELETE FROM events WHERE uid = ?",
      [eventUid]
    );
    return result.affectedRows > 0;
  }

  async getEventByUid(eventUid) {
    const [rows] = await getPool().execute(
      `SELECT 
        e.*,
        u.name as created_by_name,
        u.email as created_by_email,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'waitlisted') as waitlist_count
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      WHERE e.uid = ?`,
      [eventUid]
    );

    if (rows.length === 0) return null;

    const event = rows[0];
    event.tags = parseTags(event.tags);
    return event;
  }

  async getAllEvents(filters = {}) {
    const { whereClause, params } = buildEventFilterWhereClause(filters);
    const { limit, offset } = resolvePagination(filters);
    const resolvedLimit = Number.isFinite(limit) ? limit : null;
    const resolvedOffset = Number.isFinite(offset) ? offset : 0;

    const baseQuery = `
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      WHERE 1=1${whereClause}
    `;

    let dataQuery = `
      SELECT 
        e.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'waitlisted') as waitlist_count
      ${baseQuery}
      ORDER BY e.start_datetime ASC
    `;

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    const dataParams = [...params];
    if (resolvedLimit !== null) {
      dataQuery += ` LIMIT ${resolvedLimit} OFFSET ${resolvedOffset}`;
    }

    const [rows] = await getPool().execute(dataQuery, dataParams);
    const [[countRow]] = await getPool().execute(countQuery, params);

    const events = rows.map((event) => {
      event.tags = parseTags(event.tags);
      return event;
    });

    const total = Number(countRow?.total) || 0;

    return {
      events,
      total,
      pagination: {
        limit: resolvedLimit ?? events.length,
        offset: resolvedOffset ?? 0,
      },
    };
  }

  async getEventsByCreator(userId) {
    const { events } = await this.getAllEvents({ created_by: userId });
    return events;
  }

  async getUpcomingEvents(limit = 10) {
    const [rows] = await getPool().execute(
      `SELECT 
        e.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'waitlisted') as waitlist_count
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      WHERE e.status = 'published' 
        AND e.start_datetime > NOW()
      ORDER BY e.start_datetime ASC
      LIMIT ?`,
      [limit]
    );

    return rows.map((event) => ({
      ...event,
      tags: parseTags(event.tags),
    }));
  }

  // ============================================
  // PARTICIPANT MANAGEMENT
  // ============================================

  async registerParticipant(eventUid, userId) {
    // Get event details
    const event = await this.getEventByUid(eventUid);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if already registered
    const exists = await this.checkParticipantExists(eventUid, userId);
    if (exists) {
      throw new Error("Already registered for this event");
    }

    // Check if user has a historical participation record
    const [historicalRows] = await getPool().execute(
      `SELECT participant_id, status FROM event_participants 
       WHERE event_id = ? AND user_id = ?
       LIMIT 1`,
      [event.event_id, userId]
    );

    // Check capacity
    const isFull = await this.checkEventCapacity(eventUid);
    const status = isFull ? "waitlisted" : "registered";

    if (historicalRows.length > 0) {
      const historicalParticipant = historicalRows[0];
      // Reactivate historical participation (e.g., after cancellation/no_show)
      await getPool().execute(
        `UPDATE event_participants 
         SET status = ?,
             registration_date = NOW(),
             cancellation_date = NULL,
             attendance_marked_at = NULL,
             attendance_marked_by = NULL
         WHERE participant_id = ?`,
        [status, historicalParticipant.participant_id]
      );

      return {
        status,
        message: isFull
          ? "You were added back to the waitlist"
          : "Welcome back! Your registration has been restored",
      };
    }

    await getPool().execute(
      `INSERT INTO event_participants (event_id, user_id, status)
       VALUES (?, ?, ?)`,
      [event.event_id, userId, status]
    );

    return {
      status,
      message: isFull ? "Added to waitlist" : "Successfully registered",
    };
  }

  async cancelParticipation(eventUid, userId) {
    const event = await this.getEventByUid(eventUid);
    if (!event) {
      throw new Error("Event not found");
    }

    const [result] = await getPool().execute(
      `UPDATE event_participants 
       SET status = 'cancelled', cancellation_date = NOW()
       WHERE event_id = ? AND user_id = ? AND status IN ('registered', 'waitlisted')`,
      [event.event_id, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Participation not found or already cancelled");
    }

    // Check if someone from waitlist can be promoted
    const promotedParticipant = await this.promoteFromWaitlist(event.event_id);

    return { promotedParticipant };
  }

  async promoteFromWaitlist(eventId) {
    // Check if there's space now
    const [[event]] = await getPool().execute(
      "SELECT max_participants FROM events WHERE event_id = ?",
      [eventId]
    );

    if (!event || !event.max_participants) return null; // Unlimited capacity

    const [[count]] = await getPool().execute(
      `SELECT COUNT(*) as registered 
       FROM event_participants 
       WHERE event_id = ? AND status = 'registered'`,
      [eventId]
    );

    const registeredCount = count?.registered || 0;
    if (registeredCount < event.max_participants) {
      const [nextInLine] = await getPool().execute(
        `SELECT participant_id, user_id 
           FROM event_participants
          WHERE event_id = ? AND status = 'waitlisted'
          ORDER BY registration_date ASC
          LIMIT 1`,
        [eventId]
      );

      if (!nextInLine.length) {
        return null;
      }

      await getPool().execute(
        `UPDATE event_participants 
           SET status = 'registered',
               registration_date = NOW(),
               cancellation_date = NULL
         WHERE participant_id = ?`,
        [nextInLine[0].participant_id]
      );

      return nextInLine[0];
    }

    return null;
  }

  async getEventParticipants(eventUid, status = null) {
    const event = await this.getEventByUid(eventUid);
    if (!event) {
      throw new Error("Event not found");
    }

    let query = `
      SELECT 
        ep.*,
        u.uid as user_uid,
        u.name,
        u.email,
        up.mobile_number as contact_number,
        marked_by.name as marked_by_name
      FROM event_participants ep
      INNER JOIN users u ON ep.user_id = u.user_id
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      LEFT JOIN users marked_by ON ep.attendance_marked_by = marked_by.user_id
      WHERE ep.event_id = ?
    `;

    const params = [event.event_id];

    if (status) {
      query += " AND ep.status = ?";
      params.push(status);
    }

    query += " ORDER BY ep.registration_date DESC";

    const [rows] = await getPool().execute(query, params);

    const uniqueByUser = [];
    const seenUsers = new Set();

    for (const participant of rows) {
      if (seenUsers.has(participant.user_id)) {
        continue;
      }
      seenUsers.add(participant.user_id);
      uniqueByUser.push(participant);
    }

    // Re-sort chronologically for consistent UI rendering
    return uniqueByUser.sort(
      (a, b) =>
        new Date(a.registration_date).getTime() -
        new Date(b.registration_date).getTime()
    );
  }

  async getParticipantEvents(userId, status = null) {
    let query = `
      SELECT 
        e.*,
        ep.status as participation_status,
        ep.registration_date,
        ep.cancellation_date,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM event_participants ep2 
         WHERE ep2.event_id = e.event_id AND ep2.status = 'registered') as participant_count
      FROM event_participants ep
      INNER JOIN events e ON ep.event_id = e.event_id
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      WHERE ep.user_id = ?
    `;

    const params = [userId];

    if (status) {
      query += " AND ep.status = ?";
      params.push(status);
    }

    query += " ORDER BY e.start_datetime ASC";

    const [rows] = await getPool().execute(query, params);
    return rows.map((event) => ({
      ...event,
      tags: parseTags(event.tags),
    }));
  }

  async getUserParticipationSummary(userId) {
    const events = await this.getParticipantEvents(userId);

    return events.map((event) => ({
      uid: event.uid,
      title: event.title,
      event_status: event.status,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      participation_status: event.participation_status,
      registration_date: event.registration_date,
      cancellation_date: event.cancellation_date,
    }));
  }

  async updateParticipantStatus(eventUid, userId, newStatus, markedBy = null) {
    const event = await this.getEventByUid(eventUid);
    if (!event) {
      throw new Error("Event not found");
    }

    const updates = ["status = ?"];
    const params = [newStatus];

    if (newStatus === "attended" && markedBy) {
      updates.push("attendance_marked_at = NOW()");
      updates.push("attendance_marked_by = ?");
      params.push(markedBy);
    }

    params.push(event.event_id, userId);

    await getPool().execute(
      `UPDATE event_participants 
       SET ${updates.join(", ")}
       WHERE event_id = ? AND user_id = ?`,
      params
    );

    return true;
  }

  async checkParticipantExists(eventUid, userId) {
    const event = await this.getEventByUid(eventUid);
    if (!event) return false;

    const [rows] = await getPool().execute(
      `SELECT 1 FROM event_participants 
       WHERE event_id = ? AND user_id = ? AND status IN ('registered', 'waitlisted')`,
      [event.event_id, userId]
    );

    return rows.length > 0;
  }

  async getParticipantCount(eventUid) {
    const event = await this.getEventByUid(eventUid);
    if (!event) return 0;

    const [rows] = await getPool().execute(
      `SELECT COUNT(*) as count FROM event_participants 
       WHERE event_id = ? AND status = 'registered'`,
      [event.event_id]
    );

    return rows[0].count;
  }

  async checkEventCapacity(eventUid) {
    const event = await this.getEventByUid(eventUid);
    if (!event || !event.max_participants) return false; // Unlimited capacity

    const count = await this.getParticipantCount(eventUid);
    return count >= event.max_participants;
  }

  // ============================================
  // EVENT LIFECYCLE
  // ============================================

  async publishEvent(eventUid, userId) {
    await getPool().execute(
      `UPDATE events 
       SET status = 'published',
           postponed_at = NULL,
           postponed_until = NULL,
           postponed_reason = NULL,
           postponed_by_user_id = NULL,
           previous_start_datetime = NULL,
           previous_end_datetime = NULL
       WHERE uid = ?`,
      [eventUid]
    );

    return this.getEventByUid(eventUid);
  }

  async archiveEvent(eventUid, userId) {
    await getPool().execute(
      `UPDATE events 
       SET status = 'archived', 
           archived_at = NOW(),
           archived_by_user_id = ?
       WHERE uid = ?`,
      [userId, eventUid]
    );

    return this.getEventByUid(eventUid);
  }

  async postponeEvent(
    eventUid,
    userId,
    { postponedUntil = null, reason = null } = {}
  ) {
    const event = await this.getEventByUid(eventUid);
    if (!event) {
      return null;
    }

    await getPool().execute(
      `UPDATE events 
       SET status = 'postponed',
           postponed_at = NOW(),
           postponed_until = ?,
           postponed_reason = ?,
           postponed_by_user_id = ?,
           previous_start_datetime = start_datetime,
           previous_end_datetime = end_datetime
       WHERE uid = ?`,
      [postponedUntil || null, reason || null, userId, eventUid]
    );

    return this.getEventByUid(eventUid);
  }

  async markEventAsCompleted(eventUid) {
    await getPool().execute(
      `UPDATE events SET status = 'completed' WHERE uid = ?`,
      [eventUid]
    );

    return this.getEventByUid(eventUid);
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getEventStats(eventUid) {
    const event = await this.getEventByUid(eventUid);
    if (!event) {
      throw new Error("Event not found");
    }

    const [stats] = await getPool().execute(
      `SELECT 
        COUNT(*) as total_participants,
        SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
      FROM event_participants
      WHERE event_id = ?`,
      [event.event_id]
    );

    return stats[0];
  }

  async getCreatorEventStats(userId) {
    const [stats] = await getPool().execute(
      `SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
      FROM events
      WHERE created_by_user_id = ?`,
      [userId]
    );

    return stats[0];
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  async logActivity(eventUid, userId, action, description) {
    const event = await this.getEventByUid(eventUid);
    if (!event) return;

    const [user] = await getPool().execute(
      "SELECT name, role_id FROM users WHERE user_id = ?",
      [userId]
    );

    if (user.length === 0) return;

    const [roleRows] = await getPool().execute(
      "SELECT role FROM roles WHERE role_id = ?",
      [user[0].role_id]
    );

    const roleName = roleRows[0]?.role || "unknown";

    await getPool().execute(
      `INSERT INTO activity_logs (
        type, action, severity, performed_by_user_id, performed_by_name,
        performed_by_role, target_resource_type, target_resource_id, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "event",
        action,
        "info",
        userId,
        user[0].name,
        roleName,
        "event",
        event.uid,
        description,
      ]
    );
  }
}

module.exports = new EventRepository();

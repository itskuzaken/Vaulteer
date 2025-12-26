const { getPool } = require("../db/pool");
const { convertUtcIsoToPlus8Input, convertUtcIsoToPlus8Friendly } = require('../utils/datetime');
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

function sanitizeDateFilter(value) {
  // Accept ISO date (YYYY-MM-DD) or full ISO datetime; reject malformed values
  const v = sanitizeFilterValue(value);
  if (!v) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // ISO datetime
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v;
  // Try parsing as a Date and format to YYYY-MM-DD
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
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

  const dateFrom = sanitizeDateFilter(filters.date_from);
  if (dateFrom) {
    addClause("e.start_datetime >= ?", dateFrom);
  }

  const dateTo = sanitizeDateFilter(filters.date_to);
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

    // Allow callers to provide per-event attendance overrides; fall back to DB defaults
    const checkinWindow = Number.isFinite(Number(eventData.attendance_checkin_window_mins))
      ? Number(eventData.attendance_checkin_window_mins)
      : undefined;
    const graceMins = Number.isFinite(Number(eventData.attendance_grace_mins))
      ? Number(eventData.attendance_grace_mins)
      : undefined;

    await getPool().execute(
      `INSERT INTO events (
        uid, title, description, event_type, location, location_type,
        start_datetime, end_datetime, max_participants, min_participants,
        registration_deadline, created_by_user_id, image_url, tags,
        requirements, contact_email, contact_phone, attendance_checkin_window_mins, attendance_grace_mins, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
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
        checkinWindow === undefined ? null : checkinWindow,
        graceMins === undefined ? null : graceMins,
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
      // Attendance timing overrides (per-event)
      "attendance_checkin_window_mins",
      "attendance_grace_mins",
    ];

    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === "tags") {
          values.push(JSON.stringify(updates[key]));
        } else if (key === "attendance_checkin_window_mins" || key === "attendance_grace_mins") {
          // Coerce to integer when provided; allow null to clear
          const n = updates[key] === null || updates[key] === undefined ? null : Number(updates[key]);
          values.push(Number.isFinite(n) ? n : null);
        } else {
          values.push(updates[key]);
        }
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
    const queryWithNewCols = `SELECT 
        e.event_id, e.uid, e.title, e.description, e.event_type, e.status,
        e.location, e.location_type,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as start_datetime,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as start_datetime_local,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as end_datetime,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as end_datetime_local,
        e.max_participants, e.min_participants, e.image_url,
        e.tags, e.created_by_user_id,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as created_at,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as created_at_local,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as updated_at,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as updated_at_local,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as archived_at,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as archived_at_local,
        e.attendance_checkin_window_mins,
        e.attendance_grace_mins,
        u.name as created_by_name,
        u.email as created_by_email,
        etd.type_label as event_type_label,
        etd.points_per_participation as event_type_points,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'waitlisted') as waitlist_count
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      LEFT JOIN event_type_definitions etd ON e.event_type = etd.type_code
      WHERE e.uid = ?`;

    const queryWithoutNewCols = `SELECT 
        e.event_id, e.uid, e.title, e.description, e.event_type, e.status,
        e.location, e.location_type,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as start_datetime,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as start_datetime_local,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as end_datetime,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as end_datetime_local,
        e.max_participants, e.min_participants, e.image_url,
        e.tags, e.created_by_user_id,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as created_at,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as created_at_local,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as updated_at,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as updated_at_local,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as archived_at,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as archived_at_local,
        u.name as created_by_name,
        u.email as created_by_email,
        etd.type_label as event_type_label,
        etd.points_per_participation as event_type_points,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'waitlisted') as waitlist_count
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      LEFT JOIN event_type_definitions etd ON e.event_type = etd.type_code
      WHERE e.uid = ?`;

    let rows;
    try {
      [rows] = await getPool().execute(queryWithNewCols, [eventUid]);
    } catch (err) {
      // If DB schema not migrated in test env, fall back to query without new cols
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.sqlState === '42S22')) {
        [rows] = await getPool().execute(queryWithoutNewCols, [eventUid]);
        if (rows && rows[0]) {
          // supply defaults so callers can rely on these properties
          rows[0].attendance_checkin_window_mins = 15;
          rows[0].attendance_grace_mins = 10;
        }
      } else {
        throw err;
      }
    }

    if (rows.length === 0) return null;

    const event = rows[0];
    event.tags = parseTags(event.tags);
    // Add local +08 representations for convenience in the UI
    try {
      event.start_datetime_local = convertUtcIsoToPlus8Input(event.start_datetime);
      event.end_datetime_local = convertUtcIsoToPlus8Input(event.end_datetime);
      event.start_datetime_local_friendly = convertUtcIsoToPlus8Friendly(event.start_datetime);
      event.end_datetime_local_friendly = convertUtcIsoToPlus8Friendly(event.end_datetime);
    } catch (e) {
      // ignore conversion errors
    }
    return event;
  }

  async getEventById(eventId) {
    const queryWithNewCols = `SELECT 
        e.event_id, e.uid, e.title, e.description, e.event_type, e.status,
        e.location, e.location_type,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as start_datetime,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as start_datetime_local,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as end_datetime,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as end_datetime_local,
        e.max_participants, e.min_participants, e.image_url,
        e.tags, e.created_by_user_id,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as created_at,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as created_at_local,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as updated_at,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as updated_at_local,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as archived_at,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as archived_at_local,
        e.attendance_checkin_window_mins,
        e.attendance_grace_mins,
        u.name as created_by_name,
        u.email as created_by_email,
        etd.type_label as event_type_label,
        etd.points_per_participation as event_type_points,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'waitlisted') as waitlist_count
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      LEFT JOIN event_type_definitions etd ON e.event_type = etd.type_code
      WHERE e.event_id = ?`;

    const queryWithoutNewCols = `SELECT 
        e.event_id, e.uid, e.title, e.description, e.event_type, e.status,
        e.location, e.location_type,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as start_datetime,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as start_datetime_local,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as end_datetime,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as end_datetime_local,
        e.max_participants, e.min_participants, e.image_url,
        e.tags, e.created_by_user_id,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as created_at,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as created_at_local,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as updated_at,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as updated_at_local,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as archived_at,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as archived_at_local,
        u.name as created_by_name,
        u.email as created_by_email,
        etd.type_label as event_type_label,
        etd.points_per_participation as event_type_points,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT COUNT(*) FROM event_participants ep 
         WHERE ep.event_id = e.event_id AND ep.status = 'waitlisted') as waitlist_count
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.user_id
      LEFT JOIN event_type_definitions etd ON e.event_type = etd.type_code
      WHERE e.event_id = ?`;

    let rows;
    try {
      [rows] = await getPool().execute(queryWithNewCols, [eventId]);
    } catch (err) {
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.sqlState === '42S22')) {
        [rows] = await getPool().execute(queryWithoutNewCols, [eventId]);
        if (rows && rows[0]) {
          rows[0].attendance_checkin_window_mins = 15;
          rows[0].attendance_grace_mins = 10;
        }
      } else {
        throw err;
      }
    }

    if (!rows || rows.length === 0) return null;

    const event = rows[0];
    event.tags = parseTags(event.tags);
    try {
      event.start_datetime_local = convertUtcIsoToPlus8Input(event.start_datetime);
      event.end_datetime_local = convertUtcIsoToPlus8Input(event.end_datetime);
      event.start_datetime_local_friendly = convertUtcIsoToPlus8Friendly(event.start_datetime);
      event.end_datetime_local_friendly = convertUtcIsoToPlus8Friendly(event.end_datetime);
    } catch (e) {
      // ignore conversion errors
    }
    return event;
  }

  async getWaitlistPosition(eventUid, userId) {
    const event = await this.getEventByUid(eventUid);
    if (!event) {
      throw new Error("Event not found");
    }

    // Only calculate position if user is waitlisted
    const status = await this.getParticipantStatus(eventUid, userId);
    if (status !== 'waitlisted') {
      return null;
    }

    // Get the user's registration date
    const [userRows] = await getPool().execute(
      `SELECT registration_date FROM event_participants 
       WHERE event_id = ? AND user_id = ? AND status = 'waitlisted'`,
      [event.event_id, userId]
    );

    if (userRows.length === 0) {
      return null;
    }

    const userRegistrationDate = userRows[0].registration_date;

    // Count how many waitlisted users registered before this user
    const [positionRows] = await getPool().execute(
      `SELECT COUNT(*) as position FROM event_participants 
       WHERE event_id = ? AND status = 'waitlisted' 
       AND registration_date < ?`,
      [event.event_id, userRegistrationDate]
    );

    return (positionRows[0].position || 0) + 1; // Position is 1-indexed
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
        e.event_id, e.uid, e.title, e.description, e.event_type, e.status,
        e.location, e.location_type,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as start_datetime,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as start_datetime_local,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as end_datetime,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as end_datetime_local,
        e.max_participants, e.min_participants, e.image_url,
        e.tags, e.created_by_user_id,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as created_at,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as created_at_local,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as updated_at,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as updated_at_local,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as archived_at,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as archived_at_local,
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
      try {
        event.start_datetime_local = convertUtcIsoToPlus8Input(event.start_datetime);
        event.end_datetime_local = convertUtcIsoToPlus8Input(event.end_datetime);
      } catch (e) {
        // ignore
      }
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
        e.event_id, e.uid, e.title, e.description, e.event_type, e.status,
        e.location, e.location_type,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as start_datetime,
        DATE_FORMAT(CONVERT_TZ(e.start_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as start_datetime_local,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as end_datetime,
        DATE_FORMAT(CONVERT_TZ(e.end_datetime, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as end_datetime_local,
        e.max_participants, e.min_participants, e.image_url,
        e.tags, e.created_by_user_id,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as created_at,
        DATE_FORMAT(CONVERT_TZ(e.created_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as created_at_local,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as updated_at,
        DATE_FORMAT(CONVERT_TZ(e.updated_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as updated_at_local,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') as archived_at,
        DATE_FORMAT(CONVERT_TZ(e.archived_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i:%s+08:00') as archived_at_local,
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

    return rows.map((event) => {
      event.tags = parseTags(event.tags);
      try {
        event.start_datetime_local = convertUtcIsoToPlus8Input(event.start_datetime);
        event.end_datetime_local = convertUtcIsoToPlus8Input(event.end_datetime);
      } catch (e) {}
      return event;
    });
  }

  // ============================================
  // PARTICIPANT MANAGEMENT
  // ============================================

  async registerParticipant(eventUid, userId) {
    // Use a DB transaction to prevent race conditions during capacity checks and registration
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock event row
      const [[eventRow]] = await conn.execute(
        `SELECT event_id, max_participants FROM events WHERE uid = ? FOR UPDATE`,
        [eventUid]
      );
      if (!eventRow) {
        throw new Error("Event not found");
      }

      const eventId = eventRow.event_id;

      // Check if already registered (registered or waitlisted)
      const [existingRows] = await conn.execute(
        `SELECT status FROM event_participants WHERE event_id = ? AND user_id = ? AND status IN ('registered','waitlisted') LIMIT 1`,
        [eventId, userId]
      );
      if (existingRows.length > 0) {
        // If there's already a registration, return the current status so the client can update gracefully
        // Do not return a user-facing message here to avoid overriding the standard success flows in callers.
        const existingStatus = existingRows[0].status;
        await conn.commit();
        return { status: existingStatus };
      }

      // Check historical participation
      const [historicalRows] = await conn.execute(
        `SELECT participant_id, status FROM event_participants WHERE event_id = ? AND user_id = ? LIMIT 1`,
        [eventId, userId]
      );

      // Count registered participants
      const [[countRow]] = await conn.execute(
        `SELECT COUNT(*) AS registered FROM event_participants WHERE event_id = ? AND status = 'registered'`,
        [eventId]
      );

      const registeredCount = countRow?.registered || 0;
      const isFull = eventRow.max_participants ? registeredCount >= eventRow.max_participants : false;
      const status = isFull ? 'waitlisted' : 'registered';

      if (historicalRows.length > 0) {
        const historicalParticipant = historicalRows[0];
        await conn.execute(
          `UPDATE event_participants SET status = ?, registration_date = NOW(), cancellation_date = NULL, attendance_marked_at = NULL, attendance_marked_by = NULL WHERE participant_id = ?`,
          [status, historicalParticipant.participant_id]
        );

        await conn.commit();
        return { status, message: isFull ? 'You were added back to the waitlist' : 'Welcome back! Your registration has been restored' };
      }

      await conn.execute(
        `INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, ?)`,
        [eventId, userId, status]
      );

      await conn.commit();
      return { status, message: isFull ? 'Added to waitlist' : 'Successfully registered' };
    } catch (err) {
      try {
        await conn.rollback();
      } catch (e) {
        console.warn('Failed to rollback transaction in registerParticipant', e.message || e);
      }
      throw err;
    } finally {
      conn.release();
    }
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
      // No active registration found — return for graceful handling by callers
      return { promotedParticipant: null, hadParticipation: false, message: 'No active participation found' };
    }

    // Check if someone from waitlist can be promoted
    const promotedParticipant = await this.promoteFromWaitlist(event.event_id);

    return { promotedParticipant, hadParticipation: true };
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
    return rows.map((event) => {
      event.tags = parseTags(event.tags);
      try {
        event.start_datetime_local = convertUtcIsoToPlus8Input(event.start_datetime);
        event.end_datetime_local = convertUtcIsoToPlus8Input(event.end_datetime);
      } catch (e) {}
      return event;
    });
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

  /**
   * Mark a participant as present (check-in).
   * Ensures event is started, participant is registered, uses row-level locking.
   */
  async checkInParticipant(eventUid, participantId, markedByUserId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Resolve event
      const [[event]] = await conn.execute(
        `SELECT event_id, status, start_datetime, attendance_checkin_window_mins, attendance_grace_mins FROM events WHERE uid = ? FOR UPDATE`,
        [eventUid]
      );
      if (!event) throw new Error('Event not found');

      // --- FIX: ENFORCE EVENT STATUS ---
      // Prevent check-ins for events that are not actionable (only 'published' or 'ongoing' are allowed)
      const validStatuses = ['published', 'ongoing'];
      if (!validStatuses.includes((event.status || '').toLowerCase())) {
        throw new Error(`Cannot check in: Event is ${event.status}`);
      }
      // ---------------------------------

        // Determine check-in availability based on configured window
        const startTs = event.start_datetime ? new Date(event.start_datetime) : null;
        const windowMins = Number(event.attendance_checkin_window_mins || 15);
        if (!startTs) {
          throw new Error('Event start time is not set');
        }

        const now = new Date();
        const windowStart = new Date(startTs.getTime() - windowMins * 60000);
        if (now < windowStart) {
          throw new Error('Event check-in is not yet available');
        }

      // Lock participant row
      const [[participant]] = await conn.execute(
        `SELECT participant_id, user_id, status, attendance_status FROM event_participants WHERE participant_id = ? AND event_id = ? FOR UPDATE`,
        [participantId, event.event_id]
      );
      if (!participant) throw new Error('Participant not found');

      if (participant.status !== 'registered') {
        throw new Error('Only registered participants may be checked in');
      }

      const previous = participant.attendance_status || 'unknown';

      if (previous === 'present') {
        // idempotent no-op
        await conn.commit();
        return { participant_id: participantId, attendance_status: 'present', noOp: true };
      }

      // Determine attendance status based on check-in time relative to start + grace
      // Business rule: users are considered "present" if they check in at or before
      // the start time OR within the configured grace period after start.
      // They are only marked 'late' if they check in after start + grace minutes.
      const graceMins = Number(event.attendance_grace_mins || 10);
      const graceMs = graceMins * 60000;
      let newStatus = 'late';
      const startPlusGrace = startTs.getTime() + graceMs;
      if (now.getTime() <= startPlusGrace) {
        // On time (including early and within grace window)
        newStatus = 'present';
      } else {
        // After grace window -> late
        newStatus = 'late';
      }

      // Ensure we never pass `undefined` into SQL driver params — convert to `null` where appropriate
      const safeMarkedBy = typeof markedByUserId === 'undefined' ? null : markedByUserId;
      if (safeMarkedBy === null) console.warn('checkInParticipant: markedByUserId is null/undefined - recording anonymous check-in');
      await conn.execute(
        `UPDATE event_participants SET attendance_status = ?, attendance_marked_at = NOW(), attendance_marked_by = ?, attendance_updated_at = NOW() WHERE participant_id = ?`,
        [newStatus, safeMarkedBy, participantId]
      );

      const safeUserId = typeof participant.user_id === 'undefined' ? null : participant.user_id;
      if (safeUserId === null) console.warn('checkInParticipant: participant.user_id is null/undefined - anonymous participant');
      await conn.execute(
        `INSERT INTO event_attendance_audit (event_id, participant_id, user_id, marked_by, action, previous_status, new_status, performed_at) VALUES (?, ?, ?, ?, 'check_in', ?, ?, NOW())`,
        [event.event_id, participantId, safeUserId, safeMarkedBy, previous, newStatus]
      );

      await conn.commit();

      const [rows] = await pool.execute(`SELECT * FROM event_participants WHERE participant_id = ?`, [participantId]);
      return rows[0];
    } catch (err) {
      try { await conn.rollback(); } catch (e) {}
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Patch attendance (admin/staff correction)
   */
  async patchAttendance(eventUid, participantId, newStatus, performedByUserId, reason = null) {
    if (!['present','absent','late','unknown'].includes(newStatus)) {
      throw new Error('Invalid attendance status');
    }

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[event]] = await conn.execute(
        `SELECT event_id, status FROM events WHERE uid = ? FOR UPDATE`,
        [eventUid]
      );
      if (!event) throw new Error('Event not found');

      const [[participant]] = await conn.execute(
        `SELECT participant_id, user_id, attendance_status FROM event_participants WHERE participant_id = ? AND event_id = ? FOR UPDATE`,
        [participantId, event.event_id]
      );
      if (!participant) throw new Error('Participant not found');

      const previous = participant.attendance_status || 'unknown';
      if (previous === newStatus) {
        // Still record an audit entry for traceability
        await conn.execute(
          `INSERT INTO event_attendance_audit (event_id, participant_id, user_id, marked_by, action, previous_status, new_status, reason, performed_at) VALUES (?, ?, ?, ?, 'correction', ?, ?, ?, NOW())`,
          [event.event_id, participantId, participant.user_id, performedByUserId, previous, newStatus, reason]
        );
        await conn.commit();
        return { participant_id: participantId, attendance_status: newStatus, noOp: true };
      }

      const notePrefix = reason ? `Correction: ${reason}` : null;

      await conn.execute(
        `UPDATE event_participants SET attendance_status = ?, attendance_marked_at = NOW(), attendance_marked_by = ?, attendance_notes = CONCAT(COALESCE(attendance_notes, ''), ?), attendance_updated_at = NOW() WHERE participant_id = ?`,
        [newStatus, performedByUserId, notePrefix || '', participantId]
      );

      await conn.execute(
        `INSERT INTO event_attendance_audit (event_id, participant_id, user_id, marked_by, action, previous_status, new_status, reason, performed_at) VALUES (?, ?, ?, ?, 'correction', ?, ?, ?, NOW())`,
        [event.event_id, participantId, participant.user_id, performedByUserId, previous, newStatus, reason]
      );

      await conn.commit();

      const [rows] = await pool.execute(`SELECT * FROM event_participants WHERE participant_id = ?`, [participantId]);
      return rows[0];
    } catch (err) {
      try { await conn.rollback(); } catch (e) {}
      throw err;
    } finally {
      conn.release();
    }
  }

  async getAttendanceAudit(eventUid, participantId = null, limit = 100, before = null) {
    const event = await this.getEventByUid(eventUid);
    if (!event) throw new Error('Event not found');

    let query = `SELECT * FROM event_attendance_audit WHERE event_id = ?`;
    const params = [event.event_id];
    if (participantId) {
      query += ` AND participant_id = ?`;
      params.push(participantId);
    }
    if (before) {
      query += ` AND performed_at < ?`;
      params.push(before);
    }
    query += ` ORDER BY performed_at DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await getPool().execute(query, params);
    return rows;
  }

  /**
   * Auto-flag absences for event (idempotent). Processes in batches.
   */
  async autoFlagAbsences(eventUid, batchSize = 500) {
    const event = await this.getEventByUid(eventUid);
    if (!event) throw new Error('Event not found');

    const pool = getPool();
    let scanned = 0;
    let flagged = 0;

    while (true) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [rows] = await conn.execute(
          `SELECT participant_id, user_id, attendance_status FROM event_participants WHERE event_id = ? AND status = 'registered' AND (attendance_status IS NULL OR attendance_status = 'unknown') LIMIT ${batchSize} FOR UPDATE`,
          [event.event_id]
        );

        if (!rows.length) {
          await conn.commit();
          conn.release();
          break;
        }

        scanned += rows.length;

        for (const r of rows) {
          await conn.execute(
            `UPDATE event_participants SET attendance_status = 'absent', attendance_marked_at = NOW(), attendance_marked_by = NULL, attendance_updated_at = NOW() WHERE participant_id = ?`,
            [r.participant_id]
          );

          // Use INSERT IGNORE to avoid creating duplicate audit rows when a dedupe_key is already present.
          const [insertRes] = await conn.execute(
            `INSERT IGNORE INTO event_attendance_audit (event_id, participant_id, user_id, marked_by, action, previous_status, new_status, reason, dedupe_key, performed_at) VALUES (?, ?, ?, NULL, 'mark_absent', ?, 'absent', 'auto-absent', CONCAT('auto-absent:', ?), NOW())`,
            [event.event_id, r.participant_id, r.user_id, r.attendance_status || 'unknown', r.participant_id]
          );

          // Only count as flagged when the INSERT actually inserted a new row (affectedRows > 0)
          if (insertRes && insertRes.affectedRows) flagged += 1;
        }

        await conn.commit();
        conn.release();
      } catch (err) {
        try { await conn.rollback(); } catch (e) {}
        conn.release();
        throw err;
      }
    }

    console.log(`[autoFlagAbsences] Event ${eventUid} scanned=${scanned} flagged=${flagged}`);
    return { scanned, flagged };
  }

  /**
   * Finalize attendance after event completion: convert registered -> attended for those
   * who were checked-in by staff (attendance_marked_by IS NOT NULL and attendance_status in present/late).
   * Idempotent.
   */
  async finalizeAttendedParticipants(eventUid) {
    const event = await this.getEventByUid(eventUid);
    if (!event) throw new Error('Event not found');

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        `SELECT participant_id, user_id, attendance_status, attendance_marked_by FROM event_participants WHERE event_id = ? AND status = 'registered' AND attendance_status IN ('present','late') AND attendance_marked_by IS NOT NULL FOR UPDATE`,
        [event.event_id]
      );

      if (!rows.length) {
        await conn.commit();
        conn.release();
        return 0;
      }

      for (const r of rows) {
        await conn.execute(
          `UPDATE event_participants SET status = 'attended', attendance_updated_at = NOW() WHERE participant_id = ?`,
          [r.participant_id]
        );

        await conn.execute(
          `INSERT INTO event_attendance_audit (event_id, participant_id, user_id, marked_by, action, previous_status, new_status, performed_at) VALUES (?, ?, ?, ?, 'finalize_attended', ?, 'attended', NOW())`,
          [event.event_id, r.participant_id, r.user_id, r.attendance_marked_by, r.attendance_status || 'unknown']
        );
      }

      await conn.commit();
      conn.release();
      return rows.length;
    } catch (err) {
      try { await conn.rollback(); } catch (e) {}
      conn.release();
      throw err;
    }
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

  async getParticipantStatus(eventUid, userId) {
    const event = await this.getEventByUid(eventUid);
    if (!event) return null;

    const [rows] = await getPool().execute(
      `SELECT status FROM event_participants 
       WHERE event_id = ? AND user_id = ? AND status IN ('registered', 'waitlisted')
       LIMIT 1`,
      [event.event_id, userId]
    );

    return rows.length > 0 ? rows[0].status : null;
  }

  async getWaitlistPosition(eventUid, userId) {
    const event = await this.getEventByUid(eventUid);
    if (!event) return null;

    const [rows] = await getPool().execute(
      `SELECT COUNT(*) + 1 as position FROM event_participants 
       WHERE event_id = ? AND status = 'waitlisted' AND created_at < (
         SELECT created_at FROM event_participants 
         WHERE event_id = ? AND user_id = ? AND status = 'waitlisted'
       )`,
      [event.event_id, event.event_id, userId]
    );

    return rows.length > 0 ? rows[0].position : null;
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

  async cancelEvent(eventUid, userId, { reason = null } = {}) {
    await getPool().execute(
      `UPDATE events 
       SET status = 'cancelled'
       WHERE uid = ?`,
      [eventUid]
    );

    // Optionally, record a cancellation update in event_updates for auditing
    // We try not to fail the cancellation if this insert fails
    try {
      await getPool().execute(
        `INSERT INTO event_updates (event_id, posted_by_user_id, update_type, title, message)
         VALUES ((SELECT event_id FROM events WHERE uid = ?), ?, 'cancellation', ?, ?)`,
        [eventUid, userId, 'Event cancelled', reason || 'Cancelled by manager']
      );
    } catch (err) {
      // silent failure — don't let audit insert break cancellation
      console.warn('Failed to insert event update for cancellation', err.message);
    }

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

  async markEventAsOngoing(eventUid) {
    // Use a FOR UPDATE select to avoid race conditions and to ensure we only
    // transition from 'published' -> 'ongoing'. This prevents accidental
    // overwrites from other concurrent updates that could set an incorrect
    // status (e.g., 'draft').
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        `SELECT status FROM events WHERE uid = ? FOR UPDATE`,
        [eventUid]
      );
      if (!rows || rows.length === 0) {
        await conn.rollback();
        return null;
      }
      const current = rows[0].status;
      if ((current || '').toLowerCase() !== 'published') {
        // Nothing to do; return the current event
        await conn.rollback();
        return this.getEventByUid(eventUid);
      }

      await conn.execute(`UPDATE events SET status = 'ongoing' WHERE uid = ?`, [eventUid]);
      await conn.commit();
      return this.getEventByUid(eventUid);
    } catch (e) {
      try { await conn.rollback(); } catch (er) {}
      throw e;
    } finally {
      try { conn.release(); } catch (er) {}
    }
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

  async getAttendanceReport(eventUid) {
    const event = await this.getEventByUid(eventUid);
    if (!event) throw new Error('Event not found');

    const [counts] = await getPool().execute(
      `SELECT 
        SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as registered_count,
        SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN attendance_status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN attendance_status IS NULL OR attendance_status = 'unknown' THEN 1 ELSE 0 END) as unknown_count
       FROM event_participants
       WHERE event_id = ?`,
      [event.event_id]
    );

    const registered = counts[0].registered_count || 0;
    const present = counts[0].present_count || 0;
    const absent = counts[0].absent_count || 0;
    const late = counts[0].late_count || 0;
    const unknown = counts[0].unknown_count || 0;

    const attendancePct = registered === 0 ? 0 : Math.round((present / registered) * 10000) / 100; // percentage with 2 decimals

    const [absentees] = await getPool().execute(
      `SELECT ep.participant_id, ep.user_id, u.uid as user_uid, u.name, u.email, ep.attendance_marked_at
       FROM event_participants ep
       JOIN users u ON ep.user_id = u.user_id
       WHERE ep.event_id = ? AND ep.attendance_status = 'absent'`,
      [event.event_id]
    );

    return {
      event: { event_id: event.event_id, uid: event.uid, title: event.title, status: event.status },
      counts: { registered, present, absent, late, unknown, attendancePct },
      absentees,
    };
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
// Export helpers for controllers/tests
module.exports.sanitizeDateFilter = sanitizeDateFilter;
module.exports.buildEventFilterWhereClause = buildEventFilterWhereClause;

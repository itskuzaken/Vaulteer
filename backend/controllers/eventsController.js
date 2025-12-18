const eventRepository = require("../repositories/eventRepository");
const gamificationService = require("../services/gamificationService");
const { GAMIFICATION_ACTIONS } = require("../config/gamificationRules");
const { logHelpers } = require("../services/activityLogService");
const { getPool } = require("../db/pool");
const notificationService = require("../services/notificationService");
const attendanceService = require('../services/attendanceService');
const reportRepository = require('../repositories/reportRepository');
const { reportQueue } = require('../jobs/reportGenerationQueue');
const reportWorker = require('../workers/reportWorker');
const s3Service = require('../services/s3Service');

class EventsController {
  // ============================================
  // ADMIN/STAFF EVENT MANAGEMENT
  // ============================================

  async createEvent(req, res) {
    try {
      const eventData = req.body;
      const createdByUserId = req.currentUserId;

      const { parseToUtcIso, isPastInPlus8 } = require('../utils/datetime');
      // Validate dates (treat incoming datetimes as +08 if no timezone specified)
      const startUtcIso = parseToUtcIso(eventData.start_datetime);
      const endUtcIso = parseToUtcIso(eventData.end_datetime);
      const startDate = new Date(startUtcIso);
      const endDate = new Date(endUtcIso);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
      // Ensure start date is not in the past (relative to now in +08)
      if (isPastInPlus8(eventData.start_datetime)) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be in the past",
        });
      }
      // Normalize datetimes as UTC ISO strings before store
      eventData.start_datetime = startUtcIso;
      eventData.end_datetime = endUtcIso;

      // Validate event_type exists (avoid FK errors)
      if (eventData.event_type) {
        const systemRepo = require('../repositories/systemSettingsRepository');
        const type = await systemRepo.getEventTypeByCode(eventData.event_type);
        if (!type) {
          return res.status(400).json({ success: false, message: 'Invalid event_type' });
        }
      }

      const event = await eventRepository.createEvent(eventData, createdByUserId);

      // Log activity via centralized service
      await logHelpers.logEventCreated({
        eventId: event.event_id,
        eventUid: event.uid,
        eventTitle: event.title,
        performedBy: req.authenticatedUser,
        metadata: {
          event_type: event.event_type,
          location_type: event.location_type,
          start_datetime: event.start_datetime,
          end_datetime: event.end_datetime,
        },
      });

      // Send notifications if event is created as published
      if (event.status === "published") {
        try {
          await notificationService.notifyEventPublished(event);
          console.log(
            `✅ Notifications sent for newly published event: ${event.title}`
          );
        } catch (notifError) {
          console.error(
            "Error sending event created notifications:",
            notifError
          );
          // Don't fail the request if notifications fail
        }
      }

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: event,
      });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create event",
        error: error.message,
      });
    }
  }

  async updateEvent(req, res) {
    try {
      const { uid } = req.params;
      const updates = req.body;
      const userId = req.currentUserId;

      // Check if event exists and get creator info
      const existingEvent = await eventRepository.getEventByUid(uid);
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Only event creator can edit (use loose equality to handle type coercion)
      if (existingEvent.status === 'completed') {
        return res.status(403).json({
          success: false,
          message: 'Cannot edit a completed event',
        });
      }

      const role = (req.authenticatedUser?.role || '').toLowerCase();
      const isAdminOrStaff = role === 'admin' || role === 'staff';
      if (existingEvent.created_by_user_id != userId && !isAdminOrStaff) {
        console.log('[DEBUG] Creator check failed:', {
          existingEventCreatedBy: existingEvent.created_by_user_id,
          existingEventCreatedByType: typeof existingEvent.created_by_user_id,
          userId: userId,
          userIdType: typeof userId,
        });
        return res.status(403).json({
          success: false,
          message: "Only the event creator or admin/staff can edit this event",
        });
      }

      // Validate dates if provided
      const { parseToUtcIso, isPastInPlus8 } = require('../utils/datetime');
      if (updates.start_datetime && updates.end_datetime) {
        const startUtcIso = parseToUtcIso(updates.start_datetime);
        const endUtcIso = parseToUtcIso(updates.end_datetime);
        const startDate = new Date(startUtcIso);
        const endDate = new Date(endUtcIso);

        if (endDate <= startDate) {
          return res.status(400).json({
            success: false,
            message: "End date must be after start date",
          });
        }
        if (isPastInPlus8(updates.start_datetime)) {
          return res.status(400).json({
            success: false,
            message: "Start date cannot be in the past",
          });
        }
        // Normalize
        updates.start_datetime = startUtcIso;
        updates.end_datetime = endUtcIso;
      }

      const event = await eventRepository.updateEvent(uid, updates);

      // If the event's capacity was increased, promote from waitlist if any
      try {
        if (updates.max_participants && Number(updates.max_participants) > Number(existingEvent.max_participants || 0)) {
          // Try to promote until max is reached
          while (true) {
            const promoted = await eventRepository.promoteFromWaitlist(event.event_id);
            if (!promoted) break;
            // Notify promoted user
            try {
              await notificationService.notifyWaitlistPromotion(event, promoted.user_id);
            } catch (e) {
              console.error('Failed to notify promoted user', promoted.user_id, e.message || e);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to auto-promote waitlist after capacity increase', err.message || err);
      }

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Log activity via centralized service
      await logHelpers.logEventUpdated({
        eventId: event.event_id,
        eventUid: event.uid,
        eventTitle: event.title,
        performedBy: req.authenticatedUser,
        changes: updates,
        metadata: { updatedFields: Object.keys(updates) },
      });

      res.json({
        success: true,
        message: "Event updated successfully",
        data: event,
      });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update event",
        error: error.message,
      });
    }
  }

  async deleteEvent(req, res) {
    try {
      const { uid } = req.params;
      const userId = req.currentUserId;

      const event = await eventRepository.getEventByUid(uid);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      const deleted = await eventRepository.deleteEvent(uid);

      if (deleted) {
        // Log activity via centralized service
        await logHelpers.logEventDeleted({
          eventId: event.event_id,
          eventUid: event.uid,
          eventTitle: event.title,
          performedBy: req.authenticatedUser,
        });

        res.json({
          success: true,
          message: "Event deleted successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to delete event",
        });
      }
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete event",
        error: error.message,
      });
    }
  }

  async publishEvent(req, res) {
    try {
      const { uid } = req.params;
      const userId = req.currentUserId;

      // If the event is already published, do not re-send notifications.
      const existing = await eventRepository.getEventByUid(uid);
      if (existing && existing.status === 'published') {
        // Return existing event without sending duplicate notifications
        return res.json({
          success: true,
          message: "Event already published",
          data: existing,
        });
      }

      const event = await eventRepository.publishEvent(uid, userId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Log event published
      await logHelpers.logEventPublished({
        eventId: event.event_id,
        eventUid: event.uid,
        eventTitle: event.title,
        performedBy: req.authenticatedUser,
      });

      // Send notifications to all active users (in-app + push)
      try {
        await notificationService.notifyEventPublished(event);
      } catch (notifError) {
        console.error("Error sending event published notifications:", notifError);
        // Don't fail the request if notifications fail
      }

      res.json({
        success: true,
        message: "Event published successfully",
        data: event,
      });
    } catch (error) {
      console.error("Publish event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to publish event",
        error: error.message,
      });
    }
  }

  async archiveEvent(req, res) {
    try {
      const { uid } = req.params;
      const userId = req.currentUserId;

      const existingEvent = await eventRepository.getEventByUid(uid);
      if (!existingEvent) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      if (existingEvent.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Cannot archive a completed event' });
      }

      const event = await eventRepository.archiveEvent(uid, userId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Log event archived
      await logHelpers.logEventArchived({
        eventId: event.event_id,
        eventUid: event.uid,
        eventTitle: event.title,
        performedBy: req.authenticatedUser,
        reason: "manual",
      });

      res.json({
        success: true,
        message: "Event archived successfully",
        data: event,
      });
    } catch (error) {
      console.error("Archive event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to archive event",
        error: error.message,
      });
    }
  }

  async cancelEvent(req, res) {
    try {
      const { uid } = req.params;
      const userId = req.currentUserId;

      const event = await eventRepository.getEventByUid(uid);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }
      if (event.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Cannot cancel a completed event' });
      }

      const cancelledEvent = await eventRepository.cancelEvent(uid, userId);

      if (!cancelledEvent) {
        return res.status(500).json({
          success: false,
          message: "Failed to cancel event",
        });
      }

      // Log event cancelled
      await logHelpers.logEventCancelled({
        eventId: cancelledEvent.event_id,
        eventUid: cancelledEvent.uid,
        eventTitle: cancelledEvent.title,
        performedBy: req.authenticatedUser,
        metadata: { reason: req.body?.reason || null },
      });

      // Notify participants that the event was cancelled (in-app + push + email)
      try {
        const participants = await eventRepository.getEventParticipants(uid);
        const participantIds = (participants || []).map((p) => p.user_id);
        if (participantIds.length > 0) {
          await notificationService.notifyEventCancelled(cancelledEvent, participantIds);
        }
      } catch (notifErr) {
        console.error("Failed to notify participants about cancellation:", notifErr);
      }

      res.json({
        success: true,
        message: "Event cancelled successfully",
        data: cancelledEvent,
      });
    } catch (error) {
      console.error("Cancel event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel event",
        error: error.message,
      });
    }
  }

  async postponeEvent(req, res) {
    try {
      const { uid } = req.params;
      const { postponed_until, reason } = req.body || {};
      const userId = req.currentUserId;

      const existingEvent = await eventRepository.getEventByUid(uid);
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }
      if (existingEvent.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Cannot postpone a completed event' });
      }

      let postponedDate = null;
      if (postponed_until) {
        const parsedDate = new Date(postponed_until);
        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid postponement date",
          });
        }
        postponedDate = parsedDate;
      }

      const updatedEvent = await eventRepository.postponeEvent(uid, userId, {
        postponedUntil: postponedDate,
        reason,
      });

      await logHelpers.logEventPostponed({
        eventId: updatedEvent.event_id,
        eventUid: updatedEvent.uid,
        eventTitle: updatedEvent.title,
        performedBy: req.authenticatedUser,
        previousStatus: existingEvent.status,
        postponedUntil: postponedDate ? postponedDate.toISOString() : null,
        reason,
      });

      res.json({
        success: true,
        message: "Event postponed successfully",
        data: updatedEvent,
      });
    } catch (error) {
      console.error("Postpone event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to postpone event",
        error: error.message,
      });
    }
  }

  async getAllEvents(req, res) {
    try {
      const filters = {
        status: req.query.status,
        event_type: req.query.event_type,
        location_type: req.query.location_type,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        search: req.query.search,
        limit: req.query.limit,
        offset: req.query.offset,
      };

      const { events, total, pagination } = await eventRepository.getAllEvents(
        filters
      );

      // Add participation status for each event
      const userId = req.currentUserId;
      const eventsWithParticipation = await Promise.all(
        events.map(async (event) => {
          try {
            const participationStatus = await eventRepository.getParticipantStatus(
              event.uid,
              userId
            );
            const isRegistered = participationStatus === "registered" || participationStatus === "waitlisted";
            return {
              ...event,
              is_registered: isRegistered,
              participation_status: participationStatus,
            };
          } catch (error) {
            // If there's an error getting participation status, return event without it
            console.warn(`Failed to get participation status for event ${event.uid}:`, error.message);
            return {
              ...event,
              is_registered: false,
              participation_status: null,
            };
          }
        })
      );

      const limit = pagination?.limit ?? events.length ?? 0;
      const offset = pagination?.offset ?? 0;
      const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1;

      res.json({
        success: true,
        data: eventsWithParticipation,
        total,
        limit,
        offset,
        page,
      });
    } catch (error) {
      console.error("Get all events error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch events",
        error: error.message,
      });
    }
  }

  async getEventDetails(req, res) {
    try {
      const { uid } = req.params;
      const event = await eventRepository.getEventByUid(uid);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Get current user's participation status
      const userId = req.currentUserId;
      const participationStatus = await eventRepository.getParticipantStatus(
        uid,
        userId
      );
      const isRegistered = participationStatus === "registered" || participationStatus === "waitlisted";

      // Get waitlist position if user is waitlisted
      let waitlistPosition = null;
      if (participationStatus === "waitlisted") {
        try {
          waitlistPosition = await eventRepository.getWaitlistPosition(uid, userId);
        } catch (error) {
          console.warn("Failed to get waitlist position:", error.message);
        }
      }

      res.json({
        success: true,
        data: {
          ...event,
          is_registered: isRegistered,
          participation_status: participationStatus,
          waitlist_position: waitlistPosition,
        },
      });
    } catch (error) {
      console.error("Get event details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch event details",
        error: error.message,
      });
    }
  }

  async getUpcomingEvents(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const events = await eventRepository.getUpcomingEvents(limit);

      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error) {
      console.error("Get upcoming events error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch upcoming events",
        error: error.message,
      });
    }
  }

  // ============================================
  // VOLUNTEER PARTICIPATION
  // ============================================

  async joinEvent(req, res) {
    try {
      const { uid } = req.params;
      const userId = req.currentUserId;

      const event = await eventRepository.getEventByUid(uid);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Check if event is published
      if (event.status !== "published") {
        return res.status(400).json({
          success: false,
          message: "This event is not open for registration",
        });
      }

      // Check registration deadline
      if (event.registration_deadline) {
        const deadline = new Date(event.registration_deadline);
        if (new Date() > deadline) {
          return res.status(400).json({
            success: false,
            message: "Registration deadline has passed",
          });
        }
      }

      const result = await eventRepository.registerParticipant(uid, userId);

      // Log activity via centralized service
      await logHelpers.logEventRegistration({
        eventId: event.event_id,
        eventUid: event.uid,
        eventTitle: event.title,
        userId,
        userName: req.authenticatedUser.name,
        registrationStatus: result.status,
        metadata: { role: req.authenticatedUser.role },
      });

      // Award gamification points for event registration
      if (result.status === 'registered') {
        try {
          await gamificationService.awardAction({
            userId,
            action: GAMIFICATION_ACTIONS.EVENT_REGISTER,
            eventId: event.event_id,
            eventUid: event.uid,
            metadata: {
              eventTitle: event.title,
              userName: req.authenticatedUser.name,
              userRole: req.authenticatedUser.role,
            },
            performedBy: req.authenticatedUser,
          });
        } catch (gamificationError) {
          console.warn("Failed to award gamification points for event registration:", gamificationError);
          // Don't fail the registration if gamification fails
        }
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          status: result.status,
        },
      });
    } catch (error) {
      console.error("Join event error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to join event",
      });
    }
  }

  async leaveEvent(req, res) {
    try {
      const { uid } = req.params;
      const userId = req.currentUserId;

      const event = await eventRepository.getEventByUid(uid);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      const cancelResult = await eventRepository.cancelParticipation(
        uid,
        userId
      );

      // If there was no active participation to cancel, return success without logging or gamification
      if (!cancelResult?.hadParticipation) {
        return res.json({
          success: true,
          message: cancelResult?.message || "No active participation found",
        });
      }

      // Log activity via centralized service
      await logHelpers.logEventCancellation({
        eventId: event.event_id,
        eventUid: event.uid,
        eventTitle: event.title,
        userId,
        userName: req.authenticatedUser.name,
        metadata: { role: req.authenticatedUser.role },
      });

      const gamificationResult = await gamificationService.awardAction({
        userId,
        action: GAMIFICATION_ACTIONS.EVENT_CANCEL,
        eventId: event.event_id,
        eventUid: event.uid,
        metadata: { eventTitle: event.title },
        performedBy: req.authenticatedUser,
      });

      if (cancelResult?.promotedParticipant?.user_id) {
        await gamificationService.awardAction({
          userId: cancelResult.promotedParticipant.user_id,
          action: GAMIFICATION_ACTIONS.WAITLIST_PROMOTION,
          eventId: event.event_id,
          eventUid: event.uid,
          metadata: {
            eventTitle: event.title,
            promotedBy: userId,
          },
          dedupeSuffix: `promotion-${cancelResult.promotedParticipant.user_id}`,
        });
        try {
          await notificationService.notifyWaitlistPromotion(event, cancelResult.promotedParticipant.user_id);
        } catch (e) {
          console.warn('Failed to notify waitlist promotion for user', cancelResult.promotedParticipant.user_id, e.message || e);
        }
      }

      res.json({
        success: true,
        message: "Successfully left the event",
        gamification: gamificationResult,
      });
    } catch (error) {
      console.error("Leave event error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to leave event",
      });
    }
  }

  async getMyEvents(req, res) {
    try {
      const userId = req.currentUserId;
      const status = req.query.status;

      const events = await eventRepository.getParticipantEvents(userId, status);

      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error) {
      console.error("Get my events error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch your events",
        error: error.message,
      });
    }
  }

  // ============================================
  // PARTICIPANT MANAGEMENT (ADMIN ONLY)
  // ============================================

  async getEventParticipants(req, res) {
    try {
      const { uid } = req.params;
      const status = req.query.status;
      const role = (req.authenticatedUser?.role || "").toLowerCase();
      const currentUserId = req.currentUserId;

      const participants = await eventRepository.getEventParticipants(
        uid,
        status
      );

      const isManager = role === "admin" || role === "staff";

      if (!isManager) {
        const isRegistered = participants.some(
          (participant) => participant.user_id === currentUserId
        );

        if (!isRegistered) {
          return res.status(403).json({
            success: false,
            message: "Only registered participants can view the attendee list",
          });
        }

        const limitedView = participants.map((participant) => ({
          user_id: participant.user_id,
          user_uid: participant.user_uid,
          name: participant.name,
          status: participant.status,
          registration_date: participant.registration_date,
        }));

        return res.json({
          success: true,
          data: limitedView,
          count: limitedView.length,
          visibility: "limited",
        });
      }

      res.json({
        success: true,
        data: participants,
        count: participants.length,
        visibility: "full",
      });
    } catch (error) {
      console.error("Get event participants error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch participants",
        error: error.message,
      });
    }
  }

  async updateParticipantStatus(req, res) {
    try {
      const { uid, userId } = req.params;
      const { status } = req.body;
      const markedBy = req.currentUserId;
      const event = await eventRepository.getEventByUid(uid);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Disallow editing completed events
      if (event.status === 'completed') {
        return res.status(403).json({
          success: false,
          message: 'Cannot edit a completed event',
        });
      }

      // Allow event creator and admin/staff to edit participant status
      const role = (req.authenticatedUser?.role || '').toLowerCase();
      const isAdminOrStaff = role === 'admin' || role === 'staff';
      if (!isAdminOrStaff && event.created_by_user_id != req.currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify participant status',
        });
      }

      const validStatuses = ["attended", "cancelled", "no_show"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      await eventRepository.updateParticipantStatus(
        uid,
        parseInt(userId),
        status,
        markedBy
      );

      // Log participant status change
      await logHelpers.logEventParticipantStatusChange({
        eventId: event.event_id,
        eventUid: event.uid,
        eventTitle: event.title,
        userId: parseInt(userId),
        userName: "Participant",
        performedBy: req.authenticatedUser,
        previousStatus: "registered",
        newStatus: status,
      });

      let gamificationResult = null;
      if (status === "attended") {
        // Get participant info to check if they are a volunteer
        const [participantRows] = await getPool().query(
          `SELECT u.role_id, r.role FROM users u
           JOIN roles r ON u.role_id = r.role_id
           WHERE u.user_id = ?`,
          [parseInt(userId, 10)]
        );

        const participantRole = participantRows[0]?.role?.toLowerCase();
        if (participantRole === "volunteer") {
          gamificationResult = await gamificationService.awardAction({
            userId: parseInt(userId, 10),
            action: GAMIFICATION_ACTIONS.EVENT_ATTEND,
            eventId: event.event_id,
            eventUid: event.uid,
            metadata: { eventTitle: event.title, eventType: event.event_type },
            performedBy: req.authenticatedUser,
            pointsOverride: Number(event.event_type_points) || null,
            dedupeSuffix: `attendance-${userId}`,
          });
        }
      }

      res.json({
        success: true,
        message: "Participant status updated successfully",
        gamification: gamificationResult,
      });
    } catch (error) {
      console.error("Update participant status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update participant status",
        error: error.message,
      });
    }
  }

  async markAttendance(req, res) {
    try {
      const { uid } = req.params;
      const { attendees } = req.body; // Array of user IDs
      const markedBy = req.currentUserId;
      const event = await eventRepository.getEventByUid(uid);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      if (!Array.isArray(attendees)) {
        return res.status(400).json({
          success: false,
          message: "Attendees must be an array",
        });
      }

      await Promise.all(
        attendees.map((userId) =>
          eventRepository.updateParticipantStatus(
            uid,
            userId,
            "attended",
            markedBy
          )
        )
      );

      // Get all participant roles to filter volunteers only
      const [participantRows] = await getPool().query(
        `SELECT u.user_id, r.role FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id IN (?)`,
        [attendees]
      );

      const volunteerIds = new Set(
        participantRows
          .filter((row) => row.role?.toLowerCase() === "volunteer")
          .map((row) => row.user_id)
      );

      const gamificationResults = await Promise.all(
        attendees.map((participantId) => {
          const targetId = parseInt(participantId, 10);
          if (Number.isNaN(targetId)) {
            return Promise.resolve(null);
          }

          return gamificationService.awardAction({
            userId: targetId,
            action: GAMIFICATION_ACTIONS.EVENT_ATTEND,
            eventId: event.event_id,
            eventUid: event.uid,
            metadata: { eventTitle: event.title, eventType: event.event_type },
            performedBy: req.authenticatedUser,
            pointsOverride: Number(event.event_type_points) || null,
            dedupeSuffix: `attendance-${targetId}`,
          }).catch((e) => {
            console.warn('Gamification failed during attendance', e.message || e);
            return null;
          });
        })
      );

      res.json({
        success: true,
        message: `Marked ${attendees.length} attendee(s) as present`,
        gamification: gamificationResults,
      });
    } catch (error) {
      console.error("Mark attendance error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark attendance",
        error: error.message,
      });
    }
  }

  // Get attendance list (staff/admin only)
  async getAttendance(req, res) {
    try {
      const { uid } = req.params;
      const event = await eventRepository.getEventByUid(uid);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const participants = await eventRepository.getEventParticipants(uid);

      // Compute attendance check-in availability: opens X minutes before start, not visible after start
      const now = new Date();
      const startTs = event.start_datetime ? new Date(event.start_datetime) : null;
      const windowMins = Number(event.attendance_checkin_window_mins || 15);
      let attendanceEnabled = false;
      if (startTs) {
        const windowStart = new Date(startTs.getTime() - windowMins * 60000);
        // visible only from windowStart up to but not including start
        attendanceEnabled = now >= windowStart && now < startTs && !['cancelled','postponed','completed'].includes((event.status||'').toLowerCase());
      }

      res.json({
        success: true,
        data: {
          attendance_enabled: attendanceEnabled,
          checkin_window_mins: windowMins,
          attendance_grace_mins: Number(event.attendance_grace_mins || 10),
          participants,
        }
      });
    } catch (error) {
      console.error('Get attendance error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
    }
  }

  // Check-in a participant (staff/admin)
  async checkInParticipant(req, res) {
    try {
      const { uid } = req.params;
      const { participantId } = req.body;
      const performedBy = req.authenticatedUser;

      if (!participantId) {
        return res.status(400).json({ success: false, message: 'participantId is required' });
      }

      const updated = await attendanceService.checkIn({ eventUid: uid, participantId, performedBy });

      // Gamification for volunteers
      try {
        const [[userRow]] = await getPool().query(
          `SELECT u.user_id, r.role FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?`,
          [updated.user_id]
        );
        const role = userRow?.role?.toLowerCase();
        if (role === 'volunteer') {
          await gamificationService.awardAction({
            userId: updated.user_id,
            action: GAMIFICATION_ACTIONS.EVENT_ATTEND,
            eventId: (await eventRepository.getEventByUid(uid)).event_id,
            eventUid: uid,
            metadata: {},
            performedBy: req.authenticatedUser,
            dedupeSuffix: `attendance-${updated.user_id}`,
          });
        }
      } catch (e) {
        // Log and continue
        console.warn('Gamification failed during check-in', e.message || e);
      }

      res.json({ success: true, message: 'Check-in recorded', data: updated });
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ success: false, message: 'Failed to check-in participant', error: error.message });
    }
  }

  // Patch attendance (admin/staff correction)
  async patchAttendance(req, res) {
    try {
      const { uid, participantId } = req.params;
      const { newStatus, reason } = req.body;
      const performedBy = req.authenticatedUser;

      if (!newStatus) {
        return res.status(400).json({ success: false, message: 'newStatus is required' });
      }

      const updated = await attendanceService.patchAttendance({ eventUid: uid, participantId: parseInt(participantId, 10), newStatus, performedBy, reason });
      res.json({ success: true, message: 'Attendance updated', data: updated });
    } catch (error) {
      console.error('Patch attendance error:', error);
      res.status(500).json({ success: false, message: 'Failed to update attendance', error: error.message });
    }
  }

  // Auto-flag absences for an event (admin only)
  async autoFlagAbsences(req, res) {
    try {
      const { uid } = req.params;
      await attendanceService.autoFlagAbsences(uid);
      res.json({ success: true, message: 'Auto-absencing job started' });
    } catch (error) {
      console.error('Auto-flag absences error:', error);
      res.status(500).json({ success: false, message: 'Failed to run auto-absencing', error: error.message });
    }
  }

  // Get attendance audit log
  async getAttendanceAudit(req, res) {
    try {
      const { uid } = req.params;
      const { participantId, limit = 100, before } = req.query;

      const entries = await eventRepository.getAttendanceAudit(uid, participantId ? parseInt(participantId, 10) : null, parseInt(limit, 10), before || null);
      res.json({ success: true, data: entries });
    } catch (error) {
      console.error('Get attendance audit error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch attendance audit', error: error.message });
    }
  }

  // Get attendance report (summary snapshot)
  async getAttendanceReport(req, res) {
    try {
      const { uid } = req.params;
      const report = await eventRepository.getAttendanceReport(uid);
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Get attendance report error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch attendance report', error: error.message });
    }
  }

  // List stored reports for an event
  async listEventReports(req, res) {
    try {
      const { uid } = req.params;
      const event = await eventRepository.getEventByUid(uid);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      const rows = await reportRepository.listReportsByEvent(event.event_id, 50, 0);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('List event reports error:', error);
      res.status(500).json({ success: false, message: 'Failed to list reports', error: error.message });
    }
  }

  // Trigger generation of a report (enqueue job)
  async generateEventReport(req, res) {
    try {
      const { uid } = req.params;
      const { format = 'csv', includePii = false } = req.body || {};
      const userId = req.currentUserId;

      const event = await eventRepository.getEventByUid(uid);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      const dedupeKey = `${event.event_id}:${event.end_datetime}`;
      const existing = await reportRepository.findByDedupeKey(dedupeKey);
      if (existing) {
        return res.json({ success: true, message: 'Report already exists', data: existing });
      }

      const jobData = { eventId: event.event_id, format, includePii: Boolean(includePii), dedupeKey, requestedBy: userId };

      // Enqueue job
      if (reportQueue && typeof reportQueue.add === 'function') {
        await reportQueue.add(jobData);
        // Also attempt to ensure worker runs in-process if no external queue
        if (!reportQueue.process && typeof reportWorker.generateAttendanceReport === 'function') {
          // best-effort generate immediately
          reportWorker.generateAttendanceReport(jobData).catch((e)=>console.error('Immediate report generation failed:', e));
        }
      } else if (typeof reportWorker.generateAttendanceReport === 'function') {
        // Fallback: run synchronously but don't block request excessively (fire and forget)
        reportWorker.generateAttendanceReport(jobData).catch((e)=>console.error('Report generation failed:', e));
      }

      res.json({ success: true, message: 'Report generation queued', data: { dedupeKey } });
    } catch (error) {
      console.error('Generate event report error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate report', error: error.message });
    }
  }

  // Download a generated report (returns presigned URL)
  async downloadEventReport(req, res) {
    try {
      const { uid, reportId } = req.params;
      const event = await eventRepository.getEventByUid(uid);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      const report = await reportRepository.findById(parseInt(reportId, 10));
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

      if (!report.s3_key) return res.status(404).json({ success: false, message: 'Report file not available' });

      const url = await s3Service.getPresignedDownloadUrl(report.s3_key);
      res.json({ success: true, data: { downloadUrl: url } });
    } catch (error) {
      console.error('Download event report error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch download URL', error: error.message });
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getEventStats(req, res) {
    try {
      const { uid } = req.params;

      const stats = await eventRepository.getEventStats(uid);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get event stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch event statistics",
        error: error.message,
      });
    }
  }

  async getCreatorStats(req, res) {
    try {
      const userId = req.currentUserId;

      const stats = await eventRepository.getCreatorEventStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get creator stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch creator statistics",
        error: error.message,
      });
    }
  }
}

module.exports = new EventsController();

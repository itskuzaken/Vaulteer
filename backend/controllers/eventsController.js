const eventRepository = require("../repositories/eventRepository");
const gamificationService = require("../services/gamificationService");
const { GAMIFICATION_ACTIONS } = require("../config/gamificationRules");
const { logHelpers } = require("../services/activityLogService");
const notificationService = require("../services/notificationService");

class EventsController {
  // ============================================
  // ADMIN/STAFF EVENT MANAGEMENT
  // ============================================

  async createEvent(req, res) {
    try {
      const eventData = req.body;
      const createdByUserId = req.currentUserId;

      // Validate dates
      const startDate = new Date(eventData.start_datetime);
      const endDate = new Date(eventData.end_datetime);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }

      const event = await eventRepository.createEvent(
        eventData,
        createdByUserId
      );

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
      if (existingEvent.created_by_user_id != userId) {
        console.log('[DEBUG] Creator check failed:', {
          existingEventCreatedBy: existingEvent.created_by_user_id,
          existingEventCreatedByType: typeof existingEvent.created_by_user_id,
          userId: userId,
          userIdType: typeof userId,
        });
        return res.status(403).json({
          success: false,
          message: "Only the event creator can edit this event",
        });
      }

      // Validate dates if provided
      if (updates.start_datetime && updates.end_datetime) {
        const startDate = new Date(updates.start_datetime);
        const endDate = new Date(updates.end_datetime);

        if (endDate <= startDate) {
          return res.status(400).json({
            success: false,
            message: "End date must be after start date",
          });
        }
      }

      const event = await eventRepository.updateEvent(uid, updates);

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

      const limit = pagination?.limit ?? events.length ?? 0;
      const offset = pagination?.offset ?? 0;
      const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1;

      res.json({
        success: true,
        data: events,
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

      res.json({
        success: true,
        data: {
          ...event,
          is_registered: isRegistered,
          participation_status: participationStatus,
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

      const validStatuses = [
        "registered",
        "waitlisted",
        "attended",
        "cancelled",
        "no_show",
      ];
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
        const [participantRows] = await eventRepository.getPool().query(
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
            metadata: { eventTitle: event.title },
            performedBy: req.authenticatedUser,
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
      const [participantRows] = await eventRepository.getPool().query(
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
          if (Number.isNaN(targetId) || !volunteerIds.has(targetId)) {
            return Promise.resolve(null);
          }

          return gamificationService.awardAction({
            userId: targetId,
            action: GAMIFICATION_ACTIONS.EVENT_ATTEND,
            eventId: event.event_id,
            eventUid: event.uid,
            metadata: { eventTitle: event.title },
            performedBy: req.authenticatedUser,
            dedupeSuffix: `attendance-${targetId}`,
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

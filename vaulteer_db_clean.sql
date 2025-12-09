
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `uid` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `role_id` int NOT NULL,
  `status` enum('active','inactive','deactivated') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `date_added` date DEFAULT (curdate()),
  `profile_picture` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'URL or path to user profile picture',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uid` (`uid`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role` enum('admin','staff','volunteer','applicant') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `roles` VALUES (1,'admin'),(2,'staff'),(3,'volunteer'),(4,'applicant');


DROP TABLE IF EXISTS `achievements`;
CREATE TABLE `achievements` (
  `achievement_id` int NOT NULL AUTO_INCREMENT,
  `badge_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `achievement_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `achievement_description` text COLLATE utf8mb4_unicode_ci,
  `achievement_icon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `achievement_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `achievement_points` int DEFAULT '0',
  `threshold_type` enum('POINTS','EVENT_REGISTER','EVENT_ATTEND','EVENT_HOST','STREAK_DAYS','CUSTOM') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `threshold_value` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`achievement_id`),
  UNIQUE KEY `uniq_badge_code` (`badge_code`),
  KEY `idx_category` (`achievement_category`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `achievements` VALUES (1,NULL,'Community Hero','Completed 50 hours of community service','trophy','community',100,NULL,NULL,1,0,'2025-10-27 15:46:25'),(2,NULL,'Helping Hand','Completed first volunteer activity','hand-heart','community',10,NULL,NULL,1,0,'2025-10-27 15:46:25'),(3,NULL,'Service Champion','Completed 100 hours of community service','star','community',200,NULL,NULL,1,0,'2025-10-27 15:46:25'),(4,NULL,'Dedicated Volunteer','Volunteered for 6 consecutive months','calendar','community',150,NULL,NULL,1,0,'2025-10-27 15:46:25'),(5,NULL,'Training Complete','Completed all required trainings','graduation-cap','training',50,NULL,NULL,1,0,'2025-10-27 15:46:25'),(6,NULL,'Quick Learner','Completed first training module','book','training',20,NULL,NULL,1,0,'2025-10-27 15:46:25'),(7,NULL,'Safety First','Completed safety and security training','shield','training',30,NULL,NULL,1,0,'2025-10-27 15:46:25'),(8,NULL,'Expert Volunteer','Completed advanced volunteer training','medal','training',80,NULL,NULL,1,0,'2025-10-27 15:46:25'),(9,NULL,'Event Organizer','Helped organize 5 community events','calendar-event','participation',75,NULL,NULL,1,0,'2025-10-27 15:46:25'),(10,NULL,'Team Player','Participated in 10 team activities','people','participation',60,NULL,NULL,1,0,'2025-10-27 15:46:25'),(11,NULL,'Perfect Attendance','Attended all scheduled activities for a month','checkmark-circle','participation',40,NULL,NULL,1,0,'2025-10-27 15:46:25'),(12,NULL,'Early Bird','Consistently arrived early for 20 activities','time','participation',35,NULL,NULL,1,0,'2025-10-27 15:46:25'),(13,NULL,'Rising Leader','Led your first volunteer team','trending-up','leadership',100,NULL,NULL,1,0,'2025-10-27 15:46:25'),(14,NULL,'Mentor','Mentored 5 new volunteers','person-add','leadership',120,NULL,NULL,1,0,'2025-10-27 15:46:25'),(15,NULL,'Team Leader','Successfully led 10 volunteer activities','ribbon','leadership',150,NULL,NULL,1,0,'2025-10-27 15:46:25'),(16,NULL,'Community Impact','Project created measurable community improvement','globe','leadership',200,NULL,NULL,1,0,'2025-10-27 15:46:25'),(17,NULL,'Innovator','Proposed and implemented a new initiative','bulb','recognition',90,NULL,NULL,1,0,'2025-10-27 15:46:25'),(18,NULL,'Ambassador','Recruited 10 new volunteers','megaphone','recognition',110,NULL,NULL,1,0,'2025-10-27 15:46:25'),(19,NULL,'Veteran Volunteer','Active volunteer for over 1 year','hourglass','recognition',180,NULL,NULL,1,0,'2025-10-27 15:46:25'),(20,NULL,'Outstanding Service','Received special recognition from organization leadership','award','recognition',250,NULL,NULL,1,0,'2025-10-27 15:46:25'),(21,NULL,'Community Hero','Completed 50 hours of community service','trophy','community',100,NULL,NULL,1,0,'2025-10-27 15:47:19'),(22,NULL,'Helping Hand','Completed first volunteer activity','hand-heart','community',10,NULL,NULL,1,0,'2025-10-27 15:47:19'),(23,NULL,'Service Champion','Completed 100 hours of community service','star','community',200,NULL,NULL,1,0,'2025-10-27 15:47:19'),(24,NULL,'Dedicated Volunteer','Volunteered for 6 consecutive months','calendar','community',150,NULL,NULL,1,0,'2025-10-27 15:47:19'),(25,NULL,'Training Complete','Completed all required trainings','graduation-cap','training',50,NULL,NULL,1,0,'2025-10-27 15:47:19'),(26,NULL,'Quick Learner','Completed first training module','book','training',20,NULL,NULL,1,0,'2025-10-27 15:47:19'),(27,NULL,'Safety First','Completed safety and security training','shield','training',30,NULL,NULL,1,0,'2025-10-27 15:47:19'),(28,NULL,'Expert Volunteer','Completed advanced volunteer training','medal','training',80,NULL,NULL,1,0,'2025-10-27 15:47:19'),(29,NULL,'Event Organizer','Helped organize 5 community events','calendar-event','participation',75,NULL,NULL,1,0,'2025-10-27 15:47:19'),(30,NULL,'Team Player','Participated in 10 team activities','people','participation',60,NULL,NULL,1,0,'2025-10-27 15:47:19'),(31,NULL,'Perfect Attendance','Attended all scheduled activities for a month','checkmark-circle','participation',40,NULL,NULL,1,0,'2025-10-27 15:47:19'),(32,NULL,'Early Bird','Consistently arrived early for 20 activities','time','participation',35,NULL,NULL,1,0,'2025-10-27 15:47:19'),(33,NULL,'Rising Leader','Led your first volunteer team','trending-up','leadership',100,NULL,NULL,1,0,'2025-10-27 15:47:19'),(34,NULL,'Mentor','Mentored 5 new volunteers','person-add','leadership',120,NULL,NULL,1,0,'2025-10-27 15:47:19'),(35,NULL,'Team Leader','Successfully led 10 volunteer activities','ribbon','leadership',150,NULL,NULL,1,0,'2025-10-27 15:47:19'),(36,NULL,'Community Impact','Project created measurable community improvement','globe','leadership',200,NULL,NULL,1,0,'2025-10-27 15:47:19'),(37,NULL,'Innovator','Proposed and implemented a new initiative','bulb','recognition',90,NULL,NULL,1,0,'2025-10-27 15:47:19'),(38,NULL,'Ambassador','Recruited 10 new volunteers','megaphone','recognition',110,NULL,NULL,1,0,'2025-10-27 15:47:19'),(39,NULL,'Veteran Volunteer','Active volunteer for over 1 year','hourglass','recognition',180,NULL,NULL,1,0,'2025-10-27 15:47:19'),(40,NULL,'Outstanding Service','Received special recognition from organization leadership','award','recognition',250,NULL,NULL,1,0,'2025-10-27 15:47:19'),(41,NULL,'Community Hero','Completed 50 hours of community service','trophy','community',100,NULL,NULL,1,0,'2025-10-27 15:49:29'),(42,NULL,'Helping Hand','Completed first volunteer activity','hand-heart','community',10,NULL,NULL,1,0,'2025-10-27 15:49:29'),(43,NULL,'Service Champion','Completed 100 hours of community service','star','community',200,NULL,NULL,1,0,'2025-10-27 15:49:29'),(44,NULL,'Dedicated Volunteer','Volunteered for 6 consecutive months','calendar','community',150,NULL,NULL,1,0,'2025-10-27 15:49:29'),(45,NULL,'Training Complete','Completed all required trainings','graduation-cap','training',50,NULL,NULL,1,0,'2025-10-27 15:49:44'),(46,NULL,'Quick Learner','Completed first training module','book','training',20,NULL,NULL,1,0,'2025-10-27 15:49:44'),(47,NULL,'Safety First','Completed safety and security training','shield','training',30,NULL,NULL,1,0,'2025-10-27 15:49:44'),(48,NULL,'Expert Volunteer','Completed advanced volunteer training','medal','training',80,NULL,NULL,1,0,'2025-10-27 15:49:44'),(49,NULL,'Event Organizer','Helped organize 5 community events','calendar-event','participation',75,NULL,NULL,1,0,'2025-10-27 15:49:45'),(50,NULL,'Team Player','Participated in 10 team activities','people','participation',60,NULL,NULL,1,0,'2025-10-27 15:49:45'),(51,NULL,'Perfect Attendance','Attended all scheduled activities for a month','checkmark-circle','participation',40,NULL,NULL,1,0,'2025-10-27 15:49:45'),(52,NULL,'Early Bird','Consistently arrived early for 20 activities','time','participation',35,NULL,NULL,1,0,'2025-10-27 15:49:45'),(53,NULL,'Rising Leader','Led your first volunteer team','trending-up','leadership',100,NULL,NULL,1,0,'2025-10-27 15:49:47'),(54,NULL,'Mentor','Mentored 5 new volunteers','person-add','leadership',120,NULL,NULL,1,0,'2025-10-27 15:49:47'),(55,NULL,'Team Leader','Successfully led 10 volunteer activities','ribbon','leadership',150,NULL,NULL,1,0,'2025-10-27 15:49:47'),(56,NULL,'Community Impact','Project created measurable community improvement','globe','leadership',200,NULL,NULL,1,0,'2025-10-27 15:49:47'),(57,NULL,'Innovator','Proposed and implemented a new initiative','bulb','recognition',90,NULL,NULL,1,0,'2025-10-27 15:49:48'),(58,NULL,'Ambassador','Recruited 10 new volunteers','megaphone','recognition',110,NULL,NULL,1,0,'2025-10-27 15:49:48'),(59,NULL,'Veteran Volunteer','Active volunteer for over 1 year','hourglass','recognition',180,NULL,NULL,1,0,'2025-10-27 15:49:48'),(60,NULL,'Outstanding Service','Received special recognition from organization leadership','award','recognition',250,NULL,NULL,1,0,'2025-10-27 15:49:48'),(61,'FIRST_ATTENDANCE','First Steps','Attend your first event to start earning badges.','??','engagement',20,'EVENT_ATTEND',1,1,10,'2025-11-19 12:49:34'),(62,'FIVE_EVENTS','Steady Hands','Attend five events to prove your reliability.','??','engagement',35,'EVENT_ATTEND',5,1,20,'2025-11-19 12:49:34'),(63,'TEN_EVENTS','Community Pillar','Attend ten events and become a dependable volunteer.','??','engagement',50,'EVENT_ATTEND',10,1,30,'2025-11-19 12:49:34'),(64,'HUNDRED_POINTS','Momentum Starter','Earn 100 lifetime points across any activity.','?','points',40,'POINTS',100,1,40,'2025-11-19 12:49:34'),(65,'STREAK_SEVEN','Weeklong Warrior','Maintain a 7-day rolling streak of point-earning actions.','??','streak',60,'STREAK_DAYS',7,1,50,'2025-11-19 12:49:34');


DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('INFO','LOW','MEDIUM','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci DEFAULT 'INFO',
  `performed_by_user_id` int DEFAULT NULL,
  `performed_by_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `performed_by_role` enum('admin','staff','volunteer','system','unknown') COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_resource_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_resource_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changes` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_activity_logs_performed_by` (`performed_by_user_id`),
  KEY `idx_activity_logs_created_at` (`created_at` DESC),
  KEY `idx_activity_logs_severity` (`severity`),
  KEY `idx_activity_logs_target` (`target_resource_type`,`target_resource_id`),
  KEY `idx_activity_logs_role` (`performed_by_role`),
  KEY `idx_activity_logs_type_date` (`type`,`created_at` DESC),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=316 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `applicants`;
CREATE TABLE `applicants` (
  `applicant_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `status_id` int NOT NULL,
  `application_date` date NOT NULL DEFAULT (curdate()),
  PRIMARY KEY (`applicant_id`),
  KEY `user_id` (`user_id`),
  KEY `status_id` (`status_id`),
  CONSTRAINT `applicants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `applicants_ibfk_2` FOREIGN KEY (`status_id`) REFERENCES `application_statuses` (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `applicants` VALUES (1,1,3,'2025-06-08'),(2,2,2,'2025-06-07'),(3,3,3,'2025-06-06'),(4,4,4,'2025-06-05'),(5,5,2,'2025-06-04'),(6,6,1,'2025-06-08'),(7,6,1,'2025-06-09'),(8,17,1,'2025-06-09'),(10,19,5,'2025-06-09'),(12,23,1,'2025-11-22');


DROP TABLE IF EXISTS `application_statuses`;
CREATE TABLE `application_statuses` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status_name` enum('pending','under_review','interview_scheduled','rejected','approved') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`status_id`),
  UNIQUE KEY `status_name` (`status_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `application_statuses` VALUES (1,'pending'),(2,'under_review'),(3,'interview_scheduled'),(4,'rejected'),(5,'approved');


DROP TABLE IF EXISTS `days`;
CREATE TABLE `days` (
  `day_id` int NOT NULL AUTO_INCREMENT,
  `day_name` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`day_id`),
  UNIQUE KEY `day_name` (`day_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `days` VALUES (1,'Monday'),(2,'Tuesday'),(3,'Wednesday'),(4,'Thursday'),(5,'Friday'),(6,'Saturday'),(7,'Sunday');


DROP TABLE IF EXISTS `event_participants`;
CREATE TABLE `event_participants` (
  `participant_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('registered','waitlisted','attended','cancelled','no_show') COLLATE utf8mb4_unicode_ci DEFAULT 'registered',
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cancellation_date` timestamp NULL DEFAULT NULL,
  `attendance_marked_at` timestamp NULL DEFAULT NULL,
  `attendance_marked_by` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Admin notes or participant comments',
  PRIMARY KEY (`participant_id`),
  UNIQUE KEY `unique_event_participant` (`event_id`,`user_id`),
  KEY `idx_participants_event` (`event_id`),
  KEY `idx_participants_user` (`user_id`),
  KEY `idx_participants_status` (`status`),
  KEY `attendance_marked_by` (`attendance_marked_by`),
  CONSTRAINT `event_participants_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `event_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `event_participants_ibfk_3` FOREIGN KEY (`attendance_marked_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `event_participants` VALUES (16,8,19,'cancelled','2025-11-21 18:06:13','2025-11-21 18:06:40',NULL,NULL,NULL),(17,1,19,'registered','2025-11-21 07:19:33',NULL,NULL,NULL,NULL),(18,5,19,'registered','2025-11-21 07:21:10',NULL,NULL,NULL,NULL),(19,14,19,'registered','2025-11-21 09:00:46',NULL,NULL,NULL,NULL);


DROP TABLE IF EXISTS `event_updates`;
CREATE TABLE `event_updates` (
  `update_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `posted_by_user_id` int NOT NULL,
  `update_type` enum('announcement','change','reminder','cancellation') COLLATE utf8mb4_unicode_ci DEFAULT 'announcement',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`update_id`),
  KEY `idx_updates_event` (`event_id`),
  KEY `idx_updates_created` (`created_at` DESC),
  KEY `posted_by_user_id` (`posted_by_user_id`),
  CONSTRAINT `event_updates_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `event_updates_ibfk_2` FOREIGN KEY (`posted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `uid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique identifier for the event',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `event_type` enum('training','community_service','fundraising','meeting','social','other') COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_type` enum('on_site','remote','hybrid') COLLATE utf8mb4_unicode_ci DEFAULT 'on_site',
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `max_participants` int DEFAULT NULL COMMENT 'NULL = unlimited',
  `min_participants` int DEFAULT '0',
  `registration_deadline` datetime DEFAULT NULL,
  `status` enum('draft','published','ongoing','completed','cancelled','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_by_user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `archived_at` timestamp NULL DEFAULT NULL,
  `archived_by_user_id` int DEFAULT NULL,
  `postponed_at` datetime DEFAULT NULL,
  `postponed_until` datetime DEFAULT NULL,
  `postponed_reason` text COLLATE utf8mb4_unicode_ci,
  `postponed_by_user_id` int DEFAULT NULL,
  `previous_start_datetime` datetime DEFAULT NULL,
  `previous_end_datetime` datetime DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL COMMENT 'Array of tags for filtering',
  `requirements` text COLLATE utf8mb4_unicode_ci COMMENT 'Special requirements or prerequisites',
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  UNIQUE KEY `uid` (`uid`),
  KEY `idx_events_status` (`status`),
  KEY `idx_events_start` (`start_datetime`),
  KEY `idx_events_type` (`event_type`),
  KEY `idx_events_created_by` (`created_by_user_id`),
  KEY `idx_events_uid` (`uid`),
  KEY `archived_by_user_id` (`archived_by_user_id`),
  KEY `fk_events_postponed_by` (`postponed_by_user_id`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_2` FOREIGN KEY (`archived_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_events_postponed_by` FOREIGN KEY (`postponed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `events` VALUES (1,'dcdbbd06-c466-11f0-b2cd-0a81587e800f','Volunteer Orientation Training','Comprehensive orientation for new volunteers covering organizational policies, safety procedures, and volunteer responsibilities.','training','Bagani Foundation Headquarters, Manila','on_site','2025-11-25 02:10:00','2025-11-25 05:10:00',30,0,'2025-11-23 02:10:00','published',1,'2025-11-18 10:10:51','2025-11-19 10:14:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'','[\"orientation\", \"training\", \"new-volunteers\"]','No prior experience required. Please bring a valid ID.','training@baganifoundation.org','+63 912 345 6789'),(2,'dcdc8c31-c466-11f0-b2cd-0a81587e800f','Community Cleanup Drive','Join us for a community cleanup initiative in partnership with local barangays. Help keep our neighborhoods clean and green!','community_service','Quezon City Memorial Circle','on_site','2025-12-02 10:10:51','2025-12-02 14:10:51',50,0,'2025-11-30 10:10:51','published',1,'2025-11-18 10:10:51','2025-11-18 10:10:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/images/events/cleanup.jpg','[\"environment\", \"community\", \"cleanup\"]','Wear comfortable clothes and closed shoes. Gloves and materials will be provided.','events@baganifoundation.org','+63 912 345 6789'),(3,'dcdc927a-c466-11f0-b2cd-0a81587e800f','Fundraising Gala Night','Annual fundraising gala to support our education programs. Enjoy an evening of entertainment, dinner, and silent auction.','fundraising','The Peninsula Manila, Makati','on_site','2025-12-18 10:10:51','2025-12-18 15:10:51',200,0,'2025-12-13 10:10:51','published',1,'2025-11-18 10:10:51','2025-11-18 10:10:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/images/events/gala.jpg','[\"fundraising\", \"gala\", \"formal\"]','Formal attire required. Ticket includes dinner and entertainment.','gala@baganifoundation.org','+63 912 345 6789'),(4,'dcdc95e3-c466-11f0-b2cd-0a81587e800f','Monthly Volunteer Meeting 3','Virtual monthly meeting to discuss ongoing projects, share updates, and plan upcoming activities.','meeting','Zoom Meeting (link will be sent)','remote','2025-11-20 02:10:00','2025-11-20 04:10:00',NULL,0,'2025-11-19 02:10:00','completed',1,'2025-11-18 10:10:51','2025-11-21 06:30:07','2025-11-19 11:04:41',6,NULL,NULL,NULL,NULL,NULL,NULL,'','[\"meeting\", \"virtual\", \"updates\"]','Zoom link will be sent 24 hours before the meeting.','meetings@baganifoundation.org',''),(5,'dcdc97dc-c466-11f0-b2cd-0a81587e800f','Team Building Activity','Fun team building activities for volunteers to strengthen bonds and improve collaboration.','social','Tagaytay Highlands Resort','on_site','2025-12-09 10:10:51','2025-12-09 18:10:51',40,0,'2025-12-06 10:10:51','published',1,'2025-11-18 10:10:51','2025-11-18 10:10:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/images/events/teambuilding.jpg','[\"social\", \"team-building\", \"recreation\"]','Transportation will be provided. Bring extra clothes and personal items.','social@baganifoundation.org','+63 912 345 6789'),(6,'6a770a88-8308-46c6-9b5d-b824eeabc221','awd event ',NULL,'other',NULL,'on_site','2025-11-22 18:46:00','2025-11-22 22:46:00',NULL,0,NULL,'draft',6,'2025-11-18 10:46:27','2025-11-18 10:46:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(7,'38ca2067-6317-4ad9-9b88-53938f67dfb2','awdawd weaw',NULL,'other',NULL,'on_site','2025-11-22 18:49:00','2025-11-22 22:49:00',NULL,0,NULL,'draft',6,'2025-11-18 10:49:45','2025-11-18 10:49:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(8,'0bba2b31-2a5c-4704-9aba-8f78f2ebd050','Event title','description','other','Bacolod City','on_site','2025-11-22 19:18:00','2025-11-22 22:19:00',10,5,NULL,'',6,'2025-11-18 11:19:21','2025-11-22 02:19:11',NULL,NULL,'2025-11-22 02:19:11','2025-11-25 19:18:00',NULL,6,'2025-11-22 19:18:00','2025-11-22 22:19:00',NULL,'[\"voluntter\"]',NULL,NULL,NULL),(9,'612825d4-59df-4156-940d-7937e3498f44','Draft Event',NULL,'other',NULL,'on_site','2025-11-20 17:49:00','2025-11-21 17:49:00',NULL,0,NULL,'draft',6,'2025-11-18 17:49:50','2025-11-18 17:49:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(10,'29d034d1-b81c-46b1-bb55-34c72ded9cf0','Archived Event','Test archived auto','other',NULL,'on_site','2025-11-21 06:25:00','2025-11-21 06:26:00',NULL,0,NULL,'archived',17,'2025-11-21 06:22:20','2025-11-21 06:30:08','2025-11-21 06:30:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(11,'b78cacd0-e38f-4727-9b03-5d6a68fc9665','Auto archived Event','Test event','other',NULL,'on_site','2025-11-21 06:31:00','2025-11-21 06:32:00',NULL,0,NULL,'archived',17,'2025-11-21 06:30:16','2025-11-21 06:45:08','2025-11-21 06:45:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(13,'817a0848-8e00-4cdc-8b79-f37bf147b84b','timezone 2','awfawfa','social','','on_site','2025-11-30 00:51:00','2025-11-30 01:51:00',NULL,0,NULL,'published',6,'2025-11-21 07:51:31','2025-11-22 03:02:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'','[]','','',''),(14,'0599dee1-0346-4a90-9fa0-322d7f87d1b9','test event','awfwafawf','other',NULL,'on_site','2025-11-21 12:24:00','2025-11-21 13:24:00',NULL,0,NULL,'',6,'2025-11-21 08:24:44','2025-11-22 02:19:52',NULL,NULL,'2025-11-22 02:19:52','2025-11-30 12:24:00',NULL,6,'2025-11-21 12:24:00','2025-11-21 13:24:00',NULL,'[]',NULL,NULL,NULL),(15,'3d5a70f2-993a-4634-a11b-f90405b94fa4','evwebrt 1',NULL,'other',NULL,'on_site','2025-11-25 08:41:00','2025-11-25 10:41:00',NULL,0,NULL,'published',6,'2025-11-21 08:41:53','2025-11-21 08:41:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(16,'33115af2-763e-4f3e-a5c4-d5f5dd0c1b71','create event test','test event create','other',NULL,'on_site','2025-11-27 08:45:00','2025-11-28 08:45:00',NULL,0,NULL,'draft',6,'2025-11-21 08:45:27','2025-11-21 08:45:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(17,'b0140dea-3181-4639-bccd-21252b2991d6','test event gamification','awfawf','other',NULL,'on_site','2025-11-27 09:52:00','2025-11-28 09:52:00',NULL,0,NULL,'published',6,'2025-11-21 09:52:25','2025-11-21 09:52:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL),(18,'4c73c285-57d7-4fb9-8daf-063f913ec033','date event test',NULL,'other',NULL,'on_site','2025-11-22 08:36:00','2025-11-22 09:36:00',NULL,0,NULL,'published',6,'2025-11-22 05:36:34','2025-11-22 05:36:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',NULL,NULL,NULL);


DROP TABLE IF EXISTS `gamification_events`;
CREATE TABLE `gamification_events` (
  `gamification_event_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_id` int DEFAULT NULL,
  `action` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `points_delta` int NOT NULL DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `dedupe_key` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`gamification_event_id`),
  UNIQUE KEY `uniq_gamification_dedupe` (`dedupe_key`),
  KEY `idx_gamification_user` (`user_id`),
  KEY `idx_gamification_action` (`action`),
  KEY `idx_gamification_event` (`event_id`),
  KEY `idx_gamification_created_at` (`created_at`),
  CONSTRAINT `fk_gamification_events_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_gamification_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `gamification_events` VALUES (6,19,8,'EVENT_REGISTER',10,'{\"eventUid\": \"0bba2b31-2a5c-4704-9aba-8f78f2ebd050\", \"eventTitle\": \"Event title\", \"registrationStatus\": \"registered\"}','EVENT_REGISTER:19:8:registered','2025-11-21 06:56:29','2025-11-21 06:56:29'),(7,19,8,'EVENT_CANCEL',-5,'{\"eventUid\": \"0bba2b31-2a5c-4704-9aba-8f78f2ebd050\", \"eventTitle\": \"Event title\"}','EVENT_CANCEL:19:8:default','2025-11-21 07:16:28','2025-11-21 07:16:28'),(8,19,1,'EVENT_REGISTER',10,'{\"eventUid\": \"dcdbbd06-c466-11f0-b2cd-0a81587e800f\", \"eventTitle\": \"Volunteer Orientation Training\", \"registrationStatus\": \"registered\"}','EVENT_REGISTER:19:1:registered','2025-11-21 07:19:35','2025-11-21 07:19:35'),(9,19,5,'EVENT_REGISTER',10,'{\"eventUid\": \"dcdc97dc-c466-11f0-b2cd-0a81587e800f\", \"eventTitle\": \"Team Building Activity\", \"registrationStatus\": \"registered\"}','EVENT_REGISTER:19:5:registered','2025-11-21 07:21:11','2025-11-21 07:21:11'),(10,6,13,'EVENT_HOST_PUBLISHED',25,'{\"eventUid\": \"817a0848-8e00-4cdc-8b79-f37bf147b84b\", \"eventTitle\": \"timezone 2\"}','EVENT_HOST_PUBLISHED:6:13:default','2025-11-21 07:51:34','2025-11-21 07:51:34'),(11,6,14,'EVENT_HOST_PUBLISHED',25,'{\"eventUid\": \"0599dee1-0346-4a90-9fa0-322d7f87d1b9\", \"eventTitle\": \"test event\"}','EVENT_HOST_PUBLISHED:6:14:default','2025-11-21 08:24:47','2025-11-21 08:24:47'),(12,6,15,'EVENT_HOST_PUBLISHED',25,'{\"eventUid\": \"3d5a70f2-993a-4634-a11b-f90405b94fa4\", \"eventTitle\": \"evwebrt 1\"}','EVENT_HOST_PUBLISHED:6:15:default','2025-11-21 08:41:57','2025-11-21 08:41:57'),(13,19,14,'EVENT_REGISTER',10,'{\"eventUid\": \"0599dee1-0346-4a90-9fa0-322d7f87d1b9\", \"eventTitle\": \"test event\", \"registrationStatus\": \"registered\"}','EVENT_REGISTER:19:14:registered','2025-11-21 09:00:47','2025-11-21 09:00:47');


DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('info','alert','success','warning','message','task','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `action_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_unread` (`user_id`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `notifications` VALUES (1,1,'Welcome to Vaulteer! ??','Thank you for joining our volunteer management system. We\'re excited to have you on board!','info',0,NULL,NULL,'2025-10-27 01:58:20',NULL),(2,1,'New Task Assigned ??','You have been assigned to help with the community cleanup event this Saturday at 9 AM.','task',0,NULL,NULL,'2025-10-27 05:58:20',NULL),(3,1,'Application Approved ?','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-26 23:58:20',NULL),(4,1,'Urgent: Event Reminder ??','Don\'t forget about tomorrow\'s volunteer orientation at 2 PM. Please arrive 10 minutes early.','warning',0,NULL,NULL,'2025-10-26 14:58:20',NULL),(5,1,'New Message ??','You have a new message from Admin: Please update your contact information in your profile.','message',0,NULL,NULL,'2025-10-27 07:58:20',NULL),(6,1,'System Maintenance ??','Scheduled maintenance on Sunday from 2-4 AM. The system will be temporarily unavailable.','system',1,NULL,NULL,'2025-10-26 11:58:21',NULL),(7,1,'Important Update! ??','New safety guidelines have been posted. Please review them before your next volunteer shift.','alert',0,NULL,NULL,'2025-10-27 00:58:21',NULL),(8,2,'Welcome to Vaulteer! ??','Thank you for joining our volunteer management system. We\'re excited to have you on board!','info',0,NULL,NULL,'2025-10-26 15:58:21',NULL),(9,2,'New Task Assigned ??','You have been assigned to help with the community cleanup event this Saturday at 9 AM.','task',0,NULL,NULL,'2025-10-26 15:58:21',NULL),(10,2,'Application Approved ?','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-26 13:58:21',NULL),(11,2,'Urgent: Event Reminder ??','Don\'t forget about tomorrow\'s volunteer orientation at 2 PM. Please arrive 10 minutes early.','warning',0,NULL,NULL,'2025-10-27 04:58:21',NULL),(12,2,'New Message ??','You have a new message from Admin: Please update your contact information in your profile.','message',0,NULL,NULL,'2025-10-26 11:58:22',NULL),(13,2,'System Maintenance ??','Scheduled maintenance on Sunday from 2-4 AM. The system will be temporarily unavailable.','system',1,NULL,NULL,'2025-10-26 23:58:22',NULL),(14,2,'Important Update! ??','New safety guidelines have been posted. Please review them before your next volunteer shift.','alert',0,NULL,NULL,'2025-10-27 00:58:22',NULL),(15,3,'Welcome to Vaulteer! ??','Thank you for joining our volunteer management system. We\'re excited to have you on board!','info',0,NULL,NULL,'2025-10-27 04:58:22',NULL),(16,3,'New Task Assigned ??','You have been assigned to help with the community cleanup event this Saturday at 9 AM.','task',0,NULL,NULL,'2025-10-27 02:58:22',NULL),(17,3,'Application Approved ?','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-27 08:58:22',NULL),(18,3,'Urgent: Event Reminder ??','Don\'t forget about tomorrow\'s volunteer orientation at 2 PM. Please arrive 10 minutes early.','warning',0,NULL,NULL,'2025-10-26 14:58:23',NULL),(19,3,'New Message ??','You have a new message from Admin: Please update your contact information in your profile.','message',0,NULL,NULL,'2025-10-27 04:58:23',NULL),(20,3,'System Maintenance ??','Scheduled maintenance on Sunday from 2-4 AM. The system will be temporarily unavailable.','system',1,NULL,NULL,'2025-10-26 16:58:23',NULL),(21,3,'Important Update! ??','New safety guidelines have been posted. Please review them before your next volunteer shift.','alert',0,NULL,NULL,'2025-10-26 22:58:23',NULL),(22,4,'Welcome to Vaulteer! ??','Thank you for joining our volunteer management system. We\'re excited to have you on board!','info',0,NULL,NULL,'2025-10-26 14:58:23',NULL),(23,4,'New Task Assigned ??','You have been assigned to help with the community cleanup event this Saturday at 9 AM.','task',0,NULL,NULL,'2025-10-26 21:58:23',NULL),(24,4,'Application Approved ?','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-26 11:58:24',NULL),(25,4,'Urgent: Event Reminder ??','Don\'t forget about tomorrow\'s volunteer orientation at 2 PM. Please arrive 10 minutes early.','warning',0,NULL,NULL,'2025-10-26 21:58:24',NULL),(26,4,'New Message ??','You have a new message from Admin: Please update your contact information in your profile.','message',0,NULL,NULL,'2025-10-27 00:58:24',NULL),(27,4,'System Maintenance ??','Scheduled maintenance on Sunday from 2-4 AM. The system will be temporarily unavailable.','system',1,NULL,NULL,'2025-10-26 15:58:24',NULL),(28,4,'Important Update! ??','New safety guidelines have been posted. Please review them before your next volunteer shift.','alert',0,NULL,NULL,'2025-10-26 11:58:24',NULL),(29,5,'Welcome to Vaulteer! ??','Thank you for joining our volunteer management system. We\'re excited to have you on board!','info',0,NULL,NULL,'2025-10-27 01:58:24',NULL),(30,5,'New Task Assigned ??','You have been assigned to help with the community cleanup event this Saturday at 9 AM.','task',0,NULL,NULL,'2025-10-26 17:58:25',NULL),(31,5,'Application Approved ?','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-27 07:58:25',NULL),(32,5,'Urgent: Event Reminder ??','Don\'t forget about tomorrow\'s volunteer orientation at 2 PM. Please arrive 10 minutes early.','warning',0,NULL,NULL,'2025-10-27 03:58:25',NULL),(33,5,'New Message ??','You have a new message from Admin: Please update your contact information in your profile.','message',0,NULL,NULL,'2025-10-27 04:58:25',NULL),(34,5,'System Maintenance ??','Scheduled maintenance on Sunday from 2-4 AM. The system will be temporarily unavailable.','system',1,NULL,NULL,'2025-10-27 02:58:25',NULL),(35,5,'Important Update! ??','New safety guidelines have been posted. Please review them before your next volunteer shift.','alert',0,NULL,NULL,'2025-10-26 15:58:25',NULL),(42,6,'?? New Task Assigned','You have been assigned to the Community Cleanup Event this Saturday at 9 AM. Please confirm your attendance.','task',1,NULL,NULL,'2025-10-27 04:12:24','2025-10-27 09:15:05'),(44,6,'? Application Approved','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-26 09:12:24',NULL),(45,6,'?? New Message from Admin','Sarah Johnson sent you a message: \'Can you help with the food drive next week?\' Click to reply.','message',1,NULL,NULL,'2025-10-27 06:12:24','2025-10-27 09:15:09'),(46,6,'?? Event Reminder','Don\'t forget: Volunteer orientation is tomorrow at 2 PM. Location: Community Center, Room 101.','warning',1,NULL,NULL,'2025-10-27 01:12:24','2025-10-27 09:15:04'),(47,6,'?? System Maintenance Notice','Scheduled system maintenance on Sunday from 2-4 AM. The platform will be temporarily unavailable during this time.','system',1,NULL,NULL,'2025-10-25 09:12:25',NULL),(48,17,'?? Welcome to Vaulteer!','Thank you for joining our volunteer management system. Get started by exploring your dashboard and available features.','info',1,NULL,NULL,'2025-10-27 07:12:25','2025-10-27 09:14:39'),(49,17,'?? New Task Assigned','You have been assigned to the Community Cleanup Event this Saturday at 9 AM. Please confirm your attendance.','task',1,NULL,NULL,'2025-10-27 04:12:25','2025-10-27 09:14:39'),(50,17,'?? Important Update','New safety guidelines have been posted for all volunteers. Please review them before your next shift.','alert',1,NULL,NULL,'2025-10-27 08:12:26','2025-10-27 09:14:39'),(51,17,'? Application Approved','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-26 09:12:26',NULL),(52,17,'?? New Message from Admin','Sarah Johnson sent you a message: \'Can you help with the food drive next week?\' Click to reply.','message',1,NULL,NULL,'2025-10-27 06:12:26','2025-10-27 09:14:39'),(53,17,'?? Event Reminder','Don\'t forget: Volunteer orientation is tomorrow at 2 PM. Location: Community Center, Room 101.','warning',1,NULL,NULL,'2025-10-27 01:12:26','2025-10-27 09:14:39'),(54,17,'?? System Maintenance Notice','Scheduled system maintenance on Sunday from 2-4 AM. The platform will be temporarily unavailable during this time.','system',1,NULL,NULL,'2025-10-25 09:12:26',NULL),(55,6,'?? Welcome to Vaulteer!','Thank you for joining our volunteer management system. Get started by exploring your dashboard and available features.','info',0,NULL,NULL,'2025-10-27 07:13:08',NULL),(56,6,'?? New Task Assigned','You have been assigned to the Community Cleanup Event this Saturday at 9 AM. Please confirm your attendance.','task',1,NULL,NULL,'2025-10-27 04:13:08','2025-10-27 09:15:13'),(58,6,'? Application Approved','Congratulations! Your volunteer application has been approved. Welcome to the team!','success',1,NULL,NULL,'2025-10-26 09:13:08',NULL),(59,6,'?? New Message from Admin','Sarah Johnson sent you a message: \"Can you help with the food drive next week?\" Click to reply.','message',0,NULL,NULL,'2025-10-27 06:13:08',NULL),(60,6,'?? Event Reminder','Don\'t forget: Volunteer orientation is tomorrow at 2 PM. Location: Community Center, Room 101.','warning',1,NULL,NULL,'2025-10-27 01:13:08','2025-10-27 09:15:05'),(61,6,'?? System Maintenance Notice','Scheduled system maintenance on Sunday from 2-4 AM. The platform will be temporarily unavailable during this time.','system',1,NULL,NULL,'2025-10-25 09:13:08',NULL),(62,17,'+10 pts earned','You earned +10 pts from event registration. (Event title)','success',1,NULL,'{\"action\": \"EVENT_REGISTER\", \"eventId\": 8, \"eventUid\": \"0bba2b31-2a5c-4704-9aba-8f78f2ebd050\", \"eventTitle\": \"Event title\", \"pointsDelta\": 10, \"notificationKind\": \"gamification_points\", \"registrationStatus\": \"registered\"}','2025-11-19 17:36:05','2025-11-19 17:36:35'),(63,19,'+10 pts earned','You earned +10 pts from event registration. (Volunteer Orientation Training)','success',0,NULL,'{\"action\": \"EVENT_REGISTER\", \"eventId\": 1, \"eventUid\": \"dcdbbd06-c466-11f0-b2cd-0a81587e800f\", \"eventTitle\": \"Volunteer Orientation Training\", \"pointsDelta\": 10, \"notificationKind\": \"gamification_points\", \"registrationStatus\": \"registered\"}','2025-11-19 17:37:04',NULL),(64,19,'-5 pts adjusted','Your total was adjusted by -5 pts due to event cancellation. (Event title)','warning',0,NULL,'{\"action\": \"EVENT_CANCEL\", \"eventId\": 8, \"eventUid\": \"0bba2b31-2a5c-4704-9aba-8f78f2ebd050\", \"eventTitle\": \"Event title\", \"pointsDelta\": -5, \"notificationKind\": \"gamification_points\"}','2025-11-21 02:56:35',NULL),(65,17,'+25 pts earned','You earned +25 pts from event publishing. (Archived Event)','success',0,NULL,'{\"action\": \"EVENT_HOST_PUBLISHED\", \"eventId\": 10, \"eventUid\": \"29d034d1-b81c-46b1-bb55-34c72ded9cf0\", \"eventTitle\": \"Archived Event\", \"pointsDelta\": 25, \"notificationKind\": \"gamification_points\"}','2025-11-21 06:22:25',NULL),(66,17,'+25 pts earned','You earned +25 pts from event publishing. (Auto archived Event)','success',0,NULL,'{\"action\": \"EVENT_HOST_PUBLISHED\", \"eventId\": 11, \"eventUid\": \"b78cacd0-e38f-4727-9b03-5d6a68fc9665\", \"eventTitle\": \"Auto archived Event\", \"pointsDelta\": 25, \"notificationKind\": \"gamification_points\"}','2025-11-21 06:30:20',NULL),(67,19,'+10 pts earned','You earned +10 pts from event registration. (Event title)','success',1,NULL,'{\"action\": \"EVENT_REGISTER\", \"eventId\": 8, \"eventUid\": \"0bba2b31-2a5c-4704-9aba-8f78f2ebd050\", \"eventTitle\": \"Event title\", \"pointsDelta\": 10, \"notificationKind\": \"gamification_points\", \"registrationStatus\": \"registered\"}','2025-11-21 06:56:31','2025-11-21 06:56:50'),(68,19,'-5 pts adjusted','Your total was adjusted by -5 pts due to event cancellation. (Event title)','warning',0,NULL,'{\"action\": \"EVENT_CANCEL\", \"eventId\": 8, \"eventUid\": \"0bba2b31-2a5c-4704-9aba-8f78f2ebd050\", \"eventTitle\": \"Event title\", \"pointsDelta\": -5, \"notificationKind\": \"gamification_points\"}','2025-11-21 07:16:29',NULL);


DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role` enum('admin','staff','volunteer','applicant') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `roles` VALUES (1,'admin'),(2,'staff'),(3,'volunteer'),(4,'applicant');


DROP TABLE IF EXISTS `user_achievements`;
CREATE TABLE `user_achievements` (
  `user_achievement_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `achievement_id` int NOT NULL,
  `earned_date` date NOT NULL DEFAULT (curdate()),
  `awarded_by_user_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_achievement_id`),
  UNIQUE KEY `unique_user_achievement` (`user_id`,`achievement_id`),
  KEY `awarded_by_user_id` (`awarded_by_user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_achievement_id` (`achievement_id`),
  KEY `idx_earned_date` (`earned_date`),
  CONSTRAINT `user_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievements_ibfk_2` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`achievement_id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievements_ibfk_3` FOREIGN KEY (`awarded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




DROP TABLE IF EXISTS `user_available_days`;
CREATE TABLE `user_available_days` (
  `profile_id` int NOT NULL,
  `day_id` int NOT NULL,
  PRIMARY KEY (`profile_id`,`day_id`),
  KEY `day_id` (`day_id`),
  CONSTRAINT `user_available_days_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
  CONSTRAINT `user_available_days_ibfk_2` FOREIGN KEY (`day_id`) REFERENCES `days` (`day_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_available_days` VALUES (6,1),(17,1),(18,1),(19,1),(20,1),(18,2),(6,3),(17,3),(18,3),(19,3),(20,3),(19,4),(20,4),(6,5),(17,5),(18,5),(19,5),(20,5);


DROP TABLE IF EXISTS `user_gamification_stats`;
CREATE TABLE `user_gamification_stats` (
  `user_id` int NOT NULL,
  `total_points` int NOT NULL DEFAULT '0',
  `lifetime_points` int NOT NULL DEFAULT '0',
  `current_level` int NOT NULL DEFAULT '1',
  `current_streak` int NOT NULL DEFAULT '0',
  `longest_streak` int NOT NULL DEFAULT '0',
  `last_rewarded_at` timestamp NULL DEFAULT NULL,
  `last_streak_event` timestamp NULL DEFAULT NULL,
  `events_registered` int NOT NULL DEFAULT '0',
  `events_attended` int NOT NULL DEFAULT '0',
  `events_hosted` int NOT NULL DEFAULT '0',
  `badges_earned` int NOT NULL DEFAULT '0',
  `last_badge_awarded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_gamification_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `user_gamification_stats` VALUES (6,75,75,1,0,0,'2025-11-21 08:41:57',NULL,0,0,3,0,NULL,'2025-11-21 07:33:06','2025-11-21 08:41:57'),(17,0,0,1,0,0,NULL,NULL,0,0,0,0,NULL,'2025-11-21 06:56:03','2025-11-21 06:56:03'),(18,0,0,1,0,0,NULL,NULL,0,0,0,0,NULL,'2025-11-22 08:18:38','2025-11-22 08:18:38'),(19,35,40,1,0,0,'2025-11-21 09:00:47',NULL,3,0,0,0,NULL,'2025-11-21 06:55:05','2025-11-21 09:00:47'),(23,0,0,1,0,0,NULL,NULL,0,0,0,0,NULL,'2025-11-22 08:44:45','2025-11-22 08:44:45');


DROP TABLE IF EXISTS `user_other_roles`;
CREATE TABLE `user_other_roles` (
  `profile_id` int NOT NULL,
  `other_role` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`profile_id`),
  CONSTRAINT `user_other_roles_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




DROP TABLE IF EXISTS `user_profile_roles`;
CREATE TABLE `user_profile_roles` (
  `profile_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`profile_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_profile_roles_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
  CONSTRAINT `user_profile_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_profile_roles` VALUES (17,2),(18,2),(19,2),(20,2),(17,3),(18,3),(19,4),(20,4),(6,5),(17,5),(18,5),(19,5),(20,5);


DROP TABLE IF EXISTS `user_profile_trainings`;
CREATE TABLE `user_profile_trainings` (
  `profile_id` int NOT NULL,
  `training_id` int NOT NULL,
  PRIMARY KEY (`profile_id`,`training_id`),
  KEY `training_id` (`training_id`),
  CONSTRAINT `user_profile_trainings_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
  CONSTRAINT `user_profile_trainings_ibfk_2` FOREIGN KEY (`training_id`) REFERENCES `user_trainings` (`training_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_profile_trainings` VALUES (6,1),(18,1),(6,2),(17,2),(18,2),(19,2),(20,2),(6,3),(17,3),(18,3),(6,4),(18,4),(6,5),(18,5);


DROP TABLE IF EXISTS `user_profiles`;
CREATE TABLE `user_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `first_name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `middle_initial` char(1) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `nickname` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `birthdate` date NOT NULL,
  `gender` enum('Male','Female','Prefer not to say','Other') COLLATE utf8mb4_general_ci NOT NULL,
  `gender_other` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consent` enum('agree','disagree') COLLATE utf8mb4_general_ci NOT NULL,
  `mobile_number` varchar(32) COLLATE utf8mb4_general_ci NOT NULL,
  `city` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `facebook` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `twitter` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `instagram` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tiktok` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `current_status` enum('Working Professional','Student','Not Applicable') COLLATE utf8mb4_general_ci NOT NULL,
  `declaration_commitment` enum('agree','disagree') COLLATE utf8mb4_general_ci NOT NULL,
  `volunteer_reason` text COLLATE utf8mb4_general_ci NOT NULL,
  `volunteer_frequency` enum('Always','Often','Seldom','Rarely') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`profile_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_profiles` VALUES (1,1,'Alice','M','Garcia','Ali','2002-02-02','Female',NULL,'agree','09171234561','Bacolod','https://facebook.com/alice',NULL,NULL,NULL,'Student','agree','I want to help.','Always'),(2,2,'Bob','K','Diaz','Bobby','1999-03-01','Male',NULL,'agree','09171234562','Talisay',NULL,'https://twitter.com/bob',NULL,NULL,'Working Professional','agree','I want to serve.','Often'),(3,3,'Carla',NULL,'Lim','Carly','2001-04-02','Female',NULL,'agree','09171234563','Silay',NULL,NULL,'https://instagram.com/carlaa',NULL,'Student','agree','Giving back to the community.','Seldom'),(4,4,'David','J','Lee','Dave','1998-05-05','Male',NULL,'agree','09171234564','Bago',NULL,NULL,NULL,'https://tiktok.com/@david','Working Professional','agree','Support local initiatives.','Rarely'),(5,5,'Ella',NULL,'Tan','El','2000-06-06','Female',NULL,'agree','09171234565','La Carlota','https://facebook.com/ella',NULL,NULL,NULL,'Student','agree','Make a difference.','Always'),(6,6,'Ken Francen','G','Baylon','Kenny','2006-02-16','Male',NULL,'agree','09994353730','Bacolod City','https://www.facebook.com/profile.php?id=61581721018891','','','','Student','agree','fefgrg','Rarely'),(7,7,'Alice','M','Garcia','Ali','1995-03-10','Female',NULL,'agree','09170010001','Manila','fb.com/alice',NULL,NULL,NULL,'Working Professional','agree','Wants to help community','Often'),(8,8,'Bob','A','Nguyen','Bobby','1990-07-22','Male',NULL,'agree','09170010002','Quezon City',NULL,'twitter.com/bob',NULL,NULL,'Student','agree','Gain experience','Always'),(9,9,'Carol','T','Smith','Caz','1998-11-15','Female',NULL,'agree','09170010003','Cebu',NULL,NULL,'instagram.com/carol',NULL,'Working Professional','agree','Meet new people','Seldom'),(10,10,'David','J','Lee','Dave','1992-02-05','Male',NULL,'agree','09170010004','Davao',NULL,NULL,NULL,'tiktok.com/@david','Student','agree','Improve skills','Often'),(11,11,'Eva',NULL,'Martinez','Evie','1996-12-30','Female',NULL,'agree','09170010005','Baguio','fb.com/eva',NULL,NULL,NULL,'Not Applicable','agree','Give back to society','Rarely'),(12,12,'Frank',NULL,'Hernandez','Franky','1985-01-12','Male',NULL,'agree','09170020001','Pasig',NULL,NULL,NULL,NULL,'Working Professional','agree','Organization growth','Often'),(13,13,'Grace','E','Kim','Gracie','1988-08-16','Female',NULL,'agree','09170020002','Makati',NULL,NULL,NULL,NULL,'Not Applicable','agree','Support volunteers','Seldom'),(14,14,'Hank',NULL,'Patel','Hank','1991-05-25','Male',NULL,'agree','09170020003','Taguig',NULL,NULL,NULL,NULL,'Working Professional','agree','Team management','Often'),(15,15,'Ivy','M','Brown','Ives','1993-09-30','Female',NULL,'agree','09170020004','Marikina',NULL,NULL,NULL,NULL,'Student','agree','Learn leadership','Always'),(16,16,'Jake',NULL,'Wilson','Jay','1987-04-18','Male',NULL,'agree','09170020005','Caloocan',NULL,NULL,NULL,NULL,'Working Professional','agree','Enhance operations','Rarely'),(17,6,'Rica Mae','','Yburan','Rica','2000-03-23','Female',NULL,'agree','09992323393','Bacolod City','','','','','Student','agree','na','Seldom'),(18,17,'Rica Mae','B','Yburan','Rica','2000-03-09','Female',NULL,'agree','09992323393','Bacolod City','','','','','Student','agree','na','Seldom'),(19,18,'Abelada','','Alyana Kate','Yann','0006-03-06','Female',NULL,'agree','09123433434','Bacolod City','','','','','Not Applicable','agree','fefgrg','Seldom'),(20,19,'Maea Argeline','','Canto','Maea','2003-03-07','Female',NULL,'agree','09123433476','Bacolod City','','','','','Student','agree','N/A','Seldom'),(25,18,'Unknown',NULL,'Unknown','Unknown','2000-01-01','Prefer not to say',NULL,'agree','00000000000','Unknown',NULL,NULL,NULL,NULL,'Not Applicable','agree','Unknown','Rarely'),(26,23,'Unknown',NULL,'Unknown','Unknown','2000-01-01','Prefer not to say',NULL,'agree','00000000000','Unknown',NULL,NULL,NULL,NULL,'Not Applicable','agree','Unknown','Rarely');
DELIMITER ;;
SET name = TRIM(
  CONCAT(
    COALESCE(CONCAT(UPPER(LEFT(TRIM(NEW.first_name),1)), LOWER(SUBSTR(TRIM(NEW.first_name),2))), ''),
    IF(TRIM(COALESCE(NEW.first_name, '')) = '' OR (TRIM(COALESCE(NEW.middle_initial, '')) = '' AND TRIM(COALESCE(NEW.last_name, '')) = ''), '', ' '),
    IF(TRIM(COALESCE(NEW.middle_initial, '')) = '', '', CONCAT(UPPER(LEFT(TRIM(NEW.middle_initial),1)), '. ')),
    COALESCE(CONCAT(UPPER(LEFT(TRIM(NEW.last_name),1)), LOWER(SUBSTR(TRIM(NEW.last_name),2))), '')
  )
)
WHERE user_id = NEW.user_id */;;
DELIMITER ;
DELIMITER ;;
SET name = TRIM(
  CONCAT(
    COALESCE(CONCAT(UPPER(LEFT(TRIM(NEW.first_name),1)), LOWER(SUBSTR(TRIM(NEW.first_name),2))), ''),
    IF(TRIM(COALESCE(NEW.first_name, '')) = '' OR (TRIM(COALESCE(NEW.middle_initial, '')) = '' AND TRIM(COALESCE(NEW.last_name, '')) = ''), '', ' '),
    IF(TRIM(COALESCE(NEW.middle_initial, '')) = '', '', CONCAT(UPPER(LEFT(TRIM(NEW.middle_initial),1)), '. ')),
    COALESCE(CONCAT(UPPER(LEFT(TRIM(NEW.last_name),1)), LOWER(SUBSTR(TRIM(NEW.last_name),2))), '')
  )
)
WHERE user_id = NEW.user_id */;;
DELIMITER ;


DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` enum('Events & Sponsorships','Communications','Clinic Operations','Organization Development','Information Technology','Other') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_roles` VALUES (1,'Events & Sponsorships'),(2,'Communications'),(3,'Clinic Operations'),(4,'Organization Development'),(5,'Information Technology'),(6,'Other');


DROP TABLE IF EXISTS `user_school_days`;
CREATE TABLE `user_school_days` (
  `profile_id` int NOT NULL,
  `day_id` int NOT NULL,
  PRIMARY KEY (`profile_id`,`day_id`),
  KEY `day_id` (`day_id`),
  CONSTRAINT `user_school_days_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
  CONSTRAINT `user_school_days_ibfk_2` FOREIGN KEY (`day_id`) REFERENCES `days` (`day_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_school_days` VALUES (1,1),(6,1),(17,1),(18,1),(20,1),(1,2),(6,2),(17,2),(18,2),(20,2),(1,3),(6,3),(17,3),(18,3),(20,3),(6,4),(17,4),(18,4),(20,4),(6,5),(17,5),(18,5),(20,5);


DROP TABLE IF EXISTS `user_student_profile`;
CREATE TABLE `user_student_profile` (
  `student_profile_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `school` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `course` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `graduation` varchar(16) COLLATE utf8mb4_general_ci NOT NULL,
  `student_other_skills` text COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`student_profile_id`),
  KEY `profile_id` (`profile_id`),
  CONSTRAINT `user_student_profile_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_student_profile` VALUES (1,1,'Negros University','BS Computer Science','2025','Web development, leadership'),(2,3,'Bacolod State College','BS Education','2024','Teaching, public speaking'),(3,5,'La Carlota College','BS Nursing','2026','Peer support, health seminars'),(4,17,'STI West Negros University','BSIT','2026','Na'),(5,18,'STI West Negros University','BSIT','2026','Na'),(6,20,'STI West Negros University','BSIT','2026','N/A'),(7,6,'STI West Negros University','BSIT','2026','Na');


DROP TABLE IF EXISTS `user_trainings`;
CREATE TABLE `user_trainings` (
  `training_id` int NOT NULL AUTO_INCREMENT,
  `training_name` enum('None in the list','Peer Counseling','HIV Testing','Community-Based HIV Screening','Case Management / Life Coaching') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`training_id`),
  UNIQUE KEY `training_name` (`training_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_trainings` VALUES (1,'None in the list'),(2,'Peer Counseling'),(3,'HIV Testing'),(4,'Community-Based HIV Screening'),(5,'Case Management / Life Coaching');


DROP TABLE IF EXISTS `user_work_profile`;
CREATE TABLE `user_work_profile` (
  `work_profile_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `position` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `industry` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `company` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `work_shift` enum('Day shift','Mid shift','Night shift','Not Applicable') COLLATE utf8mb4_general_ci NOT NULL,
  `work_other_skills` text COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`work_profile_id`),
  KEY `profile_id` (`profile_id`),
  CONSTRAINT `user_work_profile_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `user_work_profile` VALUES (1,2,'Engineer','Technology','TechCorp','Day shift','Programming, teamwork'),(2,4,'Nurse','Healthcare','City Hospital','Night shift','First Aid, community health');


DROP TABLE IF EXISTS `user_working_days`;
CREATE TABLE `user_working_days` (
  `profile_id` int NOT NULL,
  `day_id` int NOT NULL,
  PRIMARY KEY (`profile_id`,`day_id`),
  KEY `day_id` (`day_id`),
  CONSTRAINT `user_working_days_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
  CONSTRAINT `user_working_days_ibfk_2` FOREIGN KEY (`day_id`) REFERENCES `days` (`day_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





INSERT INTO `users` VALUES (1,'applicant001','Alice M. Garcia','applicant001@email.com',4,'inactive','2025-06-08',NULL,NULL,'2025-11-15 04:05:22'),(2,'applicant002','Bob K. Diaz','applicant002@email.com',3,'deactivated','2025-06-08',NULL,'2025-11-02 04:46:04','2025-11-01 17:31:13'),(3,'applicant003','Carla Lim','applicant003@email.com',3,'inactive','2025-06-08',NULL,'2025-11-02 04:46:42','2025-11-01 17:31:13'),(4,'applicant004','David J. Lee','applicant004@email.com',3,'inactive','2025-06-08',NULL,NULL,'2025-11-01 17:31:13'),(5,'applicant005','Ella Tan','applicant005@email.com',3,'inactive','2025-06-08',NULL,NULL,'2025-11-01 17:31:13'),(6,'oAM2WQNVxUV0T3Z1p7akKcYejLW2','Ken Francen G. Baylon','kenbaylon143@gmail.com',1,'active','2025-06-08',NULL,'2025-11-21 15:33:00','2025-11-01 17:31:13'),(7,'volunteer-uid-1','Alice M. Garcia','volunteer1@example.com',3,'inactive','2025-05-06',NULL,NULL,'2025-11-01 17:31:13'),(8,'volunteer-uid-2','Bob A. Nguyen','volunteer2@example.com',3,'inactive','2025-05-13',NULL,NULL,'2025-11-01 17:31:13'),(9,'volunteer-uid-3','Carol T. Smith','volunteer3@example.com',3,'inactive','2025-04-24',NULL,NULL,'2025-11-01 17:31:13'),(10,'volunteer-uid-4','David J. Lee','volunteer4@example.com',3,'inactive','2025-06-02',NULL,NULL,'2025-11-01 17:31:13'),(11,'volunteer-uid-5','Eva Martinez','volunteer5@example.com',3,'inactive','2025-06-08',NULL,NULL,'2025-11-01 17:31:13'),(12,'staff-uid-1','Frank Hernandez','staff1@example.com',2,'inactive','2025-04-17',NULL,NULL,'2025-11-01 17:31:13'),(13,'staff-uid-2','Grace E. Kim','staff2@example.com',2,'inactive','2025-05-07',NULL,NULL,'2025-11-01 17:31:13'),(14,'staff-uid-3','Hank Patel','staff3@example.com',2,'inactive','2025-02-19',NULL,NULL,'2025-11-01 17:31:13'),(15,'staff-uid-4','Ivy M. Brown','staff4@example.com',2,'inactive','2025-06-03',NULL,NULL,'2025-11-01 17:31:13'),(16,'staff-uid-5','Jake Wilson','staff5@example.com',2,'inactive','2025-06-01',NULL,NULL,'2025-11-01 17:31:13'),(17,'qZ4icibN8jXQx8MnD1DFKpnsc6k1','Rica Mae B. Yburan','tadashikagami143@gmail.com',2,'active','2025-06-09',NULL,'2025-11-23 00:05:43','2025-11-01 17:31:13'),(19,'LBp7bMW9ufMPvaycmYx0tuJQSks1','Maea argeline Canto','tadashikagami144@gmail.com',3,'active','2025-06-09',NULL,'2025-11-22 09:57:14','2025-11-15 04:04:50'),(23,'bX84auycKNP60iP1BrZxXJom6fm2','Unknown Unknown','kennechi143@gmail.com',4,'active','2025-11-22',NULL,'2025-11-22 08:44:43','2025-11-22 08:44:43');


DROP TABLE IF EXISTS `view_staff`;
SET @saved_cs_client     = @@character_set_client;
 1 AS `user_id`,
 1 AS `uid`,
 1 AS `name`,
 1 AS `email`,
 1 AS `status`,
 1 AS `date_added`,
 1 AS `first_name`,
 1 AS `middle_initial`,
 1 AS `last_name`,
 1 AS `nickname`,
 1 AS `birthdate`,
 1 AS `gender`,
 1 AS `gender_other`,
 1 AS `mobile_number`,
 1 AS `city`,
 1 AS `facebook`,
 1 AS `twitter`,
 1 AS `instagram`,
 1 AS `tiktok`,
 1 AS `current_status`,
 1 AS `volunteer_reason`,
 1 AS `volunteer_frequency`,
 1 AS `user_role`,
 1 AS `age`,
 1 AS `full_name`*/;
SET character_set_client = @saved_cs_client;


DROP TABLE IF EXISTS `view_user_badges`;
SET @saved_cs_client     = @@character_set_client;
 1 AS `user_achievement_id`,
 1 AS `user_id`,
 1 AS `badge_code`,
 1 AS `achievement_name`,
 1 AS `achievement_description`,
 1 AS `achievement_icon`,
 1 AS `achievement_category`,
 1 AS `achievement_points`,
 1 AS `threshold_type`,
 1 AS `threshold_value`,
 1 AS `earned_date`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;


DROP TABLE IF EXISTS `view_volunteers`;
SET @saved_cs_client     = @@character_set_client;
 1 AS `user_id`,
 1 AS `uid`,
 1 AS `name`,
 1 AS `email`,
 1 AS `status`,
 1 AS `date_added`,
 1 AS `first_name`,
 1 AS `middle_initial`,
 1 AS `last_name`,
 1 AS `nickname`,
 1 AS `birthdate`,
 1 AS `gender`,
 1 AS `gender_other`,
 1 AS `mobile_number`,
 1 AS `city`,
 1 AS `facebook`,
 1 AS `twitter`,
 1 AS `instagram`,
 1 AS `tiktok`,
 1 AS `current_status`,
 1 AS `volunteer_reason`,
 1 AS `volunteer_frequency`,
 1 AS `user_role`,
 1 AS `age`,
 1 AS `full_name`*/;
SET character_set_client = @saved_cs_client;
-- =====================================================
-- Event Management System - Database Migration
-- Created: November 18, 2025
-- =====================================================

-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL COMMENT 'Unique identifier for the event',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM(
        'training',
        'community_service',
        'fundraising',
        'meeting',
        'social',
        'other'
    ) DEFAULT 'other',
    location VARCHAR(255),
    location_type ENUM('on_site', 'remote', 'hybrid') DEFAULT 'on_site',
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    max_participants INT DEFAULT NULL COMMENT 'NULL = unlimited',
    min_participants INT DEFAULT 0,
    registration_deadline DATETIME,
    status ENUM(
        'draft',
        'published',
        'ongoing',
        'completed',
        'cancelled',
        'archived'
    ) DEFAULT 'draft',
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL,
    archived_by_user_id INT NULL,
    image_url VARCHAR(500),
    tags JSON COMMENT 'Array of tags for filtering',
    requirements TEXT COMMENT 'Special requirements or prerequisites',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    INDEX idx_events_status (status),
    INDEX idx_events_start (start_datetime),
    INDEX idx_events_type (event_type),
    INDEX idx_events_created_by (created_by_user_id),
    INDEX idx_events_uid (uid),
    FOREIGN KEY (created_by_user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (archived_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Event Participants Table
CREATE TABLE IF NOT EXISTS event_participants (
    participant_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM(
        'registered',
        'waitlisted',
        'attended',
        'cancelled',
        'no_show'
    ) DEFAULT 'registered',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancellation_date TIMESTAMP NULL,
    attendance_marked_at TIMESTAMP NULL,
    attendance_marked_by INT NULL,
    notes TEXT COMMENT 'Admin notes or participant comments',
    UNIQUE KEY unique_event_participant (event_id, user_id),
    INDEX idx_participants_event (event_id),
    INDEX idx_participants_user (user_id),
    INDEX idx_participants_status (status),
    FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (attendance_marked_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Event Updates Table (for announcements/changes)
CREATE TABLE IF NOT EXISTS event_updates (
    update_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    posted_by_user_id INT NOT NULL,
    update_type ENUM(
        'announcement',
        'change',
        'reminder',
        'cancellation'
    ) DEFAULT 'announcement',
    title VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_updates_event (event_id),
    INDEX idx_updates_created (created_at DESC),
    FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE,
    FOREIGN KEY (posted_by_user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================
-- Seed Data
-- =====================================================

-- Insert sample events (assuming user_id 1 exists as admin)
INSERT INTO
    events (
        uid,
        title,
        description,
        event_type,
        location,
        location_type,
        start_datetime,
        end_datetime,
        max_participants,
        registration_deadline,
        status,
        created_by_user_id,
        image_url,
        tags,
        requirements,
        contact_email,
        contact_phone
    )
VALUES (
        UUID(),
        'Volunteer Orientation Training',
        'Comprehensive orientation for new volunteers covering organizational policies, safety procedures, and volunteer responsibilities.',
        'training',
        'Bagani Foundation Headquarters, Manila',
        'on_site',
        DATE_ADD(NOW(), INTERVAL 7 DAY),
        DATE_ADD(NOW(), INTERVAL 7 DAY) + INTERVAL 3 HOUR,
        30,
        DATE_ADD(NOW(), INTERVAL 5 DAY),
        'published',
        1,
        '/images/events/orientation.jpg',
        JSON_ARRAY(
            'orientation',
            'training',
            'new-volunteers'
        ),
        'No prior experience required. Please bring a valid ID.',
        'training@baganifoundation.org',
        '+63 912 345 6789'
    ),
    (
        UUID(),
        'Community Cleanup Drive',
        'Join us for a community cleanup initiative in partnership with local barangays. Help keep our neighborhoods clean and green!',
        'community_service',
        'Quezon City Memorial Circle',
        'on_site',
        DATE_ADD(NOW(), INTERVAL 14 DAY),
        DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 4 HOUR,
        50,
        DATE_ADD(NOW(), INTERVAL 12 DAY),
        'published',
        1,
        '/images/events/cleanup.jpg',
        JSON_ARRAY(
            'environment',
            'community',
            'cleanup'
        ),
        'Wear comfortable clothes and closed shoes. Gloves and materials will be provided.',
        'events@baganifoundation.org',
        '+63 912 345 6789'
    ),
    (
        UUID(),
        'Fundraising Gala Night',
        'Annual fundraising gala to support our education programs. Enjoy an evening of entertainment, dinner, and silent auction.',
        'fundraising',
        'The Peninsula Manila, Makati',
        'on_site',
        DATE_ADD(NOW(), INTERVAL 30 DAY),
        DATE_ADD(NOW(), INTERVAL 30 DAY) + INTERVAL 5 HOUR,
        200,
        DATE_ADD(NOW(), INTERVAL 25 DAY),
        'published',
        1,
        '/images/events/gala.jpg',
        JSON_ARRAY(
            'fundraising',
            'gala',
            'formal'
        ),
        'Formal attire required. Ticket includes dinner and entertainment.',
        'gala@baganifoundation.org',
        '+63 912 345 6789'
    ),
    (
        UUID(),
        'Monthly Volunteer Meeting',
        'Virtual monthly meeting to discuss ongoing projects, share updates, and plan upcoming activities.',
        'meeting',
        'Zoom Meeting (link will be sent)',
        'remote',
        DATE_ADD(NOW(), INTERVAL 3 DAY),
        DATE_ADD(NOW(), INTERVAL 3 DAY) + INTERVAL 2 HOUR,
        NULL,
        DATE_ADD(NOW(), INTERVAL 2 DAY),
        'published',
        1,
        '/images/events/meeting.jpg',
        JSON_ARRAY(
            'meeting',
            'virtual',
            'updates'
        ),
        'Zoom link will be sent 24 hours before the meeting.',
        'meetings@baganifoundation.org',
        NULL
    ),
    (
        UUID(),
        'Team Building Activity',
        'Fun team building activities for volunteers to strengthen bonds and improve collaboration.',
        'social',
        'Tagaytay Highlands Resort',
        'on_site',
        DATE_ADD(NOW(), INTERVAL 21 DAY),
        DATE_ADD(NOW(), INTERVAL 21 DAY) + INTERVAL 8 HOUR,
        40,
        DATE_ADD(NOW(), INTERVAL 18 DAY),
        'published',
        1,
        '/images/events/teambuilding.jpg',
        JSON_ARRAY(
            'social',
            'team-building',
            'recreation'
        ),
        'Transportation will be provided. Bring extra clothes and personal items.',
        'social@baganifoundation.org',
        '+63 912 345 6789'
    );
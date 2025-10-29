-- Add test notifications for Admin (kenbaylon143@gmail.com)
-- User ID: 6, Firebase UID: oAM2WQNVxUV0T3Z1p7akKcYejLW2

INSERT INTO
    notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    )
VALUES (
        6,
        '🎉 Welcome to Vaulteer!',
        'Thank you for joining our volunteer management system. Get started by exploring your dashboard and available features.',
        'info',
        FALSE,
        NOW() - INTERVAL 2 HOUR
    ),
    (
        6,
        '📋 New Task Assigned',
        'You have been assigned to the Community Cleanup Event this Saturday at 9 AM. Please confirm your attendance.',
        'task',
        FALSE,
        NOW() - INTERVAL 5 HOUR
    ),
    (
        6,
        '⚠️ Important Update',
        'New safety guidelines have been posted for all volunteers. Please review them before your next shift.',
        'alert',
        FALSE,
        NOW() - INTERVAL 1 HOUR
    ),
    (
        6,
        '✅ Application Approved',
        'Congratulations! Your volunteer application has been approved. Welcome to the team!',
        'success',
        TRUE,
        NOW() - INTERVAL 24 HOUR
    ),
    (
        6,
        '💬 New Message from Admin',
        'Sarah Johnson sent you a message: "Can you help with the food drive next week?" Click to reply.',
        'message',
        FALSE,
        NOW() - INTERVAL 3 HOUR
    ),
    (
        6,
        '🔔 Event Reminder',
        'Don''t forget: Volunteer orientation is tomorrow at 2 PM. Location: Community Center, Room 101.',
        'warning',
        FALSE,
        NOW() - INTERVAL 8 HOUR
    ),
    (
        6,
        '🔧 System Maintenance Notice',
        'Scheduled system maintenance on Sunday from 2-4 AM. The platform will be temporarily unavailable during this time.',
        'system',
        TRUE,
        NOW() - INTERVAL 48 HOUR
    );

-- Add test notifications for Volunteer (tadashikagami143@gmail.com)
-- User ID: 17, Firebase UID: qZ4icibN8jXQx8MnD1DFKpnsc6k1

INSERT INTO
    notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    )
VALUES (
        17,
        '🎉 Welcome to Vaulteer!',
        'Thank you for joining our volunteer management system. Get started by exploring your dashboard and available features.',
        'info',
        FALSE,
        NOW() - INTERVAL 2 HOUR
    ),
    (
        17,
        '📋 New Task Assigned',
        'You have been assigned to the Community Cleanup Event this Saturday at 9 AM. Please confirm your attendance.',
        'task',
        FALSE,
        NOW() - INTERVAL 5 HOUR
    ),
    (
        17,
        '⚠️ Important Update',
        'New safety guidelines have been posted for all volunteers. Please review them before your next shift.',
        'alert',
        FALSE,
        NOW() - INTERVAL 1 HOUR
    ),
    (
        17,
        '✅ Application Approved',
        'Congratulations! Your volunteer application has been approved. Welcome to the team!',
        'success',
        TRUE,
        NOW() - INTERVAL 24 HOUR
    ),
    (
        17,
        '💬 New Message from Admin',
        'Sarah Johnson sent you a message: "Can you help with the food drive next week?" Click to reply.',
        'message',
        FALSE,
        NOW() - INTERVAL 3 HOUR
    ),
    (
        17,
        '🔔 Event Reminder',
        'Don''t forget: Volunteer orientation is tomorrow at 2 PM. Location: Community Center, Room 101.',
        'warning',
        FALSE,
        NOW() - INTERVAL 8 HOUR
    ),
    (
        17,
        '🔧 System Maintenance Notice',
        'Scheduled system maintenance on Sunday from 2-4 AM. The platform will be temporarily unavailable during this time.',
        'system',
        TRUE,
        NOW() - INTERVAL 48 HOUR
    );

-- Verify the insertions
SELECT
    u.name,
    u.email,
    COUNT(*) as total_notifications,
    SUM(
        CASE
            WHEN n.is_read = FALSE THEN 1
            ELSE 0
        END
    ) as unread_count
FROM notifications n
    JOIN users u ON n.user_id = u.user_id
WHERE
    u.user_id IN (6, 17)
GROUP BY
    u.user_id,
    u.name,
    u.email;
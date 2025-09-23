-- phpMyAdmin SQL Dump - MySQL 8.0+ Compatible Version
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 23, 2025 at 02:07 PM
-- Server version: 10.4.32-MariaDB (Modified for MySQL 8.0+)
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

START TRANSACTION;

SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!40101 SET NAMES utf8mb4 */
;

--
-- Database: `vaulteer_db`
--

CREATE DATABASE IF NOT EXISTS `vaulteer_db`;

USE `vaulteer_db`;

-- --------------------------------------------------------

--
-- Table structure for table `applicants`
--

CREATE TABLE `applicants` (
    `applicant_id` int(11) NOT NULL,
    `user_id` int(11) NOT NULL,
    `status_id` int(11) NOT NULL,
    `application_date` date NOT NULL DEFAULT(CURRENT_DATE)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `applicants`
--

INSERT INTO
    `applicants` (
        `applicant_id`,
        `user_id`,
        `status_id`,
        `application_date`
    )
VALUES (1, 1, 1, '2025-06-08'),
    (2, 2, 2, '2025-06-07'),
    (3, 3, 3, '2025-06-06'),
    (4, 4, 4, '2025-06-05'),
    (5, 5, 2, '2025-06-04'),
    (6, 6, 1, '2025-06-08'),
    (7, 6, 1, '2025-06-09'),
    (8, 17, 1, '2025-06-09'),
    (9, 18, 1, '2025-06-09'),
    (10, 19, 1, '2025-06-09');

-- --------------------------------------------------------

--
-- Table structure for table `application_statuses`
--

CREATE TABLE `application_statuses` (
    `status_id` int(11) NOT NULL,
    `status_name` enum(
        'pending',
        'under_review',
        'interview_scheduled',
        'rejected',
        'approved'
    ) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `application_statuses`
--

INSERT INTO
    `application_statuses` (`status_id`, `status_name`)
VALUES (1, 'pending'),
    (2, 'under_review'),
    (3, 'interview_scheduled'),
    (4, 'rejected'),
    (5, 'approved');

-- --------------------------------------------------------

--
-- Table structure for table `days`
--

CREATE TABLE `days` (
    `day_id` int(11) NOT NULL,
    `day_name` enum(
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
    ) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `days`
--

INSERT INTO
    `days` (`day_id`, `day_name`)
VALUES (1, 'Monday'),
    (2, 'Tuesday'),
    (3, 'Wednesday'),
    (4, 'Thursday'),
    (5, 'Friday'),
    (6, 'Saturday'),
    (7, 'Sunday');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
    `role_id` int(11) NOT NULL,
    `role` enum(
        'admin',
        'staff',
        'volunteer',
        'applicant'
    ) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO
    `roles` (`role_id`, `role`)
VALUES (1, 'admin'),
    (2, 'staff'),
    (3, 'volunteer'),
    (4, 'applicant');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
    `user_id` int(11) NOT NULL,
    `uid` varchar(128) NOT NULL,
    `name` varchar(128) NOT NULL,
    `email` varchar(128) NOT NULL,
    `role_id` int(11) NOT NULL,
    `status` enum(
        'active',
        'pending',
        'inactive'
    ) NOT NULL DEFAULT 'active',
    `date_added` date DEFAULT(CURRENT_DATE)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO
    `users` (
        `user_id`,
        `uid`,
        `name`,
        `email`,
        `role_id`,
        `status`,
        `date_added`
    )
VALUES (
        1,
        'applicant001',
        'applicant001',
        'applicant001@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        2,
        'applicant002',
        'applicant002',
        'applicant002@email.com',
        3,
        'active',
        '2025-06-08'
    ),
    (
        3,
        'applicant003',
        'applicant003',
        'applicant003@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        4,
        'applicant004',
        'applicant004',
        'applicant004@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        5,
        'applicant005',
        'applicant005',
        'applicant005@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        6,
        'oAM2WQNVxUV0T3Z1p7akKcYejLW2',
        'kenbaylon143',
        'kenbaylon143@gmail.com',
        1,
        'active',
        '2025-06-08'
    ),
    (
        7,
        'volunteer-uid-1',
        'volunteer1',
        'volunteer1@example.com',
        3,
        'active',
        '2025-05-06'
    ),
    (
        8,
        'volunteer-uid-2',
        'volunteer2',
        'volunteer2@example.com',
        3,
        'inactive',
        '2025-05-13'
    ),
    (
        9,
        'volunteer-uid-3',
        'volunteer3',
        'volunteer3@example.com',
        3,
        'active',
        '2025-04-24'
    ),
    (
        10,
        'volunteer-uid-4',
        'volunteer4',
        'volunteer4@example.com',
        3,
        'inactive',
        '2025-06-02'
    ),
    (
        11,
        'volunteer-uid-5',
        'volunteer5',
        'volunteer5@example.com',
        3,
        'active',
        '2025-06-08'
    ),
    (
        12,
        'staff-uid-1',
        'staff1',
        'staff1@example.com',
        2,
        'inactive',
        '2025-04-17'
    ),
    (
        13,
        'staff-uid-2',
        'staff2',
        'staff2@example.com',
        2,
        'inactive',
        '2025-05-07'
    ),
    (
        14,
        'staff-uid-3',
        'staff3',
        'staff3@example.com',
        2,
        'active',
        '2025-02-19'
    ),
    (
        15,
        'staff-uid-4',
        'staff4',
        'staff4@example.com',
        2,
        'active',
        '2025-06-03'
    ),
    (
        16,
        'staff-uid-5',
        'staff5',
        'staff5@example.com',
        2,
        'active',
        '2025-06-01'
    ),
    (
        17,
        'qZ4icibN8jXQx8MnD1DFKpnsc6k1',
        'tadashikagami143',
        'tadashikagami143@gmail.com',
        3,
        'active',
        '2025-06-09'
    ),
    (
        18,
        'bX84auycKNP60iP1BrZxXJom6fm2',
        'kennechi143',
        'kennechi143@gmail.com',
        3,
        'active',
        '2025-06-09'
    ),
    (
        19,
        '0CeTEVEC4ifpE1xKmxi6IUMxM0B2',
        'tadashikagami144',
        'tadashikagami144@gmail.com',
        4,
        'active',
        '2025-06-09'
    );

-- --------------------------------------------------------

--
-- Table structure for table `user_available_days`
--

CREATE TABLE `user_available_days` (
    `profile_id` int(11) NOT NULL,
    `day_id` int(11) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_available_days`
--

INSERT INTO
    `user_available_days` (`profile_id`, `day_id`)
VALUES (6, 1),
    (6, 3),
    (6, 4),
    (6, 5),
    (17, 1),
    (17, 3),
    (17, 5),
    (18, 1),
    (18, 3),
    (18, 5),
    (19, 1),
    (19, 3),
    (19, 4),
    (19, 5),
    (20, 1),
    (20, 3),
    (20, 4),
    (20, 5);

-- --------------------------------------------------------

--
-- Table structure for table `user_other_roles`
--

CREATE TABLE `user_other_roles` (
    `profile_id` int(11) NOT NULL,
    `other_role` varchar(128) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_profiles`
--

CREATE TABLE `user_profiles` (
    `profile_id` int(11) NOT NULL,
    `user_id` int(11) NOT NULL,
    `first_name` varchar(64) NOT NULL,
    `middle_initial` char(1) DEFAULT NULL,
    `last_name` varchar(64) NOT NULL,
    `nickname` varchar(64) NOT NULL,
    `birthdate` date NOT NULL,
    `gender` enum(
        'Male',
        'Female',
        'Prefer not to say',
        'Other'
    ) NOT NULL,
    `gender_other` varchar(64) DEFAULT NULL,
    `consent` enum('agree', 'disagree') NOT NULL,
    `mobile_number` varchar(32) NOT NULL,
    `city` varchar(128) NOT NULL,
    `facebook` varchar(256) DEFAULT NULL,
    `twitter` varchar(256) DEFAULT NULL,
    `instagram` varchar(256) DEFAULT NULL,
    `tiktok` varchar(256) DEFAULT NULL,
    `current_status` enum(
        'Working Professional',
        'Student',
        'Not Applicable'
    ) NOT NULL,
    `declaration_commitment` enum('agree', 'disagree') NOT NULL,
    `volunteer_reason` text NOT NULL,
    `volunteer_frequency` enum(
        'Always',
        'Often',
        'Seldom',
        'Rarely'
    ) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_profiles`
--

INSERT INTO
    `user_profiles` (
        `profile_id`,
        `user_id`,
        `first_name`,
        `middle_initial`,
        `last_name`,
        `nickname`,
        `birthdate`,
        `gender`,
        `gender_other`,
        `consent`,
        `mobile_number`,
        `city`,
        `facebook`,
        `twitter`,
        `instagram`,
        `tiktok`,
        `current_status`,
        `declaration_commitment`,
        `volunteer_reason`,
        `volunteer_frequency`
    )
VALUES (
        1,
        1,
        'Alice',
        'M',
        'Garcia',
        'Ali',
        '2002-02-02',
        'Female',
        NULL,
        'agree',
        '09171234561',
        'Bacolod',
        'https://facebook.com/alice',
        NULL,
        NULL,
        NULL,
        'Student',
        'agree',
        'I want to help.',
        'Always'
    ),
    (
        2,
        2,
        'Bob',
        'K',
        'Diaz',
        'Bobby',
        '1999-03-03',
        'Male',
        NULL,
        'agree',
        '09171234562',
        'Talisay',
        NULL,
        'https://twitter.com/bob',
        NULL,
        NULL,
        'Working Professional',
        'agree',
        'I want to serve.',
        'Often'
    ),
    (
        3,
        3,
        'Carla',
        NULL,
        'Lim',
        'Carl',
        '2001-04-04',
        'Female',
        NULL,
        'agree',
        '09171234563',
        'Silay',
        NULL,
        NULL,
        'https://instagram.com/carla',
        NULL,
        'Student',
        'agree',
        'Giving back to the community.',
        'Seldom'
    ),
    (
        4,
        4,
        'David',
        'J',
        'Lee',
        'Dave',
        '1998-05-05',
        'Male',
        NULL,
        'agree',
        '09171234564',
        'Bago',
        NULL,
        NULL,
        NULL,
        'https://tiktok.com/@david',
        'Working Professional',
        'agree',
        'Support local initiatives.',
        'Rarely'
    ),
    (
        5,
        5,
        'Ella',
        NULL,
        'Tan',
        'El',
        '2000-06-06',
        'Female',
        NULL,
        'agree',
        '09171234565',
        'La Carlota',
        'https://facebook.com/ella',
        NULL,
        NULL,
        NULL,
        'Student',
        'agree',
        'Make a difference.',
        'Always'
    ),
    (
        6,
        6,
        'Ken Francen',
        'G',
        'Baylon',
        'gtgt',
        '0006-03-07',
        'Male',
        NULL,
        'agree',
        '645646',
        'grg',
        '',
        '',
        '',
        '',
        'Not Applicable',
        'agree',
        'fefgrg',
        'Rarely'
    ),
    (
        7,
        7,
        'Alice',
        'M',
        'Garcia',
        'Ali',
        '1995-03-10',
        'Female',
        NULL,
        'agree',
        '09170010001',
        'Manila',
        'fb.com/alice',
        NULL,
        NULL,
        NULL,
        'Working Professional',
        'agree',
        'Wants to help community',
        'Often'
    ),
    (
        8,
        8,
        'Bob',
        'A',
        'Nguyen',
        'Bobby',
        '1990-07-22',
        'Male',
        NULL,
        'agree',
        '09170010002',
        'Quezon City',
        NULL,
        'twitter.com/bob',
        NULL,
        NULL,
        'Student',
        'agree',
        'Gain experience',
        'Always'
    ),
    (
        9,
        9,
        'Carol',
        NULL,
        'Smith',
        'Caz',
        '1998-11-15',
        'Female',
        NULL,
        'agree',
        '09170010003',
        'Cebu',
        NULL,
        NULL,
        'instagram.com/carol',
        NULL,
        'Working Professional',
        'agree',
        'Meet new people',
        'Seldom'
    ),
    (
        10,
        10,
        'David',
        'J',
        'Lee',
        'Dave',
        '1992-02-05',
        'Male',
        NULL,
        'agree',
        '09170010004',
        'Davao',
        NULL,
        NULL,
        NULL,
        'tiktok.com/@david',
        'Student',
        'agree',
        'Improve skills',
        'Often'
    ),
    (
        11,
        11,
        'Eva',
        NULL,
        'Martinez',
        'Evie',
        '1996-12-30',
        'Female',
        NULL,
        'agree',
        '09170010005',
        'Baguio',
        'fb.com/eva',
        NULL,
        NULL,
        NULL,
        'Not Applicable',
        'agree',
        'Give back to society',
        'Rarely'
    ),
    (
        12,
        12,
        'Frank',
        NULL,
        'Hernandez',
        'Franky',
        '1985-01-12',
        'Male',
        NULL,
        'agree',
        '09170020001',
        'Pasig',
        NULL,
        NULL,
        NULL,
        NULL,
        'Working Professional',
        'agree',
        'Organization growth',
        'Often'
    ),
    (
        13,
        13,
        'Grace',
        'E',
        'Kim',
        'Gracie',
        '1988-08-17',
        'Female',
        NULL,
        'agree',
        '09170020002',
        'Makati',
        NULL,
        NULL,
        NULL,
        NULL,
        'Not Applicable',
        'agree',
        'Support volunteers',
        'Seldom'
    ),
    (
        14,
        14,
        'Hank',
        NULL,
        'Patel',
        'Hank',
        '1991-05-25',
        'Male',
        NULL,
        'agree',
        '09170020003',
        'Taguig',
        NULL,
        NULL,
        NULL,
        NULL,
        'Working Professional',
        'agree',
        'Team management',
        'Often'
    ),
    (
        15,
        15,
        'Ivy',
        'M',
        'Brown',
        'Ives',
        '1993-09-30',
        'Female',
        NULL,
        'agree',
        '09170020004',
        'Marikina',
        NULL,
        NULL,
        NULL,
        NULL,
        'Student',
        'agree',
        'Learn leadership',
        'Always'
    ),
    (
        16,
        16,
        'Jake',
        NULL,
        'Wilson',
        'Jay',
        '1987-04-18',
        'Male',
        NULL,
        'agree',
        '09170020005',
        'Caloocan',
        NULL,
        NULL,
        NULL,
        NULL,
        'Working Professional',
        'agree',
        'Enhance operations',
        'Rarely'
    ),
    (
        17,
        6,
        'Rica Mae',
        '',
        'Yburan',
        'Rica',
        '2000-03-23',
        'Female',
        NULL,
        'agree',
        '09992323393',
        'Bacolod City',
        '',
        '',
        '',
        '',
        'Student',
        'agree',
        'na',
        'Seldom'
    ),
    (
        18,
        17,
        'Rica Mae',
        '',
        'Yburan',
        'Rica',
        '2000-03-23',
        'Female',
        NULL,
        'agree',
        '09992323393',
        'Bacolod City',
        '',
        '',
        '',
        '',
        'Student',
        'agree',
        'na',
        'Seldom'
    ),
    (
        19,
        18,
        'Abelada',
        '',
        'Alyana Kate',
        'Yan',
        '0006-03-07',
        'Female',
        NULL,
        'agree',
        '09123433434',
        'Bacolod City',
        '',
        '',
        '',
        '',
        'Not Applicable',
        'agree',
        'fefgrg',
        'Seldom'
    ),
    (
        20,
        19,
        'Maea Argeline',
        '',
        'Canto',
        'Maea',
        '2003-03-07',
        'Female',
        NULL,
        'agree',
        '09123433476',
        'Bacolod City',
        '',
        '',
        '',
        '',
        'Student',
        'agree',
        'N/A',
        'Seldom'
    );

-- --------------------------------------------------------

--
-- Table structure for table `user_profile_roles`
--

CREATE TABLE `user_profile_roles` (
    `profile_id` int(11) NOT NULL,
    `role_id` int(11) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_profile_roles`
--

INSERT INTO
    `user_profile_roles` (`profile_id`, `role_id`)
VALUES (6, 5),
    (17, 2),
    (17, 3),
    (17, 5),
    (18, 2),
    (18, 3),
    (18, 5),
    (19, 2),
    (19, 4),
    (19, 5),
    (20, 2),
    (20, 4),
    (20, 5);

-- --------------------------------------------------------

--
-- Table structure for table `user_profile_trainings`
--

CREATE TABLE `user_profile_trainings` (
    `profile_id` int(11) NOT NULL,
    `training_id` int(11) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_profile_trainings`
--

INSERT INTO
    `user_profile_trainings` (`profile_id`, `training_id`)
VALUES (6, 2),
    (17, 2),
    (17, 3),
    (18, 2),
    (18, 3),
    (19, 2),
    (20, 2);

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
    `role_id` int(11) NOT NULL,
    `role_name` enum(
        'Events & Sponsorships',
        'Communications',
        'Clinic Operations',
        'Organization Development',
        'Information Technology',
        'Other'
    ) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO
    `user_roles` (`role_id`, `role_name`)
VALUES (1, 'Events & Sponsorships'),
    (2, 'Communications'),
    (3, 'Clinic Operations'),
    (4, 'Organization Development'),
    (5, 'Information Technology'),
    (6, 'Other');

-- --------------------------------------------------------

--
-- Table structure for table `user_school_days`
--

CREATE TABLE `user_school_days` (
    `profile_id` int(11) NOT NULL,
    `day_id` int(11) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_school_days`
--

INSERT INTO
    `user_school_days` (`profile_id`, `day_id`)
VALUES (17, 1),
    (17, 2),
    (17, 3),
    (17, 4),
    (17, 5),
    (18, 1),
    (18, 2),
    (18, 3),
    (18, 4),
    (18, 5),
    (20, 1),
    (20, 2),
    (20, 3),
    (20, 4),
    (20, 5);

-- --------------------------------------------------------

--
-- Table structure for table `user_student_profile`
--

CREATE TABLE `user_student_profile` (
    `student_profile_id` int(11) NOT NULL,
    `profile_id` int(11) NOT NULL,
    `school` varchar(128) NOT NULL,
    `course` varchar(128) NOT NULL,
    `graduation` varchar(16) NOT NULL,
    `student_other_skills` text NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_student_profile`
--

INSERT INTO
    `user_student_profile` (
        `student_profile_id`,
        `profile_id`,
        `school`,
        `course`,
        `graduation`,
        `student_other_skills`
    )
VALUES (
        1,
        1,
        'Negros University',
        'BS Computer Science',
        '2025',
        'Web development, leadership'
    ),
    (
        2,
        3,
        'Bacolod State College',
        'BS Education',
        '2024',
        'Teaching, public speaking'
    ),
    (
        3,
        5,
        'La Carlota College',
        'BS Nursing',
        '2026',
        'Peer support, health seminars'
    ),
    (
        4,
        17,
        'STI West Negros University',
        'BSIT',
        '2026',
        'Na'
    ),
    (
        5,
        18,
        'STI West Negros University',
        'BSIT',
        '2026',
        'Na'
    ),
    (
        6,
        20,
        'STI West Negros University',
        'BSIT',
        '2026',
        'N/A'
    );

-- --------------------------------------------------------

--
-- Table structure for table `user_trainings`
--

CREATE TABLE `user_trainings` (
    `training_id` int(11) NOT NULL,
    `training_name` enum(
        'None in the list',
        'Peer Counseling',
        'HIV Testing',
        'Community-Based HIV Screening',
        'Case Management / Life Coaching'
    ) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_trainings`
--

INSERT INTO
    `user_trainings` (
        `training_id`,
        `training_name`
    )
VALUES (1, 'None in the list'),
    (2, 'Peer Counseling'),
    (3, 'HIV Testing'),
    (
        4,
        'Community-Based HIV Screening'
    ),
    (
        5,
        'Case Management / Life Coaching'
    );

-- --------------------------------------------------------

--
-- Table structure for table `user_working_days`
--

CREATE TABLE `user_working_days` (
    `profile_id` int(11) NOT NULL,
    `day_id` int(11) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_work_profile`
--

CREATE TABLE `user_work_profile` (
    `work_profile_id` int(11) NOT NULL,
    `profile_id` int(11) NOT NULL,
    `position` varchar(128) NOT NULL,
    `industry` varchar(128) NOT NULL,
    `company` varchar(128) DEFAULT NULL,
    `work_shift` enum(
        'Day shift',
        'Mid shift',
        'Night shift',
        'Not Applicable'
    ) NOT NULL,
    `work_other_skills` text NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `user_work_profile`
--

INSERT INTO
    `user_work_profile` (
        `work_profile_id`,
        `profile_id`,
        `position`,
        `industry`,
        `company`,
        `work_shift`,
        `work_other_skills`
    )
VALUES (
        1,
        2,
        'Engineer',
        'Technology',
        'TechCorp',
        'Day shift',
        'Programming, teamwork'
    ),
    (
        2,
        4,
        'Nurse',
        'Healthcare',
        'City Hospital',
        'Night shift',
        'First Aid, community health'
    );

--
-- Indexes for dumped tables
--

--
-- Indexes for table `applicants`
--
ALTER TABLE `applicants`
ADD PRIMARY KEY (`applicant_id`),
ADD KEY `user_id` (`user_id`),
ADD KEY `status_id` (`status_id`);

--
-- Indexes for table `application_statuses`
--
ALTER TABLE `application_statuses`
ADD PRIMARY KEY (`status_id`),
ADD UNIQUE KEY `status_name` (`status_name`);

--
-- Indexes for table `days`
--
ALTER TABLE `days`
ADD PRIMARY KEY (`day_id`),
ADD UNIQUE KEY `day_name` (`day_name`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
ADD PRIMARY KEY (`role_id`),
ADD UNIQUE KEY `role` (`role`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
ADD PRIMARY KEY (`user_id`),
ADD UNIQUE KEY `uid` (`uid`),
ADD UNIQUE KEY `email` (`email`),
ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `user_available_days`
--
ALTER TABLE `user_available_days`
ADD PRIMARY KEY (`profile_id`, `day_id`),
ADD KEY `day_id` (`day_id`);

--
-- Indexes for table `user_other_roles`
--
ALTER TABLE `user_other_roles` ADD PRIMARY KEY (`profile_id`);

--
-- Indexes for table `user_profiles`
--
ALTER TABLE `user_profiles`
ADD PRIMARY KEY (`profile_id`),
ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `user_profile_roles`
--
ALTER TABLE `user_profile_roles`
ADD PRIMARY KEY (`profile_id`, `role_id`),
ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `user_profile_trainings`
--
ALTER TABLE `user_profile_trainings`
ADD PRIMARY KEY (`profile_id`, `training_id`),
ADD KEY `training_id` (`training_id`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
ADD PRIMARY KEY (`role_id`),
ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `user_school_days`
--
ALTER TABLE `user_school_days`
ADD PRIMARY KEY (`profile_id`, `day_id`),
ADD KEY `day_id` (`day_id`);

--
-- Indexes for table `user_student_profile`
--
ALTER TABLE `user_student_profile`
ADD PRIMARY KEY (`student_profile_id`),
ADD KEY `profile_id` (`profile_id`);

--
-- Indexes for table `user_trainings`
--
ALTER TABLE `user_trainings`
ADD PRIMARY KEY (`training_id`),
ADD UNIQUE KEY `training_name` (`training_name`);

--
-- Indexes for table `user_working_days`
--
ALTER TABLE `user_working_days`
ADD PRIMARY KEY (`profile_id`, `day_id`),
ADD KEY `day_id` (`day_id`);

--
-- Indexes for table `user_work_profile`
--
ALTER TABLE `user_work_profile`
ADD PRIMARY KEY (`work_profile_id`),
ADD KEY `profile_id` (`profile_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `applicants`
--
ALTER TABLE `applicants`
MODIFY `applicant_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- AUTO_INCREMENT for table `application_statuses`
--
ALTER TABLE `application_statuses`
MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 9;

--
-- AUTO_INCREMENT for table `days`
--
ALTER TABLE `days`
MODIFY `day_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 8;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 20;

--
-- AUTO_INCREMENT for table `user_profiles`
--
ALTER TABLE `user_profiles`
MODIFY `profile_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 21;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 7;

--
-- AUTO_INCREMENT for table `user_student_profile`
--
ALTER TABLE `user_student_profile`
MODIFY `student_profile_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 7;

--
-- AUTO_INCREMENT for table `user_trainings`
--
ALTER TABLE `user_trainings`
MODIFY `training_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 6;

--
-- AUTO_INCREMENT for table `user_work_profile`
--
ALTER TABLE `user_work_profile`
MODIFY `work_profile_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applicants`
--
ALTER TABLE `applicants`
ADD CONSTRAINT `applicants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
ADD CONSTRAINT `applicants_ibfk_2` FOREIGN KEY (`status_id`) REFERENCES `application_statuses` (`status_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);

--
-- Constraints for table `user_available_days`
--
ALTER TABLE `user_available_days`
ADD CONSTRAINT `user_available_days_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
ADD CONSTRAINT `user_available_days_ibfk_2` FOREIGN KEY (`day_id`) REFERENCES `days` (`day_id`);

--
-- Constraints for table `user_other_roles`
--
ALTER TABLE `user_other_roles`
ADD CONSTRAINT `user_other_roles_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`);

--
-- Constraints for table `user_profiles`
--
ALTER TABLE `user_profiles`
ADD CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_profile_roles`
--
ALTER TABLE `user_profile_roles`
ADD CONSTRAINT `user_profile_roles_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
ADD CONSTRAINT `user_profile_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`role_id`);

--
-- Constraints for table `user_profile_trainings`
--
ALTER TABLE `user_profile_trainings`
ADD CONSTRAINT `user_profile_trainings_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
ADD CONSTRAINT `user_profile_trainings_ibfk_2` FOREIGN KEY (`training_id`) REFERENCES `user_trainings` (`training_id`);

--
-- Constraints for table `user_school_days`
--
ALTER TABLE `user_school_days`
ADD CONSTRAINT `user_school_days_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
ADD CONSTRAINT `user_school_days_ibfk_2` FOREIGN KEY (`day_id`) REFERENCES `days` (`day_id`);

--
-- Constraints for table `user_student_profile`
--
ALTER TABLE `user_student_profile`
ADD CONSTRAINT `user_student_profile_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`);

--
-- Constraints for table `user_working_days`
--
ALTER TABLE `user_working_days`
ADD CONSTRAINT `user_working_days_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`),
ADD CONSTRAINT `user_working_days_ibfk_2` FOREIGN KEY (`day_id`) REFERENCES `days` (`day_id`);

--
-- Constraints for table `user_work_profile`
--
ALTER TABLE `user_work_profile`
ADD CONSTRAINT `user_work_profile_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`profile_id`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;
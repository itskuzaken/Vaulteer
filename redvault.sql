-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 12, 2025 at 01:40 AM
-- Server version: 10.4.32-MariaDB
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
-- Database: `redvault_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
    `user_id` int(11) NOT NULL,
    `uid` varchar(128) NOT NULL,
    `email` varchar(128) NOT NULL,
    `role_id` int(11) NOT NULL,
    `status` enum(
        'active',
        'pending',
        'inactive'
    ) NOT NULL DEFAULT 'active',
    `date_added` date DEFAULT curdate()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO
    `users` (
        `user_id`,
        `uid`,
        `email`,
        `role_id`,
        `status`,
        `date_added`
    )
VALUES (
        1,
        'applicant001',
        'applicant001@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        2,
        'applicant002',
        'applicant002@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        3,
        'applicant003',
        'applicant003@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        4,
        'applicant004',
        'applicant004@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        5,
        'applicant005',
        'applicant005@email.com',
        4,
        'active',
        '2025-06-08'
    ),
    (
        6,
        'oAM2WQNVxUV0T3Z1p7akKcYejLW2',
        'kenbaylon143@gmail.com',
        1,
        'active',
        '2025-06-08'
    ),
    (
        7,
        'volunteer-uid-1',
        'volunteer1@example.com',
        3,
        'active',
        '2025-05-06'
    ),
    (
        8,
        'volunteer-uid-2',
        'volunteer2@example.com',
        3,
        'inactive',
        '2025-05-13'
    ),
    (
        9,
        'volunteer-uid-3',
        'volunteer3@example.com',
        3,
        'active',
        '2025-04-24'
    ),
    (
        10,
        'volunteer-uid-4',
        'volunteer4@example.com',
        3,
        'inactive',
        '2025-06-02'
    ),
    (
        11,
        'volunteer-uid-5',
        'volunteer5@example.com',
        3,
        'active',
        '2025-06-08'
    ),
    (
        12,
        'staff-uid-1',
        'staff1@example.com',
        2,
        'inactive',
        '2025-04-17'
    ),
    (
        13,
        'staff-uid-2',
        'staff2@example.com',
        2,
        'inactive',
        '2025-05-07'
    ),
    (
        14,
        'staff-uid-3',
        'staff3@example.com',
        2,
        'active',
        '2025-02-19'
    ),
    (
        15,
        'staff-uid-4',
        'staff4@example.com',
        2,
        'active',
        '2025-06-03'
    ),
    (
        16,
        'staff-uid-5',
        'staff5@example.com',
        2,
        'active',
        '2025-06-01'
    ),
    (
        17,
        'qZ4icibN8jXQx8MnD1DFKpnsc6k1',
        'tadashikagami143@gmail.com',
        4,
        'active',
        '2025-06-09'
    ),
    (
        18,
        'bX84auycKNP60iP1BrZxXJom6fm2',
        'kennechi143@gmail.com',
        3,
        'active',
        '2025-06-09'
    ),
    (
        19,
        '0CeTEVEC4ifpE1xKmxi6IUMxM0B2',
        'tadashikagami144@gmail.com',
        4,
        'active',
        '2025-06-09'
    );

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
ADD PRIMARY KEY (`user_id`),
ADD UNIQUE KEY `uid` (`uid`),
ADD UNIQUE KEY `email` (`email`),
ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 20;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `users`
--
ALTER TABLE `users`
ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;
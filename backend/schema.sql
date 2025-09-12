-- Active: 1741790363851@@127.0.0.1@3306@vaulteer_db
-- Roles table

CREATE DATABASE IF NOT EXISTS vaulteer_db;

USE vaulteer_db;

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(32) NOT NULL UNIQUE
);

-- Users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(128) NOT NULL UNIQUE, -- Firebase UID
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    role_id INT NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    date_added DATE,
    FOREIGN KEY (role_id) REFERENCES roles (role_id)
);

-- Example roles
INSERT INTO
    roles (role)
VALUES ('admin'),
    ('staff'),
    ('volunteer'),
    ('applicant');

-- Example users
INSERT INTO
    users (
        uid,
        name,
        email,
        role_id,
        status,
        date_added
    )
VALUES (
        'firebase-uid-admin',
        'Alice Admin',
        'alice@admin.com',
        1,
        'active',
        CURDATE()
    ),
    (
        'firebase-uid-staff',
        'Bob Staff',
        'bob@staff.com',
        2,
        'active',
        CURDATE()
    ),
    (
        'firebase-uid-vol',
        'Carol Volunteer',
        'carol@vol.com',
        3,
        'active',
        CURDATE()
    ),
    (
        'firebase-uid-app',
        'Dave Applicant',
        'dave@app.com',
        4,
        'pending',
        CURDATE()
    );

-- Applicant table
CREATE TABLE Applicants (
    applicant_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    application_status VARCHAR(50) DEFAULT 'pending',
    application_date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (user_id) REFERENCES Users (user_id)
);

INSERT INTO
    users (
        uid,
        name,
        email,
        role_id,
        status,
        date_added
    )
VALUES (
        'UID001',
        'John Doe',
        'johndoe@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID002',
        'Jane Smith',
        'janesmith@gmail.com',
        1,
        'active',
        NOW()
    ),
    (
        'UID003',
        'Michael Brown',
        'michaelbrown@gmail.com',
        2,
        'inactive',
        NOW()
    ),
    (
        'UID004',
        'Emily Johnson',
        'emilyjohnson@gmail.com',
        3,
        'active',
        NOW()
    ),
    (
        'UID005',
        'Chris Evans',
        'chrisevans@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID006',
        'Sarah Miller',
        'sarahmiller@gmail.com',
        2,
        'inactive',
        NOW()
    ),
    (
        'UID007',
        'David Wilson',
        'davidwilson@gmail.com',
        1,
        'active',
        NOW()
    ),
    (
        'UID008',
        'Olivia Taylor',
        'oliviataylor@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID009',
        'Daniel Anderson',
        'danielanderson@gmail.com',
        3,
        'active',
        NOW()
    ),
    (
        'UID010',
        'Sophia Thomas',
        'sophiathomas@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID011',
        'James Moore',
        'jamesmoore@gmail.com',
        2,
        'inactive',
        NOW()
    ),
    (
        'UID012',
        'Mia Martin',
        'miamartin@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID013',
        'William Lee',
        'williamlee@gmail.com',
        1,
        'active',
        NOW()
    ),
    (
        'UID014',
        'Ava Perez',
        'avaperez@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID015',
        'Benjamin Hall',
        'benjaminhall@gmail.com',
        3,
        'inactive',
        NOW()
    ),
    (
        'UID016',
        'Ella White',
        'ellawhite@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID017',
        'Henry Scott',
        'henryscott@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID018',
        'Grace Harris',
        'graceharris@gmail.com',
        1,
        'active',
        NOW()
    ),
    (
        'UID019',
        'Liam Adams',
        'liamadams@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID020',
        'Chloe Walker',
        'chloewalker@gmail.com',
        3,
        'active',
        NOW()
    );

-- Insert 10 new users (who are applicants)
INSERT INTO
    users (
        uid,
        name,
        email,
        role_id,
        status,
        date_added
    )
VALUES (
        'UID021',
        'Alice Carter',
        'alicecarter@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID022',
        'Brian Fisher',
        'brianfisher@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID023',
        'Catherine Gray',
        'catherinegray@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID024',
        'Derek Hunt',
        'derekhunt@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID025',
        'Ella James',
        'ellajames@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID026',
        'Frankie King',
        'frankieking@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID027',
        'Georgia Lane',
        'georgialane@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID028',
        'Harold Nash',
        'haroldnash@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID029',
        'Isabelle Owens',
        'isabelleowens@gmail.com',
        2,
        'active',
        NOW()
    ),
    (
        'UID030',
        'Jackie Price',
        'jackieprice@gmail.com',
        2,
        'active',
        NOW()
    );

-- Insert them into applicants table using their user_ids
-- This assumes MySQL 8+ with LAST_INSERT_ID() + OFFSET trick
INSERT INTO
    applicants (
        user_id,
        application_status,
        application_date
    )
SELECT user_id, 'pending', NOW()
FROM users
WHERE
    uid IN (
        'UID021',
        'UID022',
        'UID023',
        'UID024',
        'UID025',
        'UID026',
        'UID027',
        'UID028',
        'UID029',
        'UID030'
    );
INSERT INTO users VALUES
-- password is "123Ab!"
    ('user1', '$2b$12$QHVPeXc1U1/loLbNE92d0uTk8M61m0Mcv5aHVqw9AEtckiDxdYpqq'),
    ('user2', '$2b$12$QHVPeXc1U1/loLbNE92d0uTk8M61m0Mcv5aHVqw9AEtckiDxdYpqq');

INSERT INTO contact_info VALUES
    ('user1', 'First Last', 'Location', 'email@email.com', '123-456-7890', 'https://www.linkedin.com/in/example/', NULL),
    ('user2', 'A B', 'Location', 'email@email.com', '123-456-7890', 'https://www.linkedin.com/in/example/', 'https://github.com/example');

-- ==================================================

INSERT INTO documents (document_name, owner, is_master, is_template) VALUES
    ('Master', 'user1', TRUE, FALSE),
    ('Doc 1', 'user1', FALSE, FALSE),
    ('Doc 1', 'user2', FALSE, FALSE);

INSERT INTO sections (section_name) VALUES
    ('Education'),
    ('Work Experience'),
    ('Skills'),
    ('Certifications'),
    ('Projects');

-- ==================================================

INSERT INTO text_snippets (owner, type, content) VALUES
    ('user1', 'plain', 'abc');

INSERT INTO text_snippets (version, owner, type, content) VALUES
    ('2025-01-01 12:00:00.000-08', 'user1', 'plain', 'Languages: JavaScript, HTML, CSS\nTools: Node, Express, Bootstrap'),
    ('2025-01-02 12:00:00.000-08', 'user1', 'plain', 'achievement 1');

INSERT INTO text_snippets (id, version, owner, parent, type, content) VALUES
    (3, '2025-01-03 12:00:00.000-08', 'user1', '2025-01-02 12:00:00.000-08', 'plain', 'achieve 1');

INSERT INTO educations (owner, school, location, start_date, end_date, degree, gpa) VALUES
    ('user1', 'University', 'Loc, USA', '2000-01-01', '2004-01-01', 'Degree', '4.0 / 4.0');

INSERT INTO experiences (owner, title, organization, location, start_date, end_date) VALUES
    ('user1', 'Job 3', 'Company 3', 'Company Location 3', '2025-01-01', NULL),
    ('user1', 'Job 2', 'Company 2', 'Company Location 2', '2020-01-01', '2024-12-30');

INSERT INTO skills (name, owner, text_snippet_id, text_snippet_version) VALUES
    ('software engineering', 'user1', 2, '2025-01-01 12:00:00.000-08');

-- ==================================================

INSERT INTO documents_x_sections VALUES
    (1, 1, 1),
    (1, 2, 2),
    (1, 3, 0);

INSERT INTO documents_x_educations VALUES
    (1, 1, 0);

INSERT INTO documents_x_experiences (document_id, experience_id, position) VALUES
    (1, 1, 0),
    (1, 2, 1);

INSERT INTO documents_x_skills VALUES
    (1, 1);

INSERT INTO experiences_x_text_snippets VALUES
    (1, 3, '2025-01-02 12:00:00.000-08', 0);

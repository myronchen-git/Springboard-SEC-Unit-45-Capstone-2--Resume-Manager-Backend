/*
==================================================
Basic, necessary user info.
--------------------------------------------------
*/

CREATE TABLE users (
	username TEXT PRIMARY KEY,
	password TEXT NOT NULL
);

CREATE TABLE contact_info (
	username TEXT PRIMARY KEY
        REFERENCES users ON DELETE CASCADE,
	full_name TEXT NOT NULL,
	location TEXT,
	email TEXT,
	phone TEXT,
	linkedin TEXT,
	github TEXT
);

/*
==================================================
Documents.
--------------------------------------------------
*/

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    document_name TEXT NOT NULL,
    owner TEXT NOT NULL
        REFERENCES users ON DELETE CASCADE,
    created_on TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ(3),
	is_master BOOLEAN NOT NULL,
	is_template BOOLEAN NOT NULL,
	is_locked BOOLEAN NOT NULL DEFAULT FALSE,
	UNIQUE (document_name, owner)
);

/*
==================================================
Document-related.
--------------------------------------------------
*/

CREATE TABLE sections (
	id SERIAL PRIMARY KEY,
	section_name TEXT UNIQUE NOT NULL
);

/*
==================================================
Content; Details that will go thru many revisions.
--------------------------------------------------
*/

CREATE TABLE text_snippets (
	id SERIAL,
	version TIMESTAMPTZ(3) DEFAULT NOW(),
    owner TEXT NOT NULL
        REFERENCES users ON DELETE CASCADE,
	parent TIMESTAMPTZ(3),
	type TEXT NOT NULL,
	content TEXT NOT NULL,
	PRIMARY KEY (id, version),
	FOREIGN KEY (id, parent)
		REFERENCES text_snippets ON DELETE SET NULL (parent)
);

/*
==================================================
Section Entries; Details that will not change often.
--------------------------------------------------
*/

CREATE TABLE educations (
	id SERIAL PRIMARY KEY,
	owner TEXT NOT NULL
		REFERENCES users ON DELETE CASCADE,
	school TEXT NOT NULL,
	location TEXT NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE NOT NULL,
	degree TEXT NOT NULL,
	gpa TEXT,
	awards_and_honors TEXT,
	activities TEXT
);

CREATE TABLE experiences (
	id SERIAL PRIMARY KEY,
	owner TEXT NOT NULL
		REFERENCES users ON DELETE CASCADE,
	title TEXT NOT NULL,
	organization TEXT NOT NULL,
	location TEXT NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE
);

CREATE TABLE skills (
	id SERIAL PRIMARY KEY,
	name TEXT UNIQUE NOT NULL,
	owner TEXT NOT NULL
		REFERENCES users ON DELETE CASCADE,
	text_snippet_id INTEGER NOT NULL,
	text_snippet_version TIMESTAMPTZ(3) NOT NULL,
	FOREIGN KEY (text_snippet_id, text_snippet_version)
		REFERENCES text_snippets (id, version)
);

CREATE TABLE certifications (
	id SERIAL PRIMARY KEY,
	owner TEXT NOT NULL
		REFERENCES users ON DELETE CASCADE,
	name TEXT NOT NULL,
	issuing_org TEXT NOT NULL,
	issue_date DATE NOT NULL
);

CREATE TABLE projects (
	id SERIAL PRIMARY KEY,
	owner TEXT NOT NULL
		REFERENCES users ON DELETE CASCADE,
	name TEXT NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE
);

/*
==================================================
Relations.
--------------------------------------------------
*/

CREATE TABLE documents_x_sections (
	document_id INTEGER
        REFERENCES documents ON DELETE CASCADE,
	section_id INTEGER
        REFERENCES sections ON DELETE CASCADE,
	position INTEGER NOT NULL
		CHECK (position >= 0),
    PRIMARY KEY (document_id, section_id),
    UNIQUE (document_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE documents_x_educations (
	document_id INTEGER
		REFERENCES documents ON DELETE CASCADE,
	education_id INTEGER
		REFERENCES educations ON DELETE CASCADE,
	position INTEGER NOT NULL
		CHECK (position >= 0),
	PRIMARY KEY (document_id, education_id),
	UNIQUE (document_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE documents_x_experiences (
	id SERIAL PRIMARY KEY,
	document_id INTEGER
		REFERENCES documents ON DELETE CASCADE,
	experience_id INTEGER
		REFERENCES experiences ON DELETE CASCADE,
	position INTEGER NOT NULL
		CHECK (position >= 0),
	UNIQUE (document_id, experience_id),
	UNIQUE (document_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE documents_x_skills (
	document_id INTEGER
		REFERENCES documents ON DELETE CASCADE,
	skill_id INTEGER
		REFERENCES skills ON DELETE CASCADE,
	PRIMARY KEY (document_id, skill_id)
);

CREATE TABLE documents_x_certifications (
	document_id INTEGER
		REFERENCES documents ON DELETE CASCADE,
	certification_id INTEGER
		REFERENCES certifications ON DELETE CASCADE,
	position INTEGER NOT NULL
		CHECK (position >= 0),
	PRIMARY KEY (document_id, certification_id),
	UNIQUE (document_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE documents_x_projects (
	id SERIAL PRIMARY KEY,
	document_id INTEGER
		REFERENCES documents ON DELETE CASCADE,
	project_id INTEGER
		REFERENCES projects ON DELETE CASCADE,
	position INTEGER NOT NULL
		CHECK (position >= 0),
	UNIQUE (document_id, project_id),
	UNIQUE (document_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE experiences_x_text_snippets (
	document_x_experience_id INTEGER
		REFERENCES documents_x_experiences ON DELETE CASCADE,
	text_snippet_id INTEGER,
	text_snippet_version TIMESTAMPTZ(3) NOT NULL,
	position INTEGER NOT NULL
		CHECK (position >= 0),
	PRIMARY KEY (document_x_experience_id, text_snippet_id),
	FOREIGN KEY (text_snippet_id, text_snippet_version)
		REFERENCES text_snippets (id, version) ON DELETE CASCADE,
	UNIQUE (document_x_experience_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE projects_x_text_snippets (
	document_x_project_id INTEGER
		REFERENCES documents_x_projects ON DELETE CASCADE,
	text_snippet_id INTEGER,
	text_snippet_version TIMESTAMPTZ(3) NOT NULL,
	position INTEGER NOT NULL
		CHECK (position >= 0),
	PRIMARY KEY (document_x_project_id, text_snippet_id),
	FOREIGN KEY (text_snippet_id, text_snippet_version)
		REFERENCES text_snippets (id, version) ON DELETE CASCADE,
	UNIQUE (document_x_project_id, position) DEFERRABLE INITIALLY DEFERRED
);

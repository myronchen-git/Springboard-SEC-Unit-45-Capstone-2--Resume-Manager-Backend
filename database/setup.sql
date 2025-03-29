\echo 'Delete and recreate resume_manager database?'
\prompt 'Return for yes or control-C to cancel > ' isContinue

DROP DATABASE IF EXISTS resume_manager;
CREATE DATABASE resume_manager;
\connect resume_manager

\i schema.sql
\i seed.sql


\echo 'Delete and recreate test resume_manager_test database?'
\prompt 'Return for yes or control-C to cancel > ' isContinue

DROP DATABASE IF EXISTS resume_manager_test;
CREATE DATABASE resume_manager_test;
\connect resume_manager_test

\i schema.sql

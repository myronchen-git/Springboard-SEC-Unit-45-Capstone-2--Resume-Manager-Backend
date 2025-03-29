/** Holds common test data that might be used across all tests. */

const users = Object.freeze([
  Object.freeze({ username: 'user1', password: '123Ab!' }),
  Object.freeze({ username: 'user2', password: '123Ab!' }),
]);

const contactInfos = Object.freeze([
  Object.freeze({ username: 'user1', fullName: 'First1 Last1' }),
  Object.freeze({
    username: 'user2',
    fullName: 'First2 Last2',
    location: '123 Main St., City, State 11111',
    email: 'email2@email.com',
    phone: '123-456-7890',
    linkedin: 'linkedin.com/in/name/',
    github: 'github.com/name',
  }),
]);

const documents = Object.freeze([
  Object.freeze({
    documentName: 'doc1',
    owner: users[0].username,
    isMaster: true,
    isTemplate: false,
  }),
  Object.freeze({
    documentName: 'doc2',
    owner: users[0].username,
    isMaster: false,
    isTemplate: true,
  }),
]);

const numSections = 3;
const sections = new Array(numSections);
for (let i = 1; i <= numSections; i++) {
  sections[i - 1] = Object.freeze({ sectionName: `section ${i}` });
}
Object.freeze(sections);

const textSnippets = Object.freeze([
  Object.freeze({
    owner: users[0].username,
    type: 'paragraph',
    content: 'content1',
  }),
  Object.freeze({
    owner: users[0].username,
    type: 'bullet point',
    content: 'content2',
  }),
]);

// To use in text snippets.
const versions = textSnippets.map((_, idx) => new Date(2000 + idx, 0, 1));

const educations = Object.freeze([
  Object.freeze({
    owner: users[0].username,
    school: 'School 1',
    location: 'Location 1',
    startDate: '2020-12-01',
    endDate: '2024-05-20',
    degree: 'Degree 1',
  }),
  Object.freeze({
    owner: users[0].username,
    school: 'University of California,',
    location: 'Los Angeles',
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    degree: 'Bachelor of Science, Computer Science',
    gpa: '4.0 / 4.0',
    awardsAndHonors: 'Award 1, Honors 1',
    activities: 'Extracurricular Activity 1, Extracurricular Activity 2',
  }),
]);

const experiences = Object.freeze([
  Object.freeze({
    owner: users[0].username,
    title: 'Software Engineer I',
    organization: 'Company 1',
    location: 'City 1, State 1, Country',
    startDate: '2000-02-02',
  }),
  Object.freeze({
    owner: users[0].username,
    title: 'Full-Stack Engineer I',
    organization: 'Company 100',
    location: 'City 100, State 100, Country',
    startDate: '2000-10-08',
    endDate: '2020-12-30',
  }),
]);

// These are missing text snippet ID and version, which will need to be added
// later.
const skills = Object.freeze([
  Object.freeze({
    name: 'skills1',
    owner: users[0].username,
  }),
  Object.freeze({
    name: 'skills2',
    owner: users[0].username,
  }),
]);

const documents_x_sections = Object.freeze(
  sections.map((_, idx) =>
    Object.freeze({
      documentId: 1,
      sectionId: idx + 1,
      position: idx,
    })
  )
);

const documents_x_educations = Object.freeze(
  educations.map((_, idx) =>
    Object.freeze({
      documentId: 1,
      educationId: idx + 1,
      position: idx,
    })
  )
);

const documents_x_experiences = Object.freeze(
  experiences.map((_, idx) =>
    Object.freeze({
      documentId: 1,
      experienceId: idx + 1,
      position: idx,
    })
  )
);

const documents_x_skills = Object.freeze(
  skills.map((_, idx) =>
    Object.freeze({
      documentId: 1,
      skillId: idx + 1,
    })
  )
);

const experiences_x_text_snippets = Object.freeze(
  textSnippets.map((_, idx) =>
    Object.freeze({
      documentXExperienceId: 1,
      textSnippetId: idx + 1,
      textSnippetVersion: versions[idx],
      position: idx,
    })
  )
);

// ==================================================

module.exports = {
  users,
  contactInfos,
  documents,
  sections,
  textSnippets,
  versions,
  educations,
  experiences,
  skills,
  documents_x_sections,
  documents_x_educations,
  documents_x_experiences,
  documents_x_skills,
  experiences_x_text_snippets,
};

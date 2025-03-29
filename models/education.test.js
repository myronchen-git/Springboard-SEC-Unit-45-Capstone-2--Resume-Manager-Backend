'use strict';

const Education = require('./education');

const { runCommonTests } = require('./_testCommon');
const { users, educations } = require('../_testData');

// ==================================================

const dataForNewInstances = educations;

const dataForUpdate = Object.freeze(
  dataForNewInstances.map((data) =>
    Object.freeze({
      school: 'New ' + data.school,
      location: 'New ' + data.location,
      startDate: '2000-05-05',
      endDate: '2001-05-05',
      degree: 'New ' + data.degree,
      gpa: 'New GPA',
      awardsAndHonors: 'New Awards',
      activities: 'New Activities',
    })
  )
);

const expectedDataInNewInstances = dataForNewInstances.map((data) => ({
  id: expect.any(Number),
  owner: data.owner,
  school: data.school,
  location: data.location,
  startDate: data.startDate,
  endDate: data.endDate,
  degree: data.degree,
  gpa: data.gpa || null,
  awardsAndHonors: data.awardsAndHonors || null,
  activities: data.activities || null,
}));

const whereClauseToGetOne = 'WHERE id = $1';
const whereClauseToGetAll = 'WHERE owner = $1';

// Don't freeze, because ID will be added later.
const testCasesForGet = [
  ['ID', { owner: users[0].username }, expectedDataInNewInstances[0]],
];

runCommonTests({
  class: Education,
  tableName: Education.tableName,
  dataForNewInstances,
  dataForUpdate,
  expectedDataInNewInstances,
  whereClauseToGetOne,
  whereClauseToGetAll,
  testCasesForGet,
});

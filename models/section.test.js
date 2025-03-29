'use strict';

const Section = require('./section');

const { runCommonTests } = require('./_testCommon');
const { sections } = require('../_testData');

// ==================================================

const dataForNewInstances = sections;

const dataForDuplicationCheck = Object.freeze(
  dataForNewInstances.map((data) => Object.freeze({ ...data }))
);

const dataForUpdate = Object.freeze(
  dataForNewInstances.map((data) =>
    Object.freeze({
      sectionName: 'new ' + data.sectionName,
    })
  )
);

const expectedDataInNewInstances = dataForNewInstances.map((data) => ({
  id: expect.any(Number),
  sectionName: data.sectionName,
}));

const whereClauseToGetOne = 'WHERE id = $1';
const whereClauseToGetAll = '';

// Don't freeze, because ID will be added later.
const testCasesForGet = [
  ['ID', {}, expectedDataInNewInstances[0]],
  [
    'ID',
    {
      sectionName: dataForNewInstances[0].sectionName,
    },
    expectedDataInNewInstances[0],
  ],
  [
    'name',
    {
      sectionName: dataForNewInstances[0].sectionName,
    },
    expectedDataInNewInstances[0],
  ],
];

runCommonTests({
  class: Section,
  tableName: Section.tableName,
  hasOwner: false,
  dataForNewInstances,
  dataForDuplicationCheck,
  dataForUpdate,
  expectedDataInNewInstances,
  whereClauseToGetOne,
  whereClauseToGetAll,
  testCasesForGet,
});

'use strict';

const Document = require('./document');

const { runCommonTests } = require('./_testCommon');
const { users, documents } = require('../_testData');

// ==================================================

const dataForNewInstances = documents;

const dataForDuplicationCheck = Object.freeze(
  dataForNewInstances.map((data) =>
    Object.freeze({
      ...data,
      isMaster: !data.isMaster,
    })
  )
);

const dataForUpdate = Object.freeze(
  dataForNewInstances.map((data) =>
    Object.freeze({
      documentName: 'new ' + data.documentName,
      isMaster: !data.isMaster,
      isTemplate: !data.isTemplate,
      isLocked: !data.isLocked,
    })
  )
);

const expectedDataInNewInstances = dataForNewInstances.map((data) => ({
  id: expect.any(Number),
  documentName: data.documentName,
  owner: data.owner,
  createdOn: expect.any(Date),
  lastUpdated: null,
  isMaster: data.isMaster,
  isTemplate: data.isTemplate,
  isLocked: false,
}));

const whereClauseToGetOne = 'WHERE id = $1';
const whereClauseToGetAll = 'WHERE owner = $1';

// Don't freeze, because ID will be added later.
const testCasesForGet = [
  ['ID', { owner: users[0].username }, expectedDataInNewInstances[0]],
  [
    'ID',
    {
      documentName: dataForNewInstances[0].documentName,
      owner: users[0].username,
    },
    expectedDataInNewInstances[0],
  ],
  [
    'name',
    {
      documentName: dataForNewInstances[0].documentName,
      owner: users[0].username,
    },
    expectedDataInNewInstances[0],
  ],
];

runCommonTests({
  class: Document,
  tableName: Document.tableName,
  dataForNewInstances,
  dataForDuplicationCheck,
  dataForUpdate,
  expectedDataInNewInstances,
  whereClauseToGetOne,
  whereClauseToGetAll,
  testCasesForGet,
});

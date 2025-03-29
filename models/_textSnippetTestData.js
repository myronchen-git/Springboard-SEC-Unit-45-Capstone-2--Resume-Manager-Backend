/** Holds test data specific to text snippets. */

'use strict';

const { users, textSnippets } = require('../_testData');

// ==================================================

const dataForNewInstances = textSnippets;

const dataForUpdate = Object.freeze(
  dataForNewInstances.map((data) =>
    Object.freeze({
      type: 'different ' + data.type,
      content: 'new ' + data.content,
    })
  )
);

const expectedDataInNewInstances = dataForNewInstances.map((data) => ({
  id: expect.any(Number),
  version: expect.any(Date),
  owner: data.owner,
  parent: null,
  type: data.type,
  content: data.content,
}));

const whereClauseToGetOne = 'WHERE id = $1 AND version = $2';
const whereClauseToGetAll = 'WHERE owner = $1';

// Don't freeze, because ID will be added later.
const testCasesForGet = [
  ['ID & version', { owner: users[0].username }, expectedDataInNewInstances[0]],
];

// ==================================================

module.exports = {
  dataForNewInstances,
  dataForUpdate,
  expectedDataInNewInstances,
  whereClauseToGetOne,
  whereClauseToGetAll,
  testCasesForGet,
};

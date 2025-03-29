'use strict';

const { camelToSnakeCase } = require('./caseConversions');

// ==================================================

/**
 * Helps to convert a set of table properties from JavaScript to a SQL substring
 * and values, which will be used in a database UPDATE query.
 *
 * The substring will be used for the SET command.
 *
 * The values will be used in the query config for the database query method,
 * when using parameterized queries.
 *
 * @param {Object} props - Contains the updated properties of a table entry.
 * @returns {Array} [sqlSubstring, sqlValues].
 */
function convertPropsForSqlUpdate(props) {
  let sqlSubstring = '';
  const sqlValues = [];

  Object.entries(props).forEach(([colName, val], i) => {
    sqlSubstring += `\n    ${camelToSnakeCase(colName)} = $${i + 1},`;
    sqlValues.push(val);
  });

  return [sqlSubstring, sqlValues];
}

// ==================================================

module.exports = { convertPropsForSqlUpdate };

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

/**
 * Creates the SQL WHERE clause substring, between "WHERE" and ";", and an Array
 * for the values to go with it.  The conditions in the substring are joined by
 * AND.
 *
 * The parameter requires nested Objects, where the first level of keys are used
 * to append SQL aliases to the column names, and the second level of keys are
 * the column names.  Aliases are required.
 *
 * @param {Object} props - {alias: {column name: value}}.
 * @returns {Array} The SQL WHERE substring in the first index, and an Array for
 *  the associated values in the second index.
 */
function convertPropsForSqlWhereClause(props) {
  const whereClauseConditions = [];
  const whereClauseValues = [];
  let parameterizedQueryNumber = 1;

  Object.entries(props).forEach(([alias, columnProps]) => {
    Object.entries(columnProps).forEach(([columnName, columnValue]) => {
      whereClauseConditions.push(
        `${alias}.${camelToSnakeCase(
          columnName
        )} = $${parameterizedQueryNumber++}`
      );
      whereClauseValues.push(columnValue);
    });
  });

  return [whereClauseConditions.join(' AND '), whereClauseValues];
}

// ==================================================

module.exports = { convertPropsForSqlUpdate, convertPropsForSqlWhereClause };

'use strict';

// ==================================================

/**
 * Converts a String from camel to snake case.
 * https://stackoverflow.com/a/54246501
 *
 * @param {String} str - Camel case String to convert from.
 * @returns {String} String in snake case.
 */
function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts a String from pascal case to normal space-separated words.  Note
 * that each upper case letter should represent a beginning of a new word.
 *
 * @param {String} str - Pascal case String to convert from.
 * @returns {String} A String with separated words.
 */
function pascalToSpaceSeparated(str) {
  return str
    .replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)
    .trimStart();
}

// ==================================================

module.exports = { camelToSnakeCase, pascalToSpaceSeparated };

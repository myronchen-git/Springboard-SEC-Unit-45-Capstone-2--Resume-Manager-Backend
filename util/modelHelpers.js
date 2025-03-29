'use strict';

// ==================================================

/**
 * Converts a Date into a simple date String.
 *
 * This was originally created to return database date data in a simple date
 * format without any time or timezones.  The Date.toISOString method is not
 * used, because it may cause the date to change.
 *
 * @param {Date} dateObj - A Date Object.
 * @returns {String} The date in YYYY-MM-DD format.
 */
function convertDateToString(dateObj) {
  if (dateObj == null) return dateObj;

  const month = convertNumToTwoDigitString(dateObj.getMonth() + 1);
  const date = convertNumToTwoDigitString(dateObj.getDate());

  function convertNumToTwoDigitString(num) {
    return num < 10 ? '0' + num : num.toString();
  }

  return dateObj.getFullYear() + '-' + month + '-' + date;
}

// ==================================================

module.exports = { convertDateToString };

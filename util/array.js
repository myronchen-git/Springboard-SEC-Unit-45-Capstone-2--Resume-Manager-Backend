'use strict';

// ==================================================

/**
 * Shuffles/randomizes an array.
 * See https://stackoverflow.com/a/2450976.
 * See https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle.
 *
 * @param {Array} array - Array to be shuffled in place.
 * @returns {Array} The provided Array.
 */
function shuffle(array) {
  for (let i = array.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ==================================================

module.exports = { shuffle };

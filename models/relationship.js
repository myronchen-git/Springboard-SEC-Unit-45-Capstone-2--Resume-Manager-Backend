'use strict';

const db = require('../database/db');

const {
  AppError,
  AppServerError,
  BadRequestError,
  NotFoundError,
} = require('../errors/appErrors');

const logger = require('../util/logger');

// ==================================================

/**
 * Generic superclass for data models of relationships between tables.  This is
 * used to consolidate duplicate code.
 */
class Relationship {
  /**
   * Creates a new table entry.
   *
   * @param {Object} props - Contains data for creating a new entry.
   * @param {Object} queryConfig - Configuration for the database query.
   * @param {String} queryConfig.text - SQL INSERT statement for the
   *  parameterized query, along with a RETURNING clause.
   * @param {Array} queryConfig.values - The values to use in the parameterized
   *  query.
   * @param {String} notFoundMessage - Error message to use in the
   *  NotFoundError.
   * @returns {Object} An instance of the subclass, containing the new entry's
   *  data.
   */
  static async add(props, queryConfig, notFoundMessage) {
    const logPrefix = `${this.name}.add(${JSON.stringify(props)})`;
    logger.verbose(logPrefix);

    const result = await db.query({
      queryConfig,
      logPrefix,
      errorCallback: (err) => {
        // PostgreSQL error code 23503 is for foreign key violation.
        if (err.code === '23503') {
          // Logging not needed as it's already done in PostgresDb.query.
          throw new NotFoundError(notFoundMessage);
        }
      },
    });

    return new this(...Object.values(result.rows[0]));
  }

  /**
   * Retrieves all table entries in a relationship table, belonging to a
   * document.
   *
   * @param {Number} documentId - ID of the document to get the table entries
   *  for.
   * @param {Object} queryConfig - Configuration for the database query.
   * @param {String} queryConfig.text - SQL SELECT statement for the
   *  parameterized query.
   * @param {Array} queryConfig.values - The values to use in the parameterized
   *  query.
   * @returns {Array} A list of instances of the relationship data model.
   */
  static async getAll(documentId, queryConfig) {
    const logPrefix = `${this.name}.getAll(${documentId})`;
    logger.verbose(logPrefix);

    const result = await db.query({ queryConfig, logPrefix });

    return result.rows.map((data) => new this(...Object.values(data)));
  }

  /**
   * Retrieves a specific table entry by ID.
   *
   * @param {Object} queryParams - Contains the query parameters for finding a
   *  specific table entry.  Used only for logging.
   * @param {Object} queryConfig - Configuration for the database query.
   * @param {String} queryConfig.text - SQL SELECT statement for the
   *  parameterized query.
   * @param {Array} queryConfig.values - The values to use in the parameterized
   *  query.
   * @param {String} notFoundMessage - Error message to use in the
   *  NotFoundError when not found.
   * @returns {Object} An instance of the subclass, containing the new entry's
   *  data.
   */
  static async get(queryParams, queryConfig, notFoundMessage) {
    const logPrefix = `${this.name}.get(${JSON.stringify(queryParams)})`;
    logger.verbose(logPrefix);

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rows.length === 0) {
      logger.error(`${logPrefix}: ${this.name} not found.`);
      throw new NotFoundError(notFoundMessage);
    }

    const data = result.rows[0];
    return new this(...Object.values(data));
  }

  /**
   * Updates the positions of all relationships belonging to a particular
   * container.  In other words, updates all of the positions of a type of
   * content in a document, experience, etc..
   *
   * @param {Object} attachTo - Holds the data related to the container of the
   *  content.
   * @param {String} attachTo.jsName - The JavaScript variable name that
   *  describes the ID.  This is used for logging.
   * @param {String} attachTo.sqlName - The SQL name for the ID of the
   *  container, which will be used in the SQL UPDATE WHERE clause.
   * @param {Number} attachTo.id - The ID of the container.
   * @param {Object} attachWiths - Holds the data related to the things being
   *  repositioned.
   * @param {String} attachWiths.jsName - The JavaScript variable name that
   *  describes the ID.  This is used for logging.
   * @param {String} attachWiths.sqlName - The SQL name for the ID of the
   *  content, which will be used in the SQL UPDATE WHERE clause.
   * @param {Number[]} attachWiths.ids - The IDs of the content to be
   *  repositioned, in their desired order.
   * @returns {Array} A list of instances of the relationship data model.
   */
  static async updateAllPositions(attachTo, attachWiths) {
    const logPrefix =
      `${this.name}.updateAll(` +
      `${attachTo.jsName} = ${attachTo.id}, ` +
      `${attachWiths.jsName}s = [${attachWiths.ids}])`;
    logger.verbose(logPrefix);

    const dbClient = await db.getClient();

    try {
      // Verify number of IDs.
      const countResult = await db.query({
        queryConfig: {
          text: `
  SELECT COUNT(*)
  FROM ${this.tableName}
  WHERE ${attachTo.sqlName} = $1;`,
          values: [attachTo.id],
        },
        logPrefix,
        dbClient,
      });
      if (countResult.rows[0].count != attachWiths.ids.length) {
        logger.error(
          `${logPrefix}: Number of content to reposition is not equal to ` +
            `number in container.  Container has ${countResult.rows[0].count}.`
        );
        throw new AppServerError(
          'Number of things to reposition must be total number in container.'
        );
      }

      // Start SQL transaction.
      await db.query({
        queryConfig: {
          text: `
  BEGIN;`,
        },
        logPrefix,
        dbClient,
      });

      // Loop thru IDs and make UPDATEs.
      const results = [];
      for (let i = 0; i < attachWiths.ids.length; i++) {
        const result = await db.query({
          queryConfig: {
            text: `
  UPDATE ${this.tableName}
  SET position = $1
  WHERE ${attachTo.sqlName} = $2 AND ${attachWiths.sqlName} = $3
  RETURNING ${this._allDbColsAsJs};`,
            values: [i, attachTo.id, attachWiths.ids[i]],
          },
          logPrefix,
          dbClient,
        });

        results.push(new this(...Object.values(result.rows[0])));
      }

      // End SQL transaction.
      await db.query({
        queryConfig: {
          text: `
  COMMIT;`,
        },
        logPrefix,
        dbClient,
      });

      return results;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      } else {
        logger.error(`${logPrefix}: ${err.message}`);
        throw new AppServerError('Error when updating positions in database.');
      }
    } finally {
      dbClient.release();
    }
  }

  /**
   * Updates a table entry with a new position.  Throws a BadRequestError if
   * position is invalid.
   *
   * @param {Number} position - New position for this table entry.
   * @param {Object} queryConfig - Configuration for the database query.
   * @param {String} queryConfig.text - SQL UPDATE statement for the
   *  parameterized query, along with a RETURNING clause.
   * @param {Array} queryConfig.values - The values to use in the parameterized
   *  query.
   * @param {String} instanceArgsForLog - The ID names and values in the
   *  relationship instance, which will be used in the log for invalid position.
   * @param {String} notFoundLog - Log message for if the table entry is not in
   *  the database.
   * @param {String} serverErrorMessage - Error message to use in
   *  AppServerError, if the table entry is not in the database.
   * @returns {Object} The same instance that this method was called on, but
   *  with updated property values.
   */
  async update(
    position,
    queryConfig,
    instanceArgsForLog,
    notFoundLog,
    serverErrorMessage
  ) {
    const logPrefix = `${this.constructor.name}${JSON.stringify(
      this
    )}.update(${position})`;
    logger.verbose(logPrefix);

    if (position < 0) {
      const message = 'Position can not be less than 0.';
      logger.error(`${logPrefix}: ${instanceArgsForLog}: ${message}`);
      throw new BadRequestError(message);
    }

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount === 0) {
      logger.error(`${logPrefix}: ${notFoundLog}`);
      throw new AppServerError(serverErrorMessage);
    }

    // Update current instance's properties.
    Object.entries(result.rows[0]).forEach(([colName, val]) => {
      this[colName] = val;
    });

    return this;
  }

  /**
   * Deletes a table entry in the database.  Does not delete the instance
   * properties/fields.  Remember to delete the instance this belongs to!
   *
   * @param {Object} queryConfig - Configuration for the database query.
   * @param {String} queryConfig.text - SQL DELETE statement for the
   *  parameterized query.
   * @param {Array} queryConfig.values - The values to use in the parameterized
   *  query.
   * @param {String} deletedLog - Text to be appended after row count in the log
   *  message, describing what was deleted.  See code.
   */
  static async delete(queryConfig, deletedLog) {
    const logPrefix = `${this.name}.delete()`;
    logger.verbose(logPrefix);

    const result = await db.query({ queryConfig, logPrefix });

    if (result.rowCount) {
      logger.info(`${logPrefix}: ${result.rowCount} ${deletedLog}`);
    } else {
      logger.info(`${logPrefix}: 0 ${this.tableName} entries deleted.`);
    }
  }
}

// ==================================================

module.exports = Relationship;

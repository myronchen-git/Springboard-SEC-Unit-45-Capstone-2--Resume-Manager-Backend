/** Database setup for app. */

'use strict';

const pg = require('pg');

const { DATABASE_URI } = require('../config');
const logger = require('../util/logger');

// ==================================================

/**
 * The class that will handle making the database connection.  This also will
 * act as an adapter.
 */
class PostgresDb {
  static config = {
    connectionString: DATABASE_URI,
  };

  /**
   * Creates a new database connection pool.
   */
  constructor() {
    this.pool = new pg.Pool(PostgresDb.config);
    this.pool.on('error', (err, client) => {
      logger.error('Unexpected error on idle client: ' + err);
      process.exit(-1);
    });
  }

  /**
   * Checks out a client that can be used to make database queries.
   * @returns
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Shuts down PostgreSQL connection pool, so that there are no active
   * connections.
   */
  async shutdown() {
    await this.pool.end();
  }

  /**
   * Acts as a liaison between the call to query the database and the app. This
   * is used to add things like logging to each query.
   *
   * @param {Object} props
   * @param {Object} props.queryConfig - Contains parameters such as text (SQL
   *  strings), values (arguments for parameterized queries), and name (for
   *  creating prepared statements).  See
   *  [https://node-postgres.com/apis/client#queryconfig].
   * @param {String} props.queryConfig.text - The SQL statement to execute.
   * @param {Array} [props.queryConfig.values] - Query parameters for a
   *  parameterized query.
   * @param {String} [props.queryConfig.name] - Query name, for creating a
   *  prepared statement.
   * @param {String} [props.logPrefix] - Text to be placed at the beginning of
   *  logs.
   * @param {PostgresDb~queryErrorCallback} [props.errorCallback] - Callback
   *  that runs if pg.Client.query throws an Error.
   * @param {pg.Client} [props.dbClient] - The pg (node-postgres) client to call
   *  query on.  If not supplied, then query is called on the pg Pool.
   * @returns The result from a database query.
   */
  async query({
    queryConfig,
    logPrefix = 'PostgresDb.query(...)',
    errorCallback,
    dbClient = this.pool,
  }) {
    logger.verbose(
      `${logPrefix}: Executing query on database: ${queryConfig.text}`
    );

    try {
      return await dbClient.query(queryConfig);
    } catch (err) {
      logger.error(`${logPrefix}: ${err}.`);

      if (errorCallback) errorCallback(err);

      throw err;
    }
  }

  /**
   * @callback PostgresDb~queryErrorCallback
   * @param {Error} err - The Error thrown by pg.Client.query.
   */
}

// --------------------------------------------------
// Start database connection.

const db = new PostgresDb();

// ==================================================

module.exports = db;

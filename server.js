'use strict';

const app = require('./app');
const { PORT } = require('./config');
const logger = require('./util/logger');

// ==================================================

/** Starts the server. */
app.listen(PORT, function () {
  logger.info(`Started on http://localhost:${PORT}`);
});

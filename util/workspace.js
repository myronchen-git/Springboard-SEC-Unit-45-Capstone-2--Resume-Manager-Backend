'use strict';

const fs = require('fs');

// ==================================================

function removeTestLogs() {
  console.log('Removing test logs.');
  fs.rmSync('./logs-dev', { recursive: true, force: true });
}

removeTestLogs();

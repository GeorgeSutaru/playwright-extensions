#!/usr/bin/env node
'use strict';

const { run } = require('../dist/cli');
run().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

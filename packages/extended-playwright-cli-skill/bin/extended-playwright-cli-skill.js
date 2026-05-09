#!/usr/bin/env node
'use strict';

const { install } = require('../dist/install');

const command = process.argv[2] || 'install';

switch (command) {
  case 'install':
    install(process.argv[3]).catch(console.error);
    break;
  case 'generate':
    console.log('Use: npx @playwright-extensions/cli-skill install');
    console.log('Installs race locator skill files to .claude/skills/playwright-race/');
    break;
  default:
    console.log('Usage: npx @playwright-extensions/cli-skill [install|generate]');
    process.exit(1);
}
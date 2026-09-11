'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const modules = [
  '00-tokens.css',
  '10-document.css',
  '20-adapter.css',
  '30-tables.css',
  '40-properties.css',
  '50-previews.css',
  '60-links.css',
  '70-callouts.css',
  '80-theme-compat.css',
  '90-toolbar.css',
  '95-compat-tail.css'
];

const stylesDir = path.join(root, 'styles');
const output = modules.map((file) => fs.readFileSync(path.join(stylesDir, file), 'utf8')).join('\n');
fs.writeFileSync(path.join(root, 'styles.css'), output, 'utf8');

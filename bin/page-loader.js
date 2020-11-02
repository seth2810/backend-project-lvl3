#!/usr/bin/env node

import { createRequire } from 'module';

import program from 'commander';

import downloadPage from '../index.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const defaultOutputDir = process.cwd();

program
  .version(version)
  .description('Downloads page from the network and puts it in specified directory')
  .option('-o, --output [directory]', 'output directory', defaultOutputDir)
  .arguments('<url>')
  .action((url) => {
    downloadPage(url, program.output)
      .then((outputPath) => {
        console.log(`Page successfully saved into '${outputPath}'`);
      })
      .catch((error) => {
        console.error(error.message);
        process.exit(1);
      });
  });

program.parse(process.argv);

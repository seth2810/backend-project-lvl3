import { createRequire } from 'module';

import commander from 'commander';

import downloadPage from './index.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const { program } = commander;

const defaultOutputPath = process.cwd();

const runCli = () => {
  program
    .version(version)
    .description('Downloads page from the network and puts it in specified directory')
    .helpOption('-h, --help', 'output usage information')
    .option('-o, --output [directory]', 'output directory', defaultOutputPath)
    .arguments('<url>')
    .action((url) => {
      downloadPage(url, program.output)
        .then((pageFilePath) => {
          console.log(`Page successfully saved into '${pageFilePath}'`);
        })
        .catch((error) => {
          console.error(error.message);
          process.exit(1);
        });
    });

  program.parse(process.argv);
};

export default runCli;

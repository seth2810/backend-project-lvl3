import os from 'os';
import url from 'url';
import path from 'path';
import { promises as fs } from 'fs';

const currentFilePath = url.fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const fixturesPath = path.resolve(currentDirectory, '..', '..', '__fixtures__');

export const resolveFixturePath = (relativePath) => path.resolve(fixturesPath, relativePath);

export const makeOutputDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'page-loader'));

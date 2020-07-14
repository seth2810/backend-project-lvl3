import url from 'url';
import path from 'path';

const currentFilePath = url.fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const fixturesPath = path.resolve(currentDirectory, '..', '..', 'fixtures');

const resolveFixturePath = (relativePath) => path.resolve(fixturesPath, relativePath);

export default { resolveFixturePath };

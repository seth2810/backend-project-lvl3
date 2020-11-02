import os from 'os';
import path from 'path';
import url, { URL } from 'url';
import { promises as fs } from 'fs';

import nock from 'nock';

import downloadPage from '../index.js';

const currentFilePath = url.fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const makeOutputDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'page-loader'));

const getFixturePath = (relativePath) => path.resolve(currentDirectory, '..', '__fixtures__', relativePath);

const readFile = (filePath) => fs.readFile(filePath, 'utf-8');

const pagePath = '/courses';
const pageOrigin = 'https://ru.hexlet.io';
const pageFileName = 'ru-hexlet-io-courses';
const pageResourcesDir = `${pageFileName}_files`;
const pageUrl = new URL(pagePath, pageOrigin);
const resourcesTable = [
  ['/courses', path.join(pageResourcesDir, 'ru-hexlet-io-courses.html')],
  ['/assets/application.css', path.join(pageResourcesDir, 'ru-hexlet-io-assets-application.css')],
  ['/assets/professions/nodejs.png', path.join(pageResourcesDir, 'ru-hexlet-io-assets-professions-nodejs.png')],
  ['/packs/js/runtime.js', path.join(pageResourcesDir, 'ru-hexlet-io-packs-js-runtime.js')],
];

nock.disableNetConnect();

describe('page-loader', () => {
  const server = nock(pageOrigin).persist();

  describe('errors', () => {
    let outputDir;

    beforeAll(async () => {
      outputDir = await makeOutputDir();

      resourcesTable.forEach(([resourceUrl, resourcePath]) => {
        server.get(resourceUrl).replyWithFile(200, getFixturePath(resourcePath));
      });
    });

    it('throws on network errors', async () => {
      const downloadUrl = new URL('/network_error', pageOrigin);
      const expectedError = 'NetworkError: A network error occurred';

      server.get(downloadUrl.pathname).replyWithError(expectedError);

      await expect(downloadPage(downloadUrl.toString(), outputDir))
        .rejects.toThrowErrorMatchingInlineSnapshot(
          JSON.stringify(expectedError),
        );
    });

    it.each([400, 500])('throws when resource loading fails with status code %d', async (status) => {
      const downloadUrl = new URL(`/error_${status}`, pageOrigin);
      const expectedError = `Request failed with status code ${status}`;

      server.get(downloadUrl.pathname).reply(status);

      await expect(downloadPage(downloadUrl.toString(), outputDir))
        .rejects.toThrowErrorMatchingInlineSnapshot(
          JSON.stringify(expectedError),
        );
    });

    it('throws on file system errors', async () => {
      await expect(downloadPage(pageUrl.href, '/var/lib')).rejects.toThrow(/EACCES: permission denied/);
      await expect(downloadPage(pageUrl.href, '/notexitst')).rejects.toThrow(/ENOENT: no such file or directory/);
      await expect(downloadPage(pageUrl.href, currentFilePath)).rejects.toThrow(
        /ENOTDIR: not a directory/,
      );
    });
  });

  describe('success', () => {
    let outputDir;

    beforeAll(async () => {
      outputDir = await makeOutputDir();

      await downloadPage(pageUrl.toString(), outputDir);
    });

    it('should download page', async () => {
      const actualFilePath = path.join(outputDir, `${pageFileName}.html`);
      const expectedContent = await readFile(getFixturePath(`${pageFileName}.html`));

      await expect(readFile(actualFilePath)).resolves.toBe(expectedContent);
    });

    it.each(resourcesTable)('should download resource "%s"', async (...args) => {
      const [, resourcePath] = args;
      const actualFilePath = path.join(outputDir, resourcePath);
      const expectedContent = await readFile(getFixturePath(resourcePath));

      await expect(readFile(actualFilePath)).resolves.toBe(expectedContent);
    });
  });
});

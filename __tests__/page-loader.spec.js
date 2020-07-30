import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

import nock from 'nock';

import downloadPage from '../src/index.js';

import helpers from './helpers';

describe('page-loader', () => {
  let outputDir;
  const pageFileName = 'ru-hexlet-io';
  const pageUrl = 'https://ru.hexlet.io';
  const pageFixturePath = helpers.resolveFixturePath('basic.html');
  const resourcesEntries = Object.entries({
    '/assets/image.jpg': helpers.resolveFixturePath('assets/image.jpg'),
    '/assets/script.js': helpers.resolveFixturePath('assets/script.js'),
    '/assets/style.css': helpers.resolveFixturePath('assets/style.css'),
  });

  beforeEach(async () => {
    nock(pageUrl).get('/').replyWithFile(200, pageFixturePath);

    resourcesEntries.forEach(([resourcePath, resourceFile]) => {
      nock(pageUrl).get(resourcePath).replyWithFile(200, resourceFile);
    });

    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader'));
  });

  describe('basic', () => {
    it('should download page file', async () => {
      await downloadPage(pageUrl, outputDir);

      const actual = await fs.readFile(path.join(outputDir, `${pageFileName}.html`), 'utf-8');

      expect(actual).toMatchSnapshot();
    });

    it('should download page resources', async () => {
      const expected = await Promise.all(
        resourcesEntries.map(
          ([, resourceFile]) => fs.readFile(resourceFile, 'utf-8'),
        ),
      );

      await downloadPage(pageUrl, outputDir);

      const actual = await Promise.all(
        resourcesEntries.map(
          ([resourcePath]) => fs.readFile(path.join(outputDir, `${pageFileName}_files`, resourcePath.slice(1).replace('/', '-')), 'utf-8'),
        ),
      );

      expect(actual).toEqual(expected);
    });
  });
});

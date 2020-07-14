import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

import nock from 'nock';

import downloadPage from '../src/index.js';

import helpers from './helpers';

describe('page-loader', () => {
  let outputDir;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader'));
  });

  describe('basic', () => {
    const pageUrl = 'https://hexlet.io';
    const pageFilename = 'hexlet-io.html';

    it('should create page file', async () => {
      const expected = await fs.readFile(helpers.resolveFixturePath('basic.html'), 'utf-8');

      nock(pageUrl).get('/').reply(200, expected);

      await downloadPage(pageUrl, outputDir);

      const actual = await fs.readFile(path.join(outputDir, pageFilename), 'utf-8');

      expect(actual).toEqual(expected);
    });
  });
});

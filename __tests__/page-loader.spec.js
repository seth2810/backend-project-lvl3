import path from 'path';
import { promises as fs } from 'fs';

import nock from 'nock';

import downloadPage from '../index.js';

import * as helpers from './helpers/index.js';

describe('page-loader', () => {
  const pageFileName = 'ru-hexlet-io';
  const pageUrl = 'https://ru.hexlet.io';

  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(async () => {
    nock.cleanAll();
  });

  it('should download page file', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('basic.html'));

    await downloadPage(pageUrl, outputDir);

    await expect(fs.readFile(path.join(outputDir, `${pageFileName}.html`), 'utf-8')).resolves.toMatchSnapshot();
  });

  it('should download page assets', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('assets.html'));

    nock(pageUrl).get('/assets/style.css').replyWithFile(200, helpers.resolveFixturePath('assets/style.css'));
    nock(pageUrl).get('/assets/image.jpg').replyWithFile(200, helpers.resolveFixturePath('assets/image.jpg'));
    nock(pageUrl).get('/assets/script.js').replyWithFile(200, helpers.resolveFixturePath('assets/script.js'));

    await downloadPage(pageUrl, outputDir);

    await expect(fs.readFile(path.join(outputDir, `${pageFileName}.html`), 'utf-8')).resolves.toMatchSnapshot();

    await expect(
      fs.readFile(path.join(outputDir, `${pageFileName}_files`, 'assets-style.css'), 'utf-8'),
    ).resolves.toBe(await fs.readFile(helpers.resolveFixturePath('assets/style.css'), 'utf-8'));

    await expect(
      fs.readFile(path.join(outputDir, `${pageFileName}_files`, 'assets-image.jpg'), 'utf-8'),
    ).resolves.toBe(await fs.readFile(helpers.resolveFixturePath('assets/image.jpg'), 'utf-8'));

    await expect(
      fs.readFile(path.join(outputDir, `${pageFileName}_files`, 'assets-script.js'), 'utf-8'),
    ).resolves.toBe(await fs.readFile(helpers.resolveFixturePath('assets/script.js'), 'utf-8'));
  });

  it('throws on network errors', async () => {
    const outputDir = await helpers.makeOutputDir();

    await expect(downloadPage(pageUrl, outputDir)).rejects.toThrowErrorMatchingSnapshot();
  });

  it('throws error when page unavailable', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock(pageUrl).get('/').reply(404);

    await expect(downloadPage(pageUrl, outputDir)).rejects.toThrowErrorMatchingSnapshot();
  });

  it('throws error when output path not exists', async () => {
    const outputDir = '/notexitst';

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('basic.html'));

    await expect(downloadPage(pageUrl, outputDir)).rejects.toThrowErrorMatchingSnapshot();
  });

  it('throws error when asset not available', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('assets.html'));

    nock(pageUrl).get('/assets/style.css').reply(404);
    nock(pageUrl).get('/assets/image.jpg').replyWithFile(200, helpers.resolveFixturePath('assets/image.jpg'));
    nock(pageUrl).get('/assets/script.js').replyWithFile(200, helpers.resolveFixturePath('assets/script.js'));

    await expect(downloadPage(pageUrl, outputDir)).rejects.toThrow();
  });
});

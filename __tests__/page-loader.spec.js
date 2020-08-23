import path from 'path';
import { promises as fs } from 'fs';

import nock from 'nock';

import downloadPage from '../src/index.js';

import * as helpers from './helpers/index.js';

describe('page-loader', () => {
  const pageFileName = 'ru-hexlet-io';
  const pageUrl = 'https://ru.hexlet.io';
  const resourcesEntries = Object.entries({
    '/assets/image.jpg': helpers.resolveFixturePath('assets/image.jpg'),
    '/assets/script.js': helpers.resolveFixturePath('assets/script.js'),
    '/assets/style.css': helpers.resolveFixturePath('assets/style.css'),
  });

  beforeEach(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('should download page file', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('basic.html'));

    await downloadPage(pageUrl, outputDir);

    const actual = await fs.readFile(path.join(outputDir, `${pageFileName}.html`), 'utf-8');

    expect(actual).toMatchSnapshot();
  });

  it('should download page assets', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('assets.html'));

    resourcesEntries.forEach(([resourcePath, resourceFile]) => {
      nock(pageUrl).get(resourcePath).replyWithFile(200, resourceFile);
    });

    await downloadPage(pageUrl, outputDir);

    const actual = await fs.readFile(path.join(outputDir, `${pageFileName}.html`), 'utf-8');

    expect(actual).toMatchSnapshot();

    const expectedResources = await Promise.all(
      resourcesEntries.map(
        ([, resourceFile]) => fs.readFile(resourceFile, 'utf-8'),
      ),
    );

    const actualResources = await Promise.all(
      resourcesEntries.map(
        ([resourcePath]) => fs.readFile(path.join(outputDir, `${pageFileName}_files`, resourcePath.slice(1).replace('/', '-')), 'utf-8'),
      ),
    );

    expect(actualResources).toEqual(expectedResources);
  });

  it('throws on network errors', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock.disableNetConnect();

    await expect(downloadPage(pageUrl, outputDir)).rejects.toThrow(/Nock: Disallowed net connect/);
  });

  it('throws error when page unavailable', async () => {
    const outputDir = await helpers.makeOutputDir();

    nock(pageUrl).get('/').reply(404);

    await expect(downloadPage(pageUrl, outputDir)).rejects.toThrow(
      `Request failed with status code 404 (${pageUrl})`,
    );
  });

  it('throws error when output path not exists', async () => {
    const outputDir = '/notexitst';
    const outputFilePath = path.join(outputDir, `${pageFileName}.html`);

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('basic.html'));

    await expect(downloadPage(pageUrl, outputDir)).rejects.toThrow(`ENOENT: no such file or directory, open '${outputFilePath}'`);
  });

  it('throws error when asset not available', async () => {
    const outputDir = await helpers.makeOutputDir();
    const [lastEntryPath] = resourcesEntries[resourcesEntries.length - 1];

    nock(pageUrl).get('/').replyWithFile(200, helpers.resolveFixturePath('assets.html'));

    resourcesEntries.forEach(([resourcePath, resourceFile]) => {
      if (resourcePath === lastEntryPath) {
        nock(pageUrl).get(resourcePath).reply(404);
      } else {
        nock(pageUrl).get(resourcePath).replyWithFile(200, resourceFile);
      }
    });

    expect.assertions(3);

    try {
      await downloadPage(pageUrl, outputDir);
    } catch (error) {
      expect(error.toString()).toMatch('ListrError: Something went wrong');
      expect(error.errors).toHaveLength(1);

      const [assetError] = error.errors;

      expect(assetError.toString()).toMatch(`Request failed with status code 404 (${pageUrl}${lastEntryPath})`);
    }
  });
});

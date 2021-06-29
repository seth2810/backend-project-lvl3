import path from 'path';
import Listr from 'listr';
import debug from 'debug';
import { URL } from 'url';
import axios from 'axios';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import axiosDebugLog from 'axios-debug-log';

const client = axios.create();

const log = debug('page-loader');

axiosDebugLog.addLogger(client, log);

const resourcePathAttributes = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const slugifyUrl = (url) => {
  const { hostname, pathname } = url;
  const words = `${hostname}${pathname}`.match(/\w+/gi);

  return words.join('-');
};

const slugifyResourceUrl = (url) => {
  const { dir, name, ext } = path.parse(url.pathname);

  const fileExtension = ext || '.html';
  const fileNamePath = path.join(dir, name);
  const fileNameSlug = slugifyUrl(new URL(fileNamePath, url.origin));

  return `${fileNameSlug}${fileExtension}`;
};

const extractResources = (html, originUrl, resourcesDirName) => {
  const $ = cheerio.load(html, { decodeEntities: false });
  const resources = [];

  Object.entries(resourcePathAttributes).forEach(([tag, attribute]) => {
    const relativeResources = $(`${tag}:not([${attribute}=""])`)
      .toArray()
      .map((element) => $(element))
      .map(($element) => ({ $element, url: new URL($element.attr(attribute), originUrl) }))
      .filter(({ url }) => url.origin === originUrl);

    relativeResources.forEach(({ $element, url }) => {
      const fileUrl = url.toString();
      const filePath = path.join(resourcesDirName, slugifyResourceUrl(url));

      resources.push({ fileUrl, filePath });

      $element.attr(attribute, filePath);
    });
  });

  const modifiedHtml = $.html();

  return { html: modifiedHtml, resources };
};

const downloadResource = (url, outputPath) => {
  log('download asset "%s" to "%s"', url, outputPath);

  return client.get(url, { responseType: 'arraybuffer' })
    .then(({ data }) => fs.writeFile(outputPath, data));
};

/**
 1. prepare url
 2. download page html
 3. detect assets and modify html
 4. save modified html to output dir
 5. create assets download tasks
 6. wrap tasks with listr
 */
export default (url, outputPath = '') => {
  const pageUrl = new URL(url);
  const pageFileName = slugifyUrl(pageUrl);
  const resourcesDirName = `${pageFileName}_files`;
  const resourcesDirPath = path.join(outputPath, resourcesDirName);
  const pageFilePath = path.join(outputPath, `${pageFileName}.html`);

  log('load', pageUrl);
  log('output', outputPath);

  return client.get(url)
    .then((response) => {
      log('create assets directory', resourcesDirPath);

      return fs.access(resourcesDirPath)
        .catch(() => fs.mkdir(resourcesDirPath))
        .then(() => response.data);
    })
    .then((data) => {
      const { html, resources } = extractResources(data, pageUrl.origin, resourcesDirName);

      log('save page file', pageFilePath);

      return fs.appendFile(pageFilePath, html)
        .then(() => resources);
    })
    .then((resources) => {
      const tasks = resources.map(({ fileUrl, filePath }) => ({
        title: fileUrl,
        task: () => downloadResource(fileUrl, path.join(outputPath, filePath)),
      }));

      const listr = new Listr(tasks, { concurrent: true, exitOnError: false });

      return listr.run();
    })
    .then(() => pageFilePath);
};

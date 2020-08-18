import path from 'path';
import { URL } from 'url';
import axios from 'axios';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import axiosDebugLog from 'axios-debug-log';

import logger from './logger.js';

const client = axios.create();

axiosDebugLog.addLogger(client, logger);

const getUrlAddress = (url) => url.substr(url.indexOf('//') + 2);

const convertUrlToFileName = (url) => {
  const words = Array.from(url.matchAll(/[A-Za-z0-9]+/g));

  return words.join('-');
};

const convertResourceUrlToFileName = (url) => {
  const extension = path.extname(url);
  const urlWithoutExtension = url.substr(0, url.length - extension.length);

  return `${convertUrlToFileName(urlWithoutExtension)}${extension}`;
};

const getResourceUrlAttrubute = (tag) => {
  switch (tag) {
    case 'link':
      return 'href';
    case 'img':
    case 'script':
      return 'src';
    default:
      throw new Error(`Unable to define path attribute for tag '${tag}'`);
  }
};

const requestUrl = (url) => {
  const request = client.get(url, { responseType: 'arraybuffer' });

  return request.then(({ data }) => data);
};

const extractResourcesUrls = (html) => {
  const $ = cheerio.load(html);
  const elements = $('link[rel],script[src],img[src]').toArray();

  return elements.map((element) => {
    const { tagName } = element;
    const attribute = getResourceUrlAttrubute(tagName);

    return $(element).attr(attribute);
  });
};

const isRelativeResourceUrl = (url, baseUrl) => {
  const urlWithBase = new URL(url, baseUrl);

  if (urlWithBase.href === url) {
    return false;
  }

  return path.extname(url) !== '';
};

const modifyResourcesPaths = (html, resourcesUrls, resourcesPath) => {
  const $ = cheerio.load(html);

  $('link[rel],script[src],img[src]').each((index, element) => {
    const { tagName } = element;
    const attribute = getResourceUrlAttrubute(tagName);
    const resourceUrl = $(element).attr(attribute);

    if (!resourcesUrls.includes(resourceUrl)) {
      return;
    }

    const resourceFilePath = path.join(resourcesPath, convertResourceUrlToFileName(resourceUrl));

    $(element).attr(attribute, resourceFilePath);
  });

  return $.html();
};

const downloadFile = (url, outputPath) => requestUrl(url)
  .then((data) => fs.appendFile(outputPath, data));

const downloadResources = (resourcesPaths, baseUrl, outputDir) => {
  const promises = resourcesPaths.map((resourcePath) => {
    const resourceUrl = new URL(resourcePath, baseUrl);
    const resourceFilePath = path.join(outputDir, convertResourceUrlToFileName(resourcePath));

    logger('download asset "%s" to "%s"', resourcePath, resourceFilePath);

    return downloadFile(resourceUrl.href, resourceFilePath);
  });

  return Promise.all(promises);
};

const downloadPage = (pageUrl, outputPath) => {
  const pageFileName = convertUrlToFileName(getUrlAddress(pageUrl));

  const resourcesDir = `${pageFileName}_files`;
  const resourcesDirPath = path.join(outputPath, resourcesDir);
  const pageFilePath = path.join(outputPath, `${pageFileName}.html`);

  logger('load page', pageUrl);
  logger('output path', outputPath);

  return requestUrl(pageUrl)
    .then((data) => data.toString('utf-8'))
    .then((html) => {
      const resourcesUrls = extractResourcesUrls(html);
      const relativeResourcesUrls = resourcesUrls.filter(
        (value) => isRelativeResourceUrl(value, pageUrl),
      );
      const modifiedHtml = modifyResourcesPaths(html, relativeResourcesUrls, resourcesDir);

      logger('save page file', pageFilePath);

      return fs.appendFile(pageFilePath, modifiedHtml)
        .then(() => {
          logger('create assets directory', resourcesDirPath);

          return fs.mkdir(resourcesDirPath);
        })
        .then(() => downloadResources(relativeResourcesUrls, pageUrl, resourcesDirPath));
    });
};

export default downloadPage;

import path from 'path';
import axios from 'axios';
import { promises as fs } from 'fs';

const convertUrlToFilename = (url) => {
  const address = url.substr(url.indexOf('//') + 2);

  return address.replace(/[^A-Za-z0-9]/g, '-');
};

const downloadPage = (pageUrl, outputDir) => {
  const fileName = convertUrlToFilename(pageUrl);
  const outputPath = path.join(outputDir, `${fileName}.html`);

  return axios.get(pageUrl)
    .then(({ data }) => data)
    .then((data) => fs.appendFile(outputPath, data));
};

export default downloadPage;

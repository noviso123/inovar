
const https = require('https');

const url = 'https://inovar-backend-893228897791.southamerica-east1.run.app';

console.log(`Checking ${url}...`);

const check = (path) => {
  return new Promise((resolve) => {
    https.get(`${url}${path}`, (res) => {
      console.log(`${path}: ${res.statusCode}`);
      res.on('data', (d) => process.stdout.write(d));
      resolve();
    }).on('error', (e) => {
      console.error(e);
      resolve();
    });
  });
};

(async () => {
  await check('/health');
  await check('/api/health');
  await check('/');
})();

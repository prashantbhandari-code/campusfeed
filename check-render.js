const https = require('https');
const endpoints = [
  '/v1/services/srv-da8opjoae00c73dii46g/deploys/dep-da8uqmji8nus73be5790/log_lines',
  '/v1/services/srv-da8opjoae00c73dii46g/deploys/dep-da8uqmji8nus73be5790/events',
];
for (const ep of endpoints) {
  const options = {
    hostname: 'api.render.com',
    path: ep,
    headers: { 'Authorization': 'Bearer rnd_SLIdTgKjs0kH9pZ50auCXgdQQFj4' }
  };
  https.get(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => { if (res.statusCode === 200) console.log(`${ep}:`, data.substring(0, 2000)); });
  });
}

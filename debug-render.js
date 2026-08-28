const https = require('https');

const options = {
  hostname: 'api.render.com',
  path: '/v1/services/srv-da8opjoae00c73dii46g/env-vars',
  method: 'GET',
  headers: { 'Authorization': 'Bearer rnd_SLIdTgKjs0kH9pZ50auCXgdQQFj4' }
};

https.get(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const envVars = JSON.parse(body);
    envVars.forEach(item => {
      console.log(`${item.envVar.key}: "${item.envVar.value.substring(0, 30)}..."`);
    });
  });
});

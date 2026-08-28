const https = require('https');
const options = {
  hostname: 'api.render.com',
  path: '/v1/services/srv-da8opjoae00c73dii46g/env-vars',
  headers: { 'Authorization': 'Bearer rnd_SLIdTgKjs0kH9pZ50auCXgdQQFj4' }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 3000));
  });
});

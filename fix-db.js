const https = require('https');

const postData = JSON.stringify({
  envVar: {
    key: 'DATABASE_URL',
    value: 'postgresql://postgres.cddlyuhoehvcfygychqy:9807855954campus@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
  }
});

const postOptions = {
  hostname: 'api.render.com',
  path: '/v1/services/srv-da8opjoae00c73dii46g/env-vars',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rnd_SLIdTgKjs0kH9pZ50auCXgdQQFj4',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(postOptions, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('POST Status:', res.statusCode);
    console.log('POST Response:', body.substring(0, 500));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(postData);
req.end();

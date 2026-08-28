const https = require('https');

const putData = 'envVars[0][key]=GOOGLE_CLIENT_ID&envVars[0][value]=696907098890-mue46bbeohbspua1t9r97gpv2ptm1c1j.apps.googleusercontent.com&envVars[1][key]=GOOGLE_CLIENT_SECRET&envVars[1][value]=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';

const options = {
  hostname: 'api.render.com',
  path: '/v1/services/srv-da8opjoae00c73dii46g/env-vars',
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer rnd_SLIdTgKjs0kH9pZ50auCXgdQQFj4',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(putData)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body.substring(0, 500));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(putData);
req.end();

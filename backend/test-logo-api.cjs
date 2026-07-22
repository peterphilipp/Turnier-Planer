const http = require('http');

const data = JSON.stringify({
  name: 'TSV Holm',
  primaryColor: '#0d6efd',
  logo: 'data:image/png;base64,test123'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/clubs/1',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();

const https = require('https');
const http = require('http');

const postData = JSON.stringify({
  fullName: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  agreedToTerms: true
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Signup response:', response);
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('Test user created successfully!');
        console.log('Token:', response.data?.token);
      } else {
        console.log('Signup failed:', response.message);
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error creating test user:', error);
});

req.write(postData);
req.end();
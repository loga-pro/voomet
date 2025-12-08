const crypto = require('crypto');

const AK = '31319574';
const SK = 'eqYamJszw0wchqKaKKi'; // keep secret locally
const path = '/artemis/api/attendance/v1/report';

// Put the exact raw body you will POST here (no pretty-print differences)
const bodyObj = {
  attendanceReportRequest: {
    pageNo: 1,
    pageSize: 20
  }
};

// IMPORTANT: use a deterministic serialization: no extra spaces/newlines
const body = JSON.stringify(bodyObj);

// MD5 of body, base64 encoded
const md5 = crypto.createHash('md5').update(body, 'utf8').digest();
const md5B64 = md5.toString('base64');

// nonce and timestamp
const nonce = crypto.randomUUID();
const timestamp = String(Date.now());

// build stringToSign exactly (newlines)
const stringToSign = [
  'POST',
  'application/json',
  md5B64,
  `x-ca-key:${AK}`,
  `x-ca-nonce:${nonce}`,
  `x-ca-timestamp:${timestamp}`,
  path
].join('\n');

// HMAC-SHA256 with SK, then base64
const signature = crypto.createHmac('sha256', SK).update(stringToSign, 'utf8').digest('base64');

console.log('BODY:', body);
console.log('MD5 (base64):', md5B64);
console.log('x-ca-nonce:', nonce);
console.log('x-ca-timestamp:', timestamp);
console.log('stringToSign:\n' + stringToSign);
console.log('x-ca-signature:', signature);

console.log('\nPostman headers to use:');
console.log('Content-Type: application/json');
console.log('Accept: application/json');
console.log('x-ca-key: ' + AK);
console.log('x-ca-nonce: ' + nonce);
console.log('x-ca-timestamp: ' + timestamp);
console.log('x-ca-signature-headers: x-ca-key,x-ca-nonce,x-ca-timestamp');
console.log('x-ca-signature: ' + signature);
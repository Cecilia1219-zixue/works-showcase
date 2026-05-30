const cloudbase = require('@cloudbase/node-sdk');

const ENV_ID = 'works-showcase-d2giub4pr5d687848';

const app = cloudbase.init({
  env: ENV_ID,
  credentials: {
    privateKey: '', // 需要私钥
  }
});

// 用匿名登录的 public key 模拟
const PUB_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3dvcmtzLXNob3djYXNlLWQyZ2l1YjRwcjVkNjg3ODQ4LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJ3b3Jrcy1zaG93Y2FzZS1kMmdpdWI0cHI1ZDY4Nzg0OCIsImV4cCI6NDA4MzY2MDYyNiwiaWF0IjoxNzc5OTc3NDI2LCJub25jZSI6IlBSdHgtMm1GUlZ1OXFkM0p5ejU1aWciLCJhdF9oYXNoIjoiUFJ0eC0ybUZSVnU5cWQzSnl6NTVpZyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJ3b3Jrcy1zaG93Y2FzZS1kMmdpdWI0cHI1ZDY4Nzg0OCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.hbLxMthyDPhSvGwtKo-PpjGfyejWQir39akNphU_pxYr5aW_MRC-crr-g2nznaTWcnvkjDLlXrJAxd8qjRQ7y5H6S_s8QOZ9LllWmEbDGU2IDV9-Z9F6R_-I3AFy80O6l-vVqEH2V3uTV7gOkGDHq9Rebf0adPIWs3Iv9Lgp-sU5MhZoXgluu-rkxDQPr3Lmaw1GL2O2t7QCp4fmfAJjBkBwgEY3hloe8LdO6_xe8fzAKRzMkc9o1D9ZgPplOARhj-lIQK6JVPjHpGYelYJmlMEq_ePQWzQ7HWKwucoPnspi11hnVP9-NQzesOYRMpjww7sIO5QWhTbyIat60TQbOw';

// 方式1: 尝试用 public key 初始化
try {
  const app2 = cloudbase.init({
    env: ENV_ID,
    anonymousAuth: PUB_KEY
  });
  
  console.log('Testing callFunction with anonymous auth...');
  app2.callFunction({
    name: 'login',
    data: { code: 'test_code_123' }
  }).then(res => {
    console.log('SUCCESS:', JSON.stringify(res, null, 2));
  }).catch(err => {
    console.log('ERROR:', err.message);
    console.log('Full error:', JSON.stringify(err, null, 2));
  });
} catch(e) {
  console.log('Init error:', e.message);
}

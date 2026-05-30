const ENV_ID = 'works-showcase-d2giub4pr5d687848';
const PUB_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3dvcmtzLXNob3djYXNlLWQyZ2l1YjRwcjVkNjg3ODQ4LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJ3b3Jrcy1zaG93Y2FzZS1kMmdpdWI0cHI1ZDY4Nzg0OCIsImV4cCI6NDA4MzY2MDYyNiwiaWF0IjoxNzc5OTc3NDI2LCJub25jZSI6IlBSdHgtMm1GUlZ1OXFkM0p5ejU1aWciLCJhdF9oYXNoIjoiUFJ0eC0ybUZSVnU5cWQzSnl6NTVpZyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJ3b3Jrcy1zaG93Y2FzZS1kMmdpdWI0cHI1ZDY4Nzg0OCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.hbLxMthyDPhSvGwtKo-PpjGfyejWQir39akNphU_pxYr5aW_MRC-crr-g2nznaTWcnvkjDLlXrJAxd8qjRQ7y5H6S_s8QOZ9LllWmEbDGU2IDV9-Z9F6R_-I3AFy80O6l-vVqEH2V3uTV7gOkGDHq9Rebf0adPIWs3Iv9Lgp-sU5MhZoXgluu-rkxDQPr3Lmaw1GL2O2t7QCp4fmfAJjBkBwgEY3hloe8LdO6_xe8fzAKRzMkc9o1D9ZgPplOARhj-lIQK6JVPjHpGYelYJmlMEq_ePQWzQ7HWKwucoPnspi11hnVP9-NQzesOYRMpjww7sIO5QWhTbyIat60TQbOw';

// CloudBase HTTP API v2 - 匿名认证方式
const url = `https://ap-shanghai.tcb-api.tencentcloudapi.com/api/v1/function/invoke`;

(async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tcb-env': ENV_ID,
      'Authorization': 'Bearer ' + PUB_KEY
    },
    body: JSON.stringify({
      name: 'login',
      params: { code: 'test_123' }
    })
  });
  
  console.log('Status:', res.status);
  const body = await res.text();
  console.log('Body:', body.substring(0, 500));
})();

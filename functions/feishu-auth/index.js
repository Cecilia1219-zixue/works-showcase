const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { code } = event;
  
  if (!code) {
    return { code: 400, message: '缺少 code 参数' };
  }
  
  const APP_ID = 'cli_aa9f2a2fb6395bdf';
  const APP_SECRET = 'rfXKyH5jiyf8lYIDB0HqOdAHCpLSDgiA';
  
  try {
    // 1. 用 code 换取 app_access_token
    const appTokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const appTokenData = await appTokenRes.json();
    
    if (appTokenData.code !== 0) {
      return { code: 500, message: '获取 app_access_token 失败', detail: appTokenData };
    }
    
    const appAccessToken = appTokenData.app_access_token;
    
    // 2. 用 code 换取 user_access_token
    const userTokenRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + appAccessToken
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code })
    });
    const userTokenData = await userTokenRes.json();
    
    if (userTokenData.code !== 0) {
      return { code: 500, message: '获取 user_access_token 失败', detail: userTokenData };
    }
    
    const userAccessToken = userTokenData.data.access_token;
    const openId = userTokenData.data.open_id;
    
    // 3. 获取用户详细信息
    const userInfoRes = await fetch('https://open.feishu.cn/open-apis/contact/v3/users/me', {
      headers: { 'Authorization': 'Bearer ' + userAccessToken }
    });
    const userInfoData = await userInfoRes.json();
    
    if (userInfoData.code !== 0) {
      return { code: 500, message: '获取用户信息失败', detail: userInfoData };
    }
    
    const user = userInfoData.data.user;
    
    return {
      code: 0,
      data: {
        open_id: openId,
        name: user.name,
        en_name: user.en_name,
        avatar_url: user.avatar?.avatar_url_240 || user.avatar?.avatar_thumb?.uri,
        department_ids: user.department_ids || [],
        user_id: user.user_id
      }
    };
  } catch (e) {
    return { code: 500, message: '云函数执行异常', detail: e.message };
  }
};

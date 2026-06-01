// 统一后端 API - MySQL via CloudBase SDK (HTTP API, 自动认证)
// 表：visitors, works, likes, comments, shares, work_stats
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const RDB_BASE = 'https://works-showcase-d2giub4pr5d687848.api.tcloudbasegateway.com/v1/rdb/rest';
const API_BASE = 'https://works-showcase-d2giub4pr5d687848-1437802595.ap-shanghai.app.tcloudbase.com/api';
const ALLOWED_TABLES = ['visitors', 'works', 'likes', 'comments', 'shares', 'work_stats'];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
}

function ok(data) { return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ code: 0, data }) }; }
function err(msg, c = 500) { return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ code: c, message: msg }) }; }

function parseInput(event) {
  let action, collection, params = {};
  if (event.queryStringParameters) {
    action = event.queryStringParameters.action;
    collection = event.queryStringParameters.collection;
    try { params = JSON.parse(decodeURIComponent(event.queryStringParameters.params || '{}')); } catch (e) { }
  }
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      if (body.action) action = body.action;
      if (body.collection) collection = body.collection;
      if (body.params) params = body.params;
    } catch (e) { }
  }
  return { action, collection, params: params || {} };
}

function safeValue(v) {
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return v;
}

function parseJsonList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [value];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return [value];
  }
}

function stripQuery(url) {
  return String(url || '').split('?')[0];
}

function fileIdFromUrl(url) {
  const raw = stripQuery(url);
  if (!raw || raw.indexOf('tcb.qcloud.la/') === -1) return '';
  const idx = raw.indexOf('.tcb.qcloud.la/');
  if (idx < 0) return '';
  const host = raw.slice(raw.indexOf('//') + 2, idx);
  const path = raw.slice(idx + '.tcb.qcloud.la/'.length);
  return `cloud://works-showcase-d2giub4pr5d687848.${host}/${path}`;
}

function normalizeImageItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const stableUrl = stripQuery(item);
    return {
      fileID: item.indexOf('cloud://') === 0 ? item : fileIdFromUrl(stableUrl),
      url: stableUrl
    };
  }
  const url = item.url || item.src || item.tempFileURL || '';
  const fileID = item.fileID || item.fileId || item.cloudPath || fileIdFromUrl(url);
  return {
    ...item,
    fileID,
    url: stripQuery(url)
  };
}

async function refreshImageUrls(images) {
  const normalized = parseJsonList(images).map(normalizeImageItem).filter(Boolean);
  return normalized.map(img => {
    if (!img.fileID) return img.url ? img : '';
    return {
      ...img,
      fileID: img.fileID,
      url: `${API_BASE}?action=image&fileID=${encodeURIComponent(img.fileID)}`,
      stableUrl: img.stableUrl || img.url || img.fileID || ''
    };
  }).filter(img => typeof img === 'string' ? img : img.url);
}

async function hydrateWorksRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return Promise.all(rows.map(async row => ({
    ...row,
    images: await refreshImageUrls(row.images || row.cover_image)
  })));
}

function buildQueryParams(table, options = {}) {
  const { where = {}, orderBy, orderType = 'desc', limit = 100, offset = 0 } = options;
  let path = `/${table}?limit=${limit}&offset=${offset}`;
  
  for (const [k, v] of Object.entries(where)) {
    path += `&${k}=eq.${encodeURIComponent(v)}`;
  }
  
  if (orderBy) {
    path += `&order=${orderBy}.${orderType === 'asc' ? 'asc' : 'desc'}`;
  }
  
  return path;
}

async function rdbFetch(path, options = {}) {
  const { method = 'GET', body, headers: extraHeaders = {} } = options;
  const mysql = app.mysql();
  const fullUrl = path.startsWith('http') ? path : RDB_BASE + path;
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extraHeaders
  };
  
  const resp = await mysql.fetch(fullUrl, { method, headers, body: body ? JSON.stringify(body) : undefined });
  
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`RDB 请求失败 [${resp.status}]: ${errText}`);
  }
  
  const text = await resp.text();
  if (!text) return [];
  return JSON.parse(text);
}

async function rdbFetchWithCount(path) {
  const mysql = app.mysql();
  const fullUrl = path.startsWith('http') ? path : RDB_BASE + path;
  
  const resp = await mysql.fetch(fullUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Prefer': 'count=exact' }
  });
  
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`RDB 请求失败 [${resp.status}]: ${errText}`);
  }
  
  const text = await resp.text();
  const data = text ? JSON.parse(text) : [];
  const totalHeader = resp.headers.get('content-range') || '0/0';
  const match = totalHeader.match(/\/(\d+)$/);
  
  return { data, total: match ? parseInt(match[1]) : 0 };
}

async function handleUpload(event) {
  try {
    const body = event.body;
    if (!body) return err('没有上传文件', 400);

    let fileBuffer, fileName;
    
    if (event.isBase64Encoded) {
      fileBuffer = Buffer.from(body, 'base64');
      fileName = event.queryStringParameters?.filename || `upload_${Date.now()}.jpg`;
    } else {
      fileBuffer = Buffer.from(body, 'base64');
      fileName = event.queryStringParameters?.filename || `upload_${Date.now()}.jpg`;
    }

    if (!fileBuffer) return err('无法获取文件内容', 400);

    const uploadResult = await app.uploadFile({
      cloudPath: `works/${Date.now()}_${fileName}`,
      fileContent: fileBuffer
    });

    const tempUrl = await app.getTempFileURL({
      fileList: [uploadResult.fileID]
    });

    const fileUrl = tempUrl.fileList[0]?.tempFileURL || uploadResult.fileID;
    const stableUrl = fileIdFromUrl(fileUrl) ? stripQuery(fileUrl) : '';

    return ok({ fileID: uploadResult.fileID, url: fileUrl, stableUrl, fileName });
  } catch (e) {
    console.error('Upload error:', e.message);
    return err('上传失败: ' + e.message);
  }
}

async function handleExec(event) {
  try {
    const mysql = app.mysql();
    const sql = event.queryStringParameters?.sql || (event.body && typeof event.body === 'object' ? event.body.sql : null);
    if (!sql) return err('缺少 sql 参数', 400);
    
    const resp = await mysql.fetch(RDB_BASE + '/sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    
    const text = await resp.text();
    if (!resp.ok) return err('SQL 执行失败: ' + text, 500);
    
    return ok({ result: text ? JSON.parse(text) : null });
  } catch (e) {
    console.error('Exec error:', e.message);
    return err('SQL 执行错误: ' + e.message);
  }
}

function imageContentType(fileID) {
  const lower = String(fileID || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function handleImageProxy(event) {
  try {
    const fileID = event.queryStringParameters?.fileID || '';
    if (!fileID) return err('缺少 fileID 参数', 400);
    const res = await app.downloadFile({ fileID });
    const buffer = res.fileContent;
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        ...corsHeaders(),
        'Content-Type': imageContentType(fileID),
        'Cache-Control': 'public, max-age=300'
      },
      body: Buffer.from(buffer).toString('base64')
    };
  } catch (e) {
    console.error('Image proxy error:', e.message);
    return err('图片读取失败: ' + e.message, 404);
  }
}

exports.main = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: '' };

  if (event.queryStringParameters?.action === 'upload') {
    return await handleUpload(event);
  }

  if (event.queryStringParameters?.action === 'image') {
    return await handleImageProxy(event);
  }

  const input = parseInput(event);

  if (input.action === 'fileUrl') {
    const raw = event.queryStringParameters?.fileID || event.queryStringParameters?.url || input.params.fileID || input.params.url || '';
    const image = normalizeImageItem(raw);
    return ok({ images: await refreshImageUrls([image]) });
  }

  // Handle SQL execution for table schema fixes
  if (input.action === 'exec' || event.queryStringParameters?.action === 'exec') {
    return await handleExec(event);
  }

  const { action, collection, params } = input;
  if (!action || !collection) return err('缺少 action 或 collection 参数', 400);
  if (!ALLOWED_TABLES.includes(collection)) return err('无效的表名: ' + collection, 400);

  try {
    let result;

    switch (action) {
      case 'get': {
        const { where, orderBy, orderType = 'desc', limit = 100, skip = 0 } = params;
        const path = buildQueryParams(collection, { where, orderBy, orderType, limit, offset: skip });
        result = await rdbFetch(path);
        if (collection === 'works') result = await hydrateWorksRows(result);
        break;
      }

      case 'add': {
        const data = params.data || {};
        const processed = {};
        for (const [k, v] of Object.entries(data)) {
          processed[k] = safeValue(v);
        }
        const r = await rdbFetch(`/${collection}`, { method: 'POST', body: processed });
        result = { id: r[0]?.id, affectedRows: r.length };
        break;
      }

      case 'update': {
        const { docId, data, query } = params;
        let path = `/${collection}?`;
        const conditions = [];
        if (docId) conditions.push(`id=eq.${docId}`);
        else if (query) {
          for (const [k, v] of Object.entries(query)) {
            conditions.push(`${k}=eq.${encodeURIComponent(v)}`);
          }
        } else { return err('更新需要 docId 或 query', 400); }
        path += conditions.join('&');
        
        const processed = {};
        for (const [k, v] of Object.entries(data || {})) {
          processed[k] = safeValue(v);
        }
        const r = await rdbFetch(path, { method: 'PATCH', body: processed });
        result = { affectedRows: r.length };
        break;
      }

      case 'delete': {
        const { docId, query } = params;
        let path = `/${collection}?`;
        const conditions = [];
        if (docId) conditions.push(`id=eq.${docId}`);
        else if (query) {
          for (const [k, v] of Object.entries(query)) {
            conditions.push(`${k}=eq.${encodeURIComponent(v)}`);
          }
        } else { return err('删除需要 docId 或 query', 400); }
        path += conditions.join('&');
        const r = await rdbFetch(path, { method: 'DELETE' });
        result = { affectedRows: r.length };
        break;
      }

      case 'count': {
        const q = params.query || {};
        const path = buildQueryParams(collection, { where: q, limit: 0 });
        const { total } = await rdbFetchWithCount(path);
        result = { total };
        break;
      }

      case 'doc': {
        result = await rdbFetch(`/${collection}?id=eq.${params.docId}&limit=1`);
        if (collection === 'works') result = await hydrateWorksRows(result);
        break;
      }

      case 'upsert': {
        const { query: uq, data } = params;
        const existing = await rdbFetch(`/${collection}?${Object.keys(uq).map(k => `${k}=eq.${encodeURIComponent(uq[k])}`).join('&')}&limit=1`);
        if (existing.length > 0) {
          const processed = {};
          for (const [k, v] of Object.entries(data || {})) {
            processed[k] = safeValue(v);
          }
          const r = await rdbFetch(`/${collection}?${Object.keys(uq).map(k => `${k}=eq.${encodeURIComponent(uq[k])}`).join('&')}`, { method: 'PATCH', body: processed });
          result = { id: existing[0].id, affectedRows: r.length, action: 'updated' };
        } else {
          const merged = { ...uq, ...data };
          const processed = {};
          for (const [k, v] of Object.entries(merged)) {
            processed[k] = safeValue(v);
          }
          const r = await rdbFetch(`/${collection}`, { method: 'POST', body: processed });
          result = { id: r[0]?.id, affectedRows: r.length, action: 'inserted' };
        }
        break;
      }

      default:
        return err('不支持的 action: ' + action, 400);
    }

    return ok(result);
  } catch (e) {
    console.error(`API error [${action}/${collection}]:`, e.message);
    return err('操作失败: ' + e.message);
  }
};

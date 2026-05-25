const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 数据库初始化
const db = new Database('./data.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    images TEXT,
    likes INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id INTEGER NOT NULL,
    nickname TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS liked_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id INTEGER NOT NULL,
    ip TEXT NOT NULL,
    UNIQUE(work_id, ip)
  );
`);

// 上传目录
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('只支持图片文件'));
}});

app.use(express.json());
app.use(express.static('public'));

// 获取所有作品
app.get('/api/works', (req, res) => {
  const works = db.prepare('SELECT * FROM works ORDER BY sort_order ASC, id DESC').all();
  works.forEach(w => { w.images = w.images ? JSON.parse(w.images) : []; });
  res.json(works);
});

// 获取单个作品评论
app.get('/api/works/:id/comments', (req, res) => {
  const comments = db.prepare('SELECT * FROM comments WHERE work_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(comments);
});

// 点赞
app.post('/api/works/:id/like', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const workId = req.params.id;
  try {
    db.prepare('INSERT INTO liked_ips (work_id, ip) VALUES (?, ?)').run(workId, ip);
    db.prepare('UPDATE works SET likes = likes + 1 WHERE id = ?').run(workId);
    const work = db.prepare('SELECT likes FROM works WHERE id = ?').get(workId);
    res.json({ success: true, likes: work.likes });
  } catch (e) {
    // 已点赞则取消
    db.prepare('DELETE FROM liked_ips WHERE work_id = ? AND ip = ?').run(workId, ip);
    db.prepare('UPDATE works SET likes = MAX(0, likes - 1) WHERE id = ?').run(workId);
    const work = db.prepare('SELECT likes FROM works WHERE id = ?').get(workId);
    res.json({ success: true, likes: work.likes, unliked: true });
  }
});

// 检查是否已点赞
app.get('/api/works/:id/liked', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const row = db.prepare('SELECT id FROM liked_ips WHERE work_id = ? AND ip = ?').get(req.params.id, ip);
  res.json({ liked: !!row });
});

// 添加评论
app.post('/api/works/:id/comments', (req, res) => {
  const { nickname, content } = req.body;
  if (!nickname || !content) return res.status(400).json({ error: '昵称和评论内容不能为空' });
  if (content.length > 500) return res.status(400).json({ error: '评论不能超过500字' });
  const result = db.prepare('INSERT INTO comments (work_id, nickname, content) VALUES (?, ?, ?)').run(req.params.id, nickname.slice(0,20), content);
  res.json({ id: result.lastInsertRowid, nickname, content });
});

// ===== 后台管理 API（需要密码） =====
function checkAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ error: '密码错误' });
  next();
}

// 上传图片
app.post('/api/admin/upload', checkAdmin, upload.array('images', 10), (req, res) => {
  const files = req.files.map(f => '/uploads/' + f.filename);
  res.json({ files });
});

// 创建作品
app.post('/api/admin/works', checkAdmin, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM works').get().c;
  if (count >= 100) return res.status(400).json({ error: '最多100个作品' });
  const { title, description, link, images, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: '标题不能为空' });
  const result = db.prepare('INSERT INTO works (title, description, link, images, sort_order) VALUES (?, ?, ?, ?, ?)').run(title, description || '', link || '', JSON.stringify(images || []), sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

// 更新作品
app.put('/api/admin/works/:id', checkAdmin, (req, res) => {
  const { title, description, link, images, sort_order } = req.body;
  db.prepare('UPDATE works SET title=?, description=?, link=?, images=?, sort_order=? WHERE id=?').run(title, description || '', link || '', JSON.stringify(images || []), sort_order || 0, req.params.id);
  res.json({ success: true });
});

// 删除作品
app.delete('/api/admin/works/:id', checkAdmin, (req, res) => {
  db.prepare('DELETE FROM works WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM comments WHERE work_id = ?').run(req.params.id);
  res.json({ success: true });
});

// 验证密码
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ error: '密码错误' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

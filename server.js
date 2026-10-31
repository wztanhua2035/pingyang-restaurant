/* 平阳味道餐厅 · 课堂实时点单服务器
   零依赖（只需要 Node.js 18+）。学生端用 POST 提交，大屏/学生端用 SSE 接收实时更新。
   运行：node server.js        环境变量：PORT（默认 3000）、GROUPS（默认 10）、TEACHER_PASSWORD（可选） */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PY = require('./public/shared.js');

const PORT = +process.env.PORT || 3000;
const GROUPS = Math.max(1, Math.min(40, +process.env.GROUPS || 10));
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });

/* ---------- 教师密码：默认不需要；只有设置了环境变量 TEACHER_PASSWORD 才会启用 ---------- */
const conf = { password: process.env.TEACHER_PASSWORD || '' };
const sameStr = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y); };

/* ---------- 状态 ---------- */
const STATE_FILE = path.join(DATA, 'state.json');
const emptyPlates = () => PY.PLATE_NAMES.map(() => ({ items: [], done: false }));
const newGroup = () => ({ plates: emptyPlates(), submitted: false, submitSeq: 0, submittedAt: 0,
  results: null, ratings: { fluent: 0, correct: 0 }, updatedAt: 0 });
let state = { round: 1, locked: false, seq: 0, groups: {} };
try { const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); if (s && s.groups) state = s; } catch (e) {}
for (let g = 1; g <= GROUPS; g++) if (!state.groups[g]) state.groups[g] = newGroup();

let saveTimer = null;
function save() { clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(STATE_FILE, JSON.stringify(state), () => {}), 400); }

/* ---------- 输入清洗 ---------- */
function cleanPlates(input) {
  const out = emptyPlates();
  if (!Array.isArray(input)) return out;
  for (let i = 0; i < out.length; i++) {
    const p = input[i]; if (!p || !Array.isArray(p.items)) continue;
    out[i].items = p.items.filter(id => typeof id === 'string' && PY.byId(id)).slice(0, PY.MAX_ITEMS);
    out[i].done = !!p.done;
  }
  return out;
}
const validG = g => Number.isInteger(+g) && +g >= 1 && +g <= GROUPS;

/* ---------- SSE 客户端 ---------- */
const clients = new Set();   // {res, role, g}
function onlineCounts() {
  const c = {}; clients.forEach(cl => { if (cl.role === 'student') c[cl.g] = (c[cl.g] || 0) + 1; }); return c;
}
function wallView() {
  return { round: state.round, locked: state.locked, seq: state.seq, groups: state.groups, online: onlineCounts(), n: GROUPS };
}
function studentView(g) {
  return { round: state.round, locked: state.locked, seq: state.seq, group: state.groups[g] };
}
function send(cl, view) { try { cl.res.write('data: ' + JSON.stringify(view) + '\n\n'); } catch (e) {} }
let bcTimer = null;
function broadcast() {
  state.seq++; save();
  if (bcTimer) return;
  bcTimer = setTimeout(() => {
    bcTimer = null;
    const wv = wallView();
    clients.forEach(cl => send(cl, cl.role === 'wall' ? wv : studentView(cl.g)));
  }, 120);
}
setInterval(() => clients.forEach(cl => { try { cl.res.write(': ping\n\n'); } catch (e) {} }), 20000);

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function readJson(req, res, cb) {
  let n = 0; const chunks = [];
  req.on('data', c => { n += c.length; if (n > 64 * 1024) { res.writeHead(413); res.end(); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { cb(JSON.parse(Buffer.concat(chunks).toString() || '{}')); }
    catch (e) { json(res, 400, { error: 'bad json' }); } });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || ext === '.js' ? 'no-cache' : 'public, max-age=86400' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  /* 实时推送 */
  if (req.method === 'GET' && p === '/events') {
    const role = url.searchParams.get('role') === 'wall' ? 'wall' : 'student';
    const g = +url.searchParams.get('g');
    if (role === 'student' && !validG(g)) { res.writeHead(400); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    const cl = { res, role, g };
    clients.add(cl);
    send(cl, role === 'wall' ? wallView() : studentView(g));
    if (role === 'student') broadcast();            // 在线人数变化，通知大屏
    req.on('close', () => { clients.delete(cl); if (role === 'student') broadcast(); });
    return;
  }

  if (req.method === 'POST' && p === '/api/draft') return readJson(req, res, b => {
    if (!validG(b.g)) return json(res, 400, { error: 'bad group' });
    if (state.locked) return json(res, 423, { error: 'locked' });
    const G = state.groups[b.g];
    G.plates = cleanPlates(b.plates); G.updatedAt = Date.now();
    if (b.reopen) { G.submitted = false; }            // 学生点了“改单”
    broadcast(); json(res, 200, { ok: true });
  });

  if (req.method === 'POST' && p === '/api/submit') return readJson(req, res, b => {
    if (!validG(b.g)) return json(res, 400, { error: 'bad group' });
    if (state.locked) return json(res, 423, { error: 'locked' });
    const G = state.groups[b.g];
    const plates = cleanPlates(b.plates);
    if (!plates.some(pl => pl.items.length)) return json(res, 400, { error: 'empty' });
    G.plates = plates;
    G.results = plates.map(pl => pl.items.length ? PY.buildFeedback(pl.items) : null);   // 评分由服务器重新计算
    G.submitted = true; G.submittedAt = Date.now(); G.submitSeq = (G.submitSeq || 0) + 1; G.updatedAt = Date.now();
    broadcast(); json(res, 200, { ok: true, results: G.results });
  });

  /* 教师操作：打分、锁定、下一轮 */
  if (req.method === 'POST' && p === '/api/admin') return readJson(req, res, b => {
    if (conf.password && !sameStr(b.pw || '', conf.password)) return json(res, 401, { error: 'bad password' });
    switch (b.action) {
      case 'check': break;
      case 'rate': {
        if (!validG(b.g) || !['fluent', 'correct'].includes(b.key)) return json(res, 400, { error: 'bad args' });
        const v = Math.max(0, Math.min(3, Math.round(+b.val || 0)));
        state.groups[b.g].ratings[b.key] = v; break; }
      case 'lock': state.locked = true; break;
      case 'unlock': state.locked = false; break;
      case 'newRound':
        state.round++; state.locked = false;
        for (let g = 1; g <= GROUPS; g++) state.groups[g] = newGroup(); break;
      case 'resetGroup':
        if (!validG(b.g)) return json(res, 400, { error: 'bad args' });
        state.groups[b.g] = newGroup(); break;
      default: return json(res, 400, { error: 'unknown action' });
    }
    broadcast(); json(res, 200, { ok: true });
  });

  if (req.method === 'GET' && p === '/api/info') return json(res, 200, { groups: GROUPS, round: state.round });

  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, p);
  res.writeHead(405); res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log(' 平阳味道餐厅 已启动');
  console.log(' 端口：' + PORT + '   组数：' + GROUPS);
  console.log(' 大屏订单墙： /wall.html');
  console.log(' 学生端：     /s.html?g=1 … ' + GROUPS);
  console.log(conf.password ? ' 教师操作：需要密码（TEACHER_PASSWORD）' : ' 教师操作：无需密码（大屏页面直接可用）');
  console.log('==============================================');
});

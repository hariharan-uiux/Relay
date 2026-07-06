const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const QRCode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs');

function lanAddress() {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) for (const n of entries || [])
    if (n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254.')) return n.address;
  return '127.0.0.1';
}

function startRelayServer({ port = 4866, root = __dirname, dataDir = path.join(os.homedir(), 'Relay') } = {}) {
  const storageDir = path.join(dataDir, 'storage');
  const historyFile = path.join(dataDir, 'history.json');
  fs.mkdirSync(storageDir, { recursive: true });
  let history = [];
  try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch {}
  const save = () => fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, 1000), null, 2));
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' }, maxHttpBufferSize: 1e8 });
  const upload = multer({ storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, storageDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[<>:"/\\|?*]/g, '_')}`)
  }), limits: { fileSize: 10 * 1024 * 1024 * 1024 } });
  app.use(express.json({ limit: '20mb' }));
  app.get('/api/info', async (_, res) => {
    const url = `http://${lanAddress()}:${port}`;
    res.json({ name: os.hostname(), address: lanAddress(), port, url, qr: await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: '#171714', light: '#ffffff' } }) });
  });
  app.get('/api/history', (_, res) => res.json(history));
  app.post('/api/upload', upload.array('files', 100), (req, res) => {
    const senderName = req.body.senderName || '';
    const items = (req.files || []).map(f => ({ id: `${Date.now()}-${Math.random()}`, name: f.originalname, size: f.size, mime: f.mimetype, type: 'file', timestamp: new Date().toISOString(), device: senderName || req.ip, path: f.filename, status: 'Complete' }));
    history.unshift(...items); save(); io.emit('history', history); res.json(items);
  });
  app.post('/api/share', (req, res) => {
    const { type = 'text', content = '', senderName = '' } = req.body || {};
    if (!content.trim()) return res.status(400).json({ error: 'Content is required' });
    const item = { id: `${Date.now()}`, name: type === 'link' ? content : content.slice(0, 60), content, type, timestamp: new Date().toISOString(), device: senderName || req.ip, status: 'Complete' };
    history.unshift(item); save(); io.emit('history', history); res.json(item);
  });
  app.get('/api/download/:id', (req, res) => {
    const item = history.find(x => x.id === req.params.id && x.path);
    if (!item) return res.sendStatus(404);
    res.download(path.join(storageDir, item.path), item.name);
  });
  app.delete('/api/history/:id', (req, res) => { history = history.filter(x => x.id !== req.params.id); save(); io.emit('history', history); res.sendStatus(204); });
  function getDeviceType(ua) {
    if (!ua) return { name: 'Unknown Device', icon: 'Smartphone', color: 'blue' };
    const lower = ua.toLowerCase();
    if (lower.includes('iphone')) return { name: 'iPhone', icon: 'Smartphone', color: 'blue' };
    if (lower.includes('ipad')) return { name: 'iPad', icon: 'Tablet', color: 'rose' };
    if (lower.includes('android')) return { name: 'Android Device', icon: 'Smartphone', color: 'mint' };
    if (lower.includes('macintosh') || lower.includes('mac os')) return { name: 'MacBook', icon: 'Laptop', color: 'violet' };
    if (lower.includes('windows')) return { name: 'Windows PC', icon: 'Monitor', color: 'amber' };
    if (lower.includes('linux')) return { name: 'Linux PC', icon: 'Monitor', color: 'coral' };
    return { name: 'Web Client', icon: 'Monitor', color: 'blue' };
  }
  const activeDevices = new Map();

  io.on('connection', socket => {
    const ua = socket.handshake.headers['user-agent'] || '';
    const ip = socket.handshake.address || socket.conn.remoteAddress || '127.0.0.1';
    const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    const device = getDeviceType(ua);
    const deviceInfo = {
      id: socket.id,
      name: device.name,
      ip: cleanIp,
      icon: device.icon,
      color: device.color,
      online: true,
      pic: null
    };
    activeDevices.set(socket.id, deviceInfo);
    io.emit('devices', Array.from(activeDevices.values()));
    socket.emit('history', history);
    io.emit('device-count', io.engine.clientsCount);
    socket.on('update-profile', data => {
      const dev = activeDevices.get(socket.id);
      if (dev && data) {
        if (data.name) dev.name = data.name;
        if (data.hasOwnProperty('pic')) dev.pic = data.pic;
        io.emit('devices', Array.from(activeDevices.values()));
      }
    });
    socket.on('disconnect', () => {
      activeDevices.delete(socket.id);
      io.emit('devices', Array.from(activeDevices.values()));
      io.emit('device-count', io.engine.clientsCount);
    });
  });
  app.use(express.static(path.join(root, 'dist')));
  app.use((req, res, next) => req.method === 'GET' ? res.sendFile(path.join(root, 'dist', 'index.html')) : next());
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', () => resolve({ server, url: `http://${lanAddress()}:${port}`, localUrl: `http://127.0.0.1:${port}` })); });
}
module.exports = { startRelayServer };
if (require.main === module) startRelayServer().then(x => console.log(`Relay running at ${x.url}`)).catch(console.error);

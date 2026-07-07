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
  // Backfill devicePlatform on legacy history items that predate UA detection
  history = history.map(item => {
    if (item.devicePlatform) return item; // already tagged
    const name = (item.name || '').toLowerCase();
    const mime = (item.mime || '').toLowerCase();
    // HEIC/HEIF are iPhone-exclusive formats
    if (/\.heic$|\.heif$/.test(name) || mime === 'image/heic' || mime === 'image/heif') {
      return { ...item, devicePlatform: 'ios', deviceIcon: 'Smartphone', deviceModel: 'iPhone', deviceColor: 'blue' };
    }
    // AAC/M4A often come from Apple devices
    if (/\.m4a$|\.mov$/.test(name)) {
      return { ...item, devicePlatform: 'ios', deviceIcon: 'Smartphone', deviceModel: 'iPhone', deviceColor: 'blue' };
    }
    // Default: mark as local (uploaded from the server machine)
    return { ...item, devicePlatform: 'local', deviceIcon: 'Monitor', deviceModel: 'Local upload', deviceColor: 'amber' };
  });
  const save = () => fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, 1000), null, 2));
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' }, maxHttpBufferSize: 1e8 });
  const upload = multer({ storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, storageDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[<>:"/\\|?*]/g, '_')}`)
  }), limits: { fileSize: 10 * 1024 * 1024 * 1024 } });
  app.use(express.json({ limit: '20mb' }));
  app.get('/api/info', async (req, res) => {
    const clientPort = req.query.clientPort;
    const activePort = (clientPort && clientPort !== String(port)) ? parseInt(clientPort, 10) : port;
    const url = `http://${lanAddress()}:${activePort}`;
    res.json({ name: os.hostname(), address: lanAddress(), port: activePort, url, qr: await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: '#171714', light: '#ffffff' } }) });
  });
  app.get('/api/history', (_, res) => res.json(history));
  app.post('/api/upload', upload.array('files', 100), (req, res) => {
    const senderName = req.body.senderName || '';
    const ua = req.headers['user-agent'] || '';
    const deviceInfo = getDeviceType(ua);
    const items = (req.files || []).map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.originalname,
      size: f.size,
      mime: f.mimetype,
      type: 'file',
      timestamp: new Date().toISOString(),
      device: senderName || deviceInfo.name,
      deviceModel: deviceInfo.model,
      deviceIcon: deviceInfo.icon,
      deviceColor: deviceInfo.color,
      devicePlatform: deviceInfo.platform,
      path: f.filename,
      status: 'Complete'
    }));
    history.unshift(...items); save(); io.emit('history', history); res.json(items);
  });
  app.post('/api/share', (req, res) => {
    const { type = 'text', content = '', senderName = '' } = req.body || {};
    if (!content.trim()) return res.status(400).json({ error: 'Content is required' });
    const ua = req.headers['user-agent'] || '';
    const deviceInfo = getDeviceType(ua);
    const item = {
      id: `${Date.now()}`,
      name: type === 'link' ? content : content.slice(0, 60),
      content,
      type,
      timestamp: new Date().toISOString(),
      device: senderName || deviceInfo.name,
      deviceModel: deviceInfo.model,
      deviceIcon: deviceInfo.icon,
      deviceColor: deviceInfo.color,
      devicePlatform: deviceInfo.platform,
      status: 'Complete'
    };
    history.unshift(item); save(); io.emit('history', history); res.json(item);
  });
  app.get('/api/download/:id', (req, res) => {
    const item = history.find(x => x.id === req.params.id && x.path);
    if (!item) return res.sendStatus(404);
    res.download(path.join(storageDir, item.path), item.name);
  });
  app.get('/api/preview/:id', (req, res) => {
    const item = history.find(x => x.id === req.params.id && x.path);
    if (!item) return res.sendStatus(404);
    res.sendFile(path.join(storageDir, item.path));
  });
  app.delete('/api/history/:id', (req, res) => {
    const item = history.find(x => x.id === req.params.id);
    if (item && item.path) {
      const filePath = path.join(storageDir, item.path);
      try { fs.unlinkSync(filePath); } catch {}
    }
    history = history.filter(x => x.id !== req.params.id); save(); io.emit('history', history); res.sendStatus(204);
  });
  function getDeviceType(ua) {
    if (!ua) return { name: 'Unknown Device', model: '', icon: 'Smartphone', color: 'blue', platform: 'unknown' };
    const lower = ua.toLowerCase();

    // iPhone — extract model from UA e.g. "iPhone OS 17_0" or "iPhone14,3"
    if (lower.includes('iphone')) {
      let model = 'iPhone';
      const osMatch = ua.match(/iPhone OS ([\d_]+)/);
      if (osMatch) model = `iPhone · iOS ${osMatch[1].replace(/_/g, '.')}`;
      return { name: 'iPhone', model, icon: 'Smartphone', color: 'blue', platform: 'ios' };
    }

    // iPad
    if (lower.includes('ipad')) {
      let model = 'iPad';
      const osMatch = ua.match(/CPU OS ([\d_]+)/);
      if (osMatch) model = `iPad · iPadOS ${osMatch[1].replace(/_/g, '.')}`;
      return { name: 'iPad', model, icon: 'Tablet', color: 'rose', platform: 'ios' };
    }

    // Android — extract brand/model
    if (lower.includes('android')) {
      let model = 'Android Device';
      const verMatch = ua.match(/Android ([\d.]+)/);
      const deviceMatch = ua.match(/;\s*([^;)]+)\s*Build\//);
      if (deviceMatch) {
        model = deviceMatch[1].trim();
        if (verMatch) model += ` · Android ${verMatch[1]}`;
      } else if (verMatch) {
        model = `Android ${verMatch[1]}`;
      }
      return { name: deviceMatch ? deviceMatch[1].trim() : 'Android', model, icon: 'Smartphone', color: 'mint', platform: 'android' };
    }

    // macOS
    if (lower.includes('macintosh') || lower.includes('mac os x')) {
      let model = 'Mac';
      const verMatch = ua.match(/Mac OS X ([\d_]+)/);
      if (verMatch) model = `macOS ${verMatch[1].replace(/_/g, '.')}`;
      return { name: 'Mac', model, icon: 'Laptop', color: 'violet', platform: 'mac' };
    }

    // Windows
    if (lower.includes('windows')) {
      let model = 'Windows PC';
      if (lower.includes('windows nt 10') || lower.includes('windows 11')) model = 'Windows 10/11';
      else if (lower.includes('windows nt 6.3')) model = 'Windows 8.1';
      else if (lower.includes('windows nt 6.1')) model = 'Windows 7';
      return { name: 'Windows PC', model, icon: 'Monitor', color: 'amber', platform: 'windows' };
    }

    // Linux
    if (lower.includes('linux')) {
      return { name: 'Linux PC', model: 'Linux', icon: 'Monitor', color: 'coral', platform: 'linux' };
    }

    return { name: 'Web Client', model: 'Browser', icon: 'Globe', color: 'blue', platform: 'web' };
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
      model: device.model,
      ip: cleanIp,
      icon: device.icon,
      color: device.color,
      platform: device.platform,
      online: true,
      pic: null,
      customName: null
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
    socket.on('rename-device', ({ targetId, newName }) => {
      const dev = activeDevices.get(targetId);
      if (dev && newName && newName.trim()) {
        dev.customName = newName.trim();
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

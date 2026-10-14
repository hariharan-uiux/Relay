const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { startRelayServer } = require('./server.cjs');
const isDev = !app.isPackaged;

let mainWindow;
let serverInstance;
let serverUrl;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Relay — Local File Sharing',
    icon: path.join(__dirname, 'public/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.cjs'),
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

async function startServer() {
  try {
    const result = await startRelayServer({ port: 4866, root: __dirname });
    serverInstance = result.server;
    serverUrl = result.url;
    console.log(`Relay server running at ${serverUrl}`);
    return serverUrl;
  } catch (err) {
    console.error('Failed to start server:', err);
    throw err;
  }
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-server-info', () => ({
  url: serverUrl,
  localUrl: `http://127.0.0.1:4866`,
}));

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
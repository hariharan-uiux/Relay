# Relay — Local File Sharing

Private, fast file sharing between your devices on the same network. No cloud, no accounts, no tracking.

![Build Status](https://github.com/USERNAME/REPO/workflows/Build%20%26%20Release/badge.svg)
![Latest Release](https://img.shields.io/github/v/release/USERNAME/REPO)
![License](https://img.shields.io/github/license/USERNAME/REPO)

## Features

- 📁 **Files** — Drag & drop any file (up to 10GB)
- 📝 **Text** — Share snippets, notes, code
- 🔗 **Links** — Send URLs instantly
- 📱 **Cross-platform** — Linux, Windows, macOS, Android, iOS
- 🔒 **Private** — Local network only, zero cloud
- 📱 **QR codes** — Scan to connect from phone

## Install

### Linux
```bash
# AppImage (any distro)
wget https://github.com/USERNAME/REPO/releases/latest/download/Relay-1.0.0.AppImage
chmod +x Relay-1.0.0.AppImage
./Relay-1.0.0.AppImage

# Ubuntu/Debian (.deb)
wget https://github.com/USERNAME/REPO/releases/latest/download/Relay-1.0.0.deb
sudo apt install ./Relay-1.0.0.deb
```

### Windows
Download `Relay Setup 1.0.0.exe` or `Relay-1.0.0-portable.exe` from [Releases](https://github.com/USERNAME/REPO/releases).

### macOS
Build locally (Apple Silicon/Intel):
```bash
git clone https://github.com/USERNAME/REPO.git
cd REPO
npm install
npm run electron:build:mac
```

## Usage

1. Open Relay on your computer
2. Open `http://<shown-ip>:4866` on other devices **or** scan the QR code
3. Share files, text, and links instantly

## Dev

```bash
npm install
npm run dev          # Vite + server (browser)
npm run electron:dev # Electron app with hot reload
npm run build        # Production build
npm run electron:build:linux   # Linux packages
npm run electron:build:win     # Windows packages (on Windows)
```

## Architecture

- **Frontend:** React 18 + Vite + Socket.io-client
- **Backend:** Express + Socket.io + Multer (file upload)
- **Desktop:** Electron 30
- **Protocol:** WebSocket + HTTP over LAN

## License

MIT
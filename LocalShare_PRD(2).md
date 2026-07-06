# Relay - Product Requirements Document (PRD)

# Product Name

**Relay**

**Tagline:** Your private bridge between devices.

## Brand Principles

-   Local-first
-   Privacy-first
-   Fast
-   Simple
-   Modern
-   One-click experience
-   No cloud required

## Vision

Build a **100% local-first**, cross-platform web application for
instantly sharing files, text, links and clipboard data between devices
on the same LAN without any cloud services.

## Goals

-   Zero cloud dependency
-   One-click startup
-   Installable on Windows
-   Browser-based on iPhone/iPad (PWA)
-   Persistent local history
-   Fast peer-to-peer transfers where possible
-   Privacy-first

# Architecture

## Desktop

-   Node.js backend
-   Express API
-   Socket.IO
-   WebRTC for peer-to-peer file transfer
-   SQLite database
-   Local file storage
-   System tray app
-   Electron shell (recommended)

## Mobile

-   PWA
-   Safari support
-   Add to Home Screen
-   Offline capable

# Windows Installer

-   MSI/EXE installer
-   Installs application
-   Bundles Node runtime
-   Creates Start Menu shortcut
-   Creates Desktop shortcut
-   Registers auto-start (optional)
-   Launches server with one click
-   System tray icon
-   Auto update (manual/local package supported)

# One-click Experience

1.  Install.
2.  Double-click Relay.
3.  Server starts.
4.  QR code displayed.
5.  Scan with phone.
6.  Devices reconnect automatically.

# Core Features

## Device Discovery

-   Automatic LAN discovery
-   QR pairing
-   Pair code
-   Trusted devices
-   Rename devices
-   Device avatars
-   Online/offline
-   Last seen
-   IP display
-   Connection quality

## File Sharing

-   Drag/drop
-   Multi-file
-   Folder transfer
-   Resume interrupted transfers
-   Duplicate detection
-   Progress
-   Speed
-   ETA
-   Pause/resume
-   Cancel
-   Large files
-   ZIP creation
-   Preview
-   Thumbnails
-   Batch download

## Clipboard

-   Text sync
-   Image sync
-   Clipboard history
-   Pin items
-   Search
-   Expiry
-   Device-specific clipboard

## Link Sharing

-   URL metadata
-   Favicons
-   Open on another device
-   Collections
-   Favorites
-   Read later

## Media

-   Image gallery
-   Video gallery
-   Audio
-   PDF preview
-   EXIF display
-   Slideshow

## Notes

-   Markdown
-   Rich text
-   Checklists
-   Code blocks
-   Pin
-   Tags

## Search

-   Global search
-   OCR-ready index
-   Filter by type
-   Date
-   Device
-   Tags

## History

Every transfer is stored.

Database records: - id - timestamp - sender - receiver - filename -
size - mime - checksum - storage path - tags - favorite - notes -
transfer duration - status

Never automatically delete unless configured.

## Database

SQLite

Tables: - devices - transfers - clipboard - notes - links - favorites -
tags - settings - sessions

## Settings

-   Theme
-   Accent color
-   Storage location
-   Max history
-   Auto download
-   Auto accept trusted devices
-   Notifications
-   Compression
-   Encryption
-   Startup behavior

## Security

-   LAN only
-   Optional HTTPS
-   Pair approval
-   Trusted devices
-   Device revocation
-   Optional transfer encryption
-   No telemetry
-   No analytics
-   No cloud

## Notifications

-   Incoming transfer
-   Transfer complete
-   Clipboard received
-   Device connected

## File Manager

-   Sort
-   Filter
-   Favorites
-   Recent
-   Trash
-   Restore
-   Export

## Remote Utilities

-   Open URL remotely
-   Send clipboard
-   Media controls
-   Presentation remote
-   Optional mouse/keyboard remote

## Performance

-   Lazy loading
-   Chunked transfers
-   WebRTC fallback to HTTP
-   Background indexing
-   Thumbnail cache

## PWA

-   Offline
-   Home Screen install
-   Responsive
-   IndexedDB cache
-   Background sync where supported

# Tech Stack

Frontend - Next.js - React - Tailwind CSS - TypeScript

Backend - Node.js - Express - Socket.IO - WebRTC - SQLite -
better-sqlite3 - QRCode

Desktop - Electron - electron-builder

Testing - Playwright - Vitest

# Suggested Folder Structure

``` text
apps/
  desktop
  web
packages/
  shared
  server
database/
storage/
```

# Stretch Features

-   OCR
-   Local AI via Ollama
-   Image tagging
-   PDF Q&A
-   Duplicate photo finder
-   LAN chat
-   Shared whiteboard
-   Shared clipboard timeline
-   File version history
-   Encrypted vault
-   Calendar handoff
-   Screen casting
-   LAN music queue
-   Local API
-   Plugin system

# Acceptance Criteria

-   No internet required after first install.
-   All data remains local.
-   One-click launch.
-   iPhone/iPad require only Safari + Add to Home Screen.
-   Windows installer includes everything required.
-   All transfers are searchable and permanently stored until deleted by
    the user.

# UI / UX Requirements

## Design Principles

The application must have a modern, polished, and intuitive interface
that prioritizes speed and simplicity. Every interaction should feel
responsive and require as few steps as possible.

### UI Guidelines

-   Use **shadcn/ui** as the primary component library.
-   Build with **Tailwind CSS**.
-   Follow a clean, minimal, desktop-quality aesthetic.
-   Support both Light and Dark themes.
-   Maintain consistent spacing, typography, and iconography.
-   Use subtle animations and transitions (avoid excessive motion).
-   Responsive layouts for desktop, tablet, and mobile.
-   Touch-friendly controls for iPhone and iPad.
-   Clear empty states, loading states, and error states.
-   Accessible color contrast and keyboard navigation.
-   Provide searchable command palette (Ctrl/Cmd + K).
-   Support drag-and-drop interactions wherever appropriate.

### User Experience Goals

-   Zero learning curve.
-   One-click access to common actions.
-   Fast navigation with minimal clicks.
-   Consistent UI patterns throughout the application.
-   Modern dashboards with cards, tables, dialogs, sheets, toasts,
    dropdowns, tabs, and command menus using shadcn/ui components.

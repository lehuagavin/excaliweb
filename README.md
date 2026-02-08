# ExcaliWeb

A self-hosted web-based file manager and editor for [Excalidraw](https://excalidraw.com/) drawings. Browse, create, and manage `.excalidraw` files with folder hierarchies, auto-save, and Docker deployment support.

## Features

- **File Management** - Create, rename, delete `.excalidraw` files and folders
- **Folder Navigation** - Recursive folder tree with expand/collapse
- **Full Excalidraw Editor** - All drawing tools, shapes, and collaboration features
- **Auto-save** - Changes saved automatically every 10 seconds
- **Quick Save** - `Ctrl+S` / `Cmd+S` for instant save
- **Path Isolation** - All file operations restricted to the data directory
- **Docker Ready** - One-command deployment with PUID/PGID user mapping

## Quick Start

### Development

```bash
git clone https://github.com/yourusername/excaliweb.git
cd excaliweb

# Install dependencies
npm run install:all

# Start frontend + backend
npm run dev:all
```

Open `http://localhost:5173`. The backend automatically uses `data/` as the default workspace.

### Docker Deployment

```bash
# Using Makefile (recommended)
make deploy

# Or using docker-compose
docker-compose -f docker/docker-compose.yml up -d
```

Open `http://localhost:5174`.

## Architecture

```
Browser  →  Nginx (static files)  →  /
         →  Nginx (reverse proxy) →  /api/*  →  Express.js  →  File System
```

- **Frontend**: React 19 + TypeScript + Vite 7 + Excalidraw 0.18
- **Backend**: Express 4 + TypeScript + Node.js 20
- **Deployment**: Docker + Nginx + Supervisor + PUID/PGID user mapping

## Project Structure

```
excaliweb/
├── client/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.tsx       # Excalidraw editor wrapper
│   │   │   ├── Sidebar.tsx      # File tree navigation
│   │   │   ├── Modal.tsx        # File/folder creation & rename modals
│   │   │   └── WorkspaceModal.tsx # Directory browser
│   │   ├── hooks/
│   │   │   └── useAutoSave.ts   # Auto-save logic
│   │   ├── utils/
│   │   │   ├── api.ts           # Backend API client
│   │   │   ├── storage.ts       # LocalStorage persistence
│   │   │   └── fileTreeUtils.ts # Tree helpers
│   │   ├── App.tsx              # Main app component
│   │   └── main.tsx             # Entry point
│   ├── vite.config.ts           # Vite config (dev proxy to :3001)
│   └── package.json
│
├── server/                      # Backend (Express)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── workspace.ts     # Workspace selection
│   │   │   ├── files.ts         # File CRUD
│   │   │   └── filesystem.ts    # Directory browsing
│   │   ├── services/
│   │   │   └── fileSystem.ts    # File operations + path validation
│   │   ├── middleware/
│   │   │   └── errorHandler.ts  # Error & request logging
│   │   ├── types/
│   │   │   └── index.ts         # Shared types
│   │   └── server.ts            # Express server setup
│   └── package.json
│
├── data/                        # Default workspace (Git tracked)
│   └── .gitkeep
│
├── docker/                      # Docker deployment
│   ├── Dockerfile               # Multi-stage build
│   ├── docker-compose.yml       # Compose config
│   ├── entrypoint.sh            # PUID/PGID user mapping
│   ├── nginx.conf               # Reverse proxy config
│   └── supervisord.conf         # Process manager config
│
├── specs/                       # Design documents
│   ├── idea.md
│   ├── 0001-spec.md
│   └── 0002-volume-mount.md
│
├── .dockerignore                # Docker build context exclusions
├── Makefile                     # Docker operation shortcuts
├── package.json                 # Root scripts (dev:all, install:all, etc.)
└── README.md
```

## Data Directory

All `.excalidraw` files are stored in the `data/` directory. Both local development and Docker deployment use this directory as the default workspace.

```
data/
├── Welcome.excalidraw
├── project-a.excalidraw
└── subfolder/
    └── draft.excalidraw
```

- **Local dev**: `data/` is relative to the project root, tracked by Git
- **Docker**: Host `data/` is mounted to container `/app/data`
- **Security**: All file operations are restricted to this directory and its subdirectories

## Docker Deployment

### Makefile Commands

```bash
make help       # Show all commands
make build      # Build Docker image
make deploy     # Build + run (auto-detects UID/GID)
make status     # Check container status
make logs       # View logs (follow mode)
make clean      # Stop + remove container and image
```

Custom options:

```bash
make deploy DATA_DIR=/path/to/drawings    # Custom data directory
make deploy PUID=1000 PGID=1000          # Custom user mapping
make deploy PORT=8080                     # Custom port
```

### File Permissions (PUID/PGID)

Files created inside the container are owned by the user specified via `PUID`/`PGID`. `make deploy` automatically passes your current UID/GID, so new files match your host user.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `/app/data` | Data storage path (container) |
| `DEFAULT_WORKSPACE` | `true` | Auto-load workspace on start |
| `PUID` | `1000` | File owner UID |
| `PGID` | `1000` | File owner GID |
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `production` | Node.js environment |

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspace/default` | Get default workspace config |
| `POST` | `/api/workspace/select` | Set workspace directory |
| `GET` | `/api/workspace` | Get current file tree |
| `GET` | `/api/files/:fileId` | Get file content |
| `PUT` | `/api/files/:fileId` | Save file content |
| `POST` | `/api/files` | Create new file |
| `POST` | `/api/files/folder` | Create new folder |
| `DELETE` | `/api/files/:fileId` | Delete file |
| `DELETE` | `/api/files/folder/:folderId` | Delete folder |
| `PATCH` | `/api/files/:fileId/rename` | Rename file |
| `GET` | `/api/filesystem/list` | Browse directories |
| `GET` | `/api/filesystem/home` | Get home/data directory |
| `GET` | `/api/filesystem/common` | Get quick-access directories |
| `GET` | `/health` | Health check |

## Development

### Available Scripts

```bash
npm run dev:all      # Start frontend + backend together
npm run dev          # Frontend only (port 5173)
npm run dev:server   # Backend only (port 3001, uses ./data)
npm run install:all  # Install client + server dependencies
npm run build:all    # Build client + server
npm run lint         # Lint frontend code
```

### Security

- Path validation prevents directory traversal attacks
- `DATA_DIR` isolation restricts all file operations to the data directory
- CORS configured to accept only frontend origin
- Container backend runs as non-root user (via `su-exec`)

## Troubleshooting

**Port already in use**:

```bash
# Kill processes on default ports
lsof -ti:3001 -ti:5173 | xargs kill -9
```

**Docker permission issues**:

```bash
# Redeploy with correct UID/GID
make deploy PUID=$(id -u) PGID=$(id -g)
```

**Container won't start**:

```bash
make logs    # Check error output
make clean   # Full cleanup
make deploy  # Rebuild from scratch
```

## License

MIT

## Acknowledgments

- [Excalidraw](https://excalidraw.com/) - The whiteboard engine
- [Vite](https://vitejs.dev/) - Build tooling
- [React](https://react.dev/) - UI framework
- [Express](https://expressjs.com/) - Backend framework

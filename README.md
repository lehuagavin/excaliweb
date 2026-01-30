# ExcaliWeb

A modern web-based file manager and editor for [Excalidraw](https://excalidraw.com/) files. Browse, edit, and manage your `.excalidraw` files with a full-featured interface supporting folder hierarchies, auto-save, and seamless file operations.

![ExcaliWeb Screenshot](docs/screenshot.png)

## Features

- **Workspace Management** - Open any directory as a workspace and browse all `.excalidraw` files
- **Nested Folder Support** - Full recursive folder tree navigation with expand/collapse
- **Real-time Editing** - Complete Excalidraw editor integration with all drawing tools
- **Auto-save** - Automatically saves changes every 10 seconds
- **Quick Save** - Press `Ctrl+S` for instant manual save
- **File Operations** - Create, rename, delete files and folders
- **Persistent Sessions** - Remembers your last opened workspace
- **Folder Browser** - Built-in directory browser for easy workspace selection
- **RESTful API** - Clean server-side API for file management

## Architecture

ExcaliWeb uses a **client-server architecture** with:

- **Frontend**: React + TypeScript SPA built with Vite
- **Backend**: Express.js REST API server for file operations
- **Deployment**: Docker with nginx reverse proxy and supervisor for process management

This architecture allows for:
- Universal browser support (no File System Access API required)
- Server-side file operations with proper security
- Production-ready deployment with Docker
- Easy scaling and maintenance

## Getting Started

### Prerequisites

- **Node.js 18+** (for development)
- **Docker** (for production deployment, optional)
- **Modern browser** (Chrome, Firefox, Safari, Edge)

### Development Setup

#### Option 1: Quick Start (Client Only)

```bash
# Clone the repository
git clone https://github.com/yourusername/excaliweb.git
cd excaliweb

# Install client dependencies
cd client
npm install

# Start frontend dev server
npm run dev
```

Access the app at `http://localhost:5173`

#### Option 2: Full Stack Development

```bash
# Clone the repository
git clone https://github.com/yourusername/excaliweb.git
cd excaliweb

# Install all dependencies
npm run install:all

# Terminal 1: Start backend server (port 3001)
npm run dev:server

# Terminal 2: Start frontend dev server (port 5173)
npm run dev

# Or start both together
npm run dev:all
```

Access the app at `http://localhost:5173` (frontend proxies API requests to backend)

### Production Deployment with Docker

The recommended production deployment uses Docker with a multi-stage build:

```bash
# Build and deploy using Makefile
make deploy

# Or manually
docker build -t excaliweb:latest .
docker run -d -p 5174:80 --name excaliweb-app excaliweb:latest
```

Access the app at `http://localhost:5174`

#### Docker Commands (via Makefile)

```bash
make help       # Show all available commands
make build      # Build Docker image
make deploy     # Build and deploy container
make status     # Check container status
make logs       # View container logs
make clean      # Stop and remove container
```

The Docker deployment includes:
- **Multi-stage build** for optimized image size
- **Nginx** serving frontend static files
- **Node.js** backend API server
- **Supervisor** for process management
- **Health checks** for monitoring
- **Auto-restart** on failures

## Usage

1. **Select Workspace** - When first opened, select a directory containing your `.excalidraw` files
2. **Browse Files** - Navigate the folder tree in the left sidebar
3. **Open File** - Click any file to open it in the editor
4. **Edit** - Use the full Excalidraw editor to create and modify drawings
5. **Auto-save** - Changes save automatically every 10 seconds
6. **Manual Save** - Press `Ctrl+S` to save immediately
7. **Create Files/Folders** - Use the toolbar buttons or right-click context menu
8. **Manage Files** - Rename or delete files using the context menu

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file immediately |
| `Esc` | Close modal dialogs |

All standard Excalidraw keyboard shortcuts are also available in the editor.

## Tech Stack

### Frontend
- **React 19** - Modern UI library with latest features
- **TypeScript** - Static typing for reliability
- **Vite** - Lightning-fast build tool and dev server
- **Excalidraw 0.18** - Full-featured whiteboard component
- **CSS3** - Custom styling for UI components

### Backend
- **Node.js 20** - JavaScript runtime
- **Express 4** - Web framework for REST API
- **TypeScript** - Type-safe server code
- **CORS** - Cross-origin resource sharing
- **fs/promises** - Modern async file operations

### DevOps
- **Docker** - Containerization
- **Nginx** - Static file serving and reverse proxy
- **Supervisor** - Process management
- **Playwright** - End-to-end testing

## Project Structure

```
excaliweb/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.tsx      # Excalidraw editor wrapper
│   │   │   ├── Sidebar.tsx     # File tree navigation
│   │   │   ├── Modal.tsx       # File/folder creation modals
│   │   │   └── WorkspaceModal.tsx  # Directory browser
│   │   ├── hooks/
│   │   │   └── useAutoSave.ts  # Auto-save functionality
│   │   ├── utils/
│   │   │   ├── api.ts          # Backend API client
│   │   │   ├── storage.ts      # LocalStorage persistence
│   │   │   └── fileTreeUtils.ts # Tree navigation helpers
│   │   ├── App.tsx             # Main application component
│   │   ├── types.ts            # TypeScript type definitions
│   │   └── main.tsx            # Application entry point
│   ├── public/                 # Static assets
│   ├── vite.config.ts          # Vite configuration
│   └── package.json            # Frontend dependencies
│
├── server/                      # Backend Express application
│   ├── src/
│   │   ├── routes/
│   │   │   ├── workspace.ts    # Workspace selection endpoints
│   │   │   ├── files.ts        # File CRUD operations
│   │   │   └── filesystem.ts   # Directory browsing
│   │   ├── services/
│   │   │   └── fileSystem.ts   # File system operations
│   │   ├── middleware/
│   │   │   └── errorHandler.ts # Error handling
│   │   ├── types/
│   │   │   └── index.ts        # Shared type definitions
│   │   └── server.ts           # Express server setup
│   ├── tsconfig.json           # TypeScript config
│   └── package.json            # Backend dependencies
│
├── tests/
│   └── app.spec.ts             # Playwright E2E tests
│
├── specs/                       # Design documents
│   ├── idea.md                 # Initial project idea
│   └── 0001-spec.md           # Product specification
│
├── Dockerfile                   # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose configuration
├── nginx.conf                   # Nginx reverse proxy config
├── supervisord.conf            # Process manager config
├── Makefile                    # Docker operation commands
├── package.json                # Root package.json for scripts
└── README.md                   # This file
```

## API Documentation

### Workspace Endpoints

- `POST /api/workspace/select` - Select a workspace directory
  - Body: `{ path: string }`
  - Returns: `{ workspacePath: string, rootFolder: FolderInfo }`

- `GET /api/workspace` - Get current workspace file tree
  - Returns: `{ rootFolder: FolderInfo | null }`

### File Endpoints

- `GET /api/files` - Get file tree for current workspace
  - Returns: `{ rootFolder: FolderInfo | null }`

- `GET /api/files/:fileId` - Get file content
  - Returns: `{ content: ExcalidrawFileData }`

- `PUT /api/files/:fileId` - Save file content
  - Body: `{ content: ExcalidrawFileData }`
  - Returns: `{ success: boolean }`

- `POST /api/files` - Create new file
  - Body: `{ name: string, parentPath: string }`
  - Returns: `{ fileId: string, file: FileInfo }`

- `DELETE /api/files/:fileId` - Delete file
  - Returns: `{ success: boolean }`

- `PATCH /api/files/:fileId/rename` - Rename file
  - Body: `{ newName: string }`
  - Returns: `{ fileId: string, file: FileInfo }`

### Folder Endpoints

- `POST /api/files/folder` - Create new folder
  - Body: `{ name: string, parentPath: string }`
  - Returns: `{ folder: FolderInfo }`

- `DELETE /api/files/folder/:folderId` - Delete folder
  - Returns: `{ success: boolean }`

### Filesystem Browser Endpoints

- `GET /api/filesystem/list?path=<path>` - List directories
  - Returns: `{ currentPath: string, parentPath: string | null, directories: DirectoryItem[] }`

- `GET /api/filesystem/home` - Get user home directory
  - Returns: `{ path: string }`

- `GET /api/filesystem/common` - Get common directories
  - Returns: `{ directories: Array<{ name: string, path: string }> }`

### Health Check

- `GET /health` - Health check endpoint
  - Returns: `{ status: "ok" }`

## Development

### Run Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run tests
npm test

# Run tests with UI
npx playwright test --ui

# Run tests in headed mode
npx playwright test --headed
```

### Lint

```bash
# Lint frontend code
npm run lint

# Or from client directory
cd client && npm run lint
```

### Build

```bash
# Build frontend only
npm run build

# Build backend only
npm run build:server

# Build both
npm run build:all
```

### Environment Variables

#### Frontend (.env in client/)
- `VITE_API_URL` - Backend API URL (default: empty string for relative URLs)

#### Backend
- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `NODE_ENV` - Environment (development/production)

## Security Considerations

- **Path Validation**: All file paths are validated to prevent directory traversal attacks
- **Workspace Scoping**: File operations are restricted to the selected workspace directory
- **CORS**: Configured to only accept requests from the frontend origin
- **Input Sanitization**: File names and paths are sanitized before file system operations
- **No Authentication**: Currently designed for local/trusted environments only

## Browser Compatibility

ExcaliWeb works in all modern browsers:

- ✅ Google Chrome 90+
- ✅ Microsoft Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

No special browser APIs required - works everywhere!

## Future Enhancements

Potential features for future releases:

- [ ] File search across workspace
- [ ] Multiple tabs for editing different files
- [ ] Export drawings as PNG/SVG/PDF
- [ ] Version history and file recovery
- [ ] Collaborative editing (multi-user)
- [ ] Cloud storage integration
- [ ] Drag-and-drop file upload
- [ ] Keyboard shortcuts customization
- [ ] Dark/light theme toggle
- [ ] File templates
- [ ] Bulk operations (multi-select)

## Troubleshooting

### Port Already in Use

If port 3001 (backend) or 5173 (frontend) is already in use:

```bash
# Change backend port
PORT=3002 npm run dev:server

# Change frontend port (edit client/vite.config.ts)
```

### Workspace Not Found

If you get "Workspace not found" errors:
1. Make sure the directory exists
2. Check directory permissions
3. Try selecting the workspace again

### Docker Container Won't Start

```bash
# Check logs
make logs

# Check status
make status

# Clean and redeploy
make clean
make deploy
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Excalidraw](https://excalidraw.com/) - The amazing whiteboard tool that powers this editor
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
- [React](https://react.dev/) - The library for web and native user interfaces
- [Express](https://expressjs.com/) - Fast, unopinionated, minimalist web framework
- [Docker](https://www.docker.com/) - Containerization platform

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in `/specs`
- Review the PRD in `specs/0001-spec.md`

---

Built with ❤️ for the Excalidraw community

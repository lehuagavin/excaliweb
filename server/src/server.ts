import express from 'express';
import cors from 'cors';
import path from 'path';
import { promises as fs } from 'fs';
import workspaceRoutes from './routes/workspace.js';
import filesRoutes from './routes/files.js';
import filesystemRoutes from './routes/filesystem.js';
import { errorHandler, requestLogger } from './middleware/errorHandler.js';
import { setWorkspacePath, getWorkspacePath } from './services/fileSystem.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables for data directory and default workspace
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const DEFAULT_WORKSPACE = process.env.DEFAULT_WORKSPACE === 'true';
const DEFAULT_WORKSPACE_NAME = process.env.DEFAULT_WORKSPACE_NAME || 'my-workspace';

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Support large excalidraw files
app.use(requestLogger);

// Health check with data directory status
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {
    server: 'ok',
    workspace: getWorkspacePath() ? 'ok' : 'not configured',
    dataDir: 'ok'
  };

  // Check data directory
  if (DATA_DIR) {
    try {
      await fs.access(DATA_DIR);
      checks.dataDir = 'ok';
    } catch {
      checks.dataDir = 'inaccessible';
    }
  }

  const allOk = Object.values(checks).every(v => v === 'ok' || v === 'not configured');
  res.status(allOk ? 200 : 503).json(checks);
});

// API Routes
app.use('/api/workspace', workspaceRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/filesystem', filesystemRoutes);

// Error handling
app.use(errorHandler);

// Initialize default workspace
async function initializeDefaultWorkspace() {
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    if (DEFAULT_WORKSPACE) {
      // Use DATA_DIR directly as the workspace
      const workspacePath = DATA_DIR;

      // Set as current workspace
      setWorkspacePath(workspacePath);

      console.log(`✅ Default workspace initialized: ${workspacePath}`);

      // Create welcome file (only when workspace is empty)
      const files = await fs.readdir(workspacePath);
      const excalidrawFiles = files.filter(f => f.endsWith('.excalidraw'));

      if (excalidrawFiles.length === 0) {
        const welcomeFile = path.join(workspacePath, 'Welcome.excalidraw');
        const welcomeContent = {
          type: 'excalidraw',
          version: 2,
          source: 'https://excalidraw.com',
          elements: [
            {
              type: 'text',
              id: 'welcome-text',
              x: 100,
              y: 100,
              width: 400,
              height: 50,
              text: 'Welcome to ExcaliWeb!\n\nStart drawing or create a new file.',
              fontSize: 20,
              fontFamily: 1,
              textAlign: 'center',
              verticalAlign: 'middle',
              strokeColor: '#000000',
              backgroundColor: 'transparent',
              fillStyle: 'hachure',
              strokeWidth: 1,
              strokeStyle: 'solid',
              roughness: 1,
              opacity: 100,
              angle: 0,
              seed: 1,
              version: 1,
              versionNonce: 1,
              isDeleted: false,
              groupIds: [],
              boundElements: null,
              updated: Date.now(),
              link: null,
              locked: false,
              containerId: null,
              originalText: 'Welcome to ExcaliWeb!\n\nStart drawing or create a new file.',
              lineHeight: 1.25
            }
          ],
          appState: {
            viewBackgroundColor: '#ffffff'
          },
          files: {}
        };

        await fs.writeFile(welcomeFile, JSON.stringify(welcomeContent, null, 2));
        console.log(`✅ Welcome file created: ${welcomeFile}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize default workspace:', error);
    throw error;
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 ExcaliWeb server running on http://localhost:${PORT}`);
  
  if (DEFAULT_WORKSPACE) {
    try {
      await initializeDefaultWorkspace();
    } catch (error) {
      console.error('Failed to initialize default workspace, but server will continue running');
    }
  }
  
  console.log(`📁 Ready to serve files from workspace`);
  console.log(`📂 Data directory: ${DATA_DIR}`);
});

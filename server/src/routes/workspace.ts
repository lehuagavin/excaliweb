import { Router, Request, Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { setWorkspacePath, getFileTree, getWorkspacePath } from '../services/fileSystem.js';
import type { SelectWorkspaceRequest, SelectWorkspaceResponse, ErrorResponse } from '../types/index.js';

const router = Router();

// GET /api/workspace/default - Get default workspace configuration
router.get('/default', (req: Request, res: Response) => {
  const dataDir = process.env.DATA_DIR;
  const defaultWorkspace = process.env.DEFAULT_WORKSPACE === 'true';

  if (defaultWorkspace && dataDir) {
    // Use DATA_DIR directly as the default workspace
    res.json({
      enabled: true,
      path: dataDir,
      name: path.basename(dataDir),
      dataDir: dataDir
    });
  } else {
    res.json({
      enabled: false
    });
  }
});

// POST /api/workspace/select - Set workspace path
router.post('/select', async (req: Request<{}, {}, SelectWorkspaceRequest>, res: Response<SelectWorkspaceResponse | ErrorResponse>) => {
  try {
    const { path: workspacePath } = req.body;

    if (!workspacePath || typeof workspacePath !== 'string') {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    // Validate path is within DATA_DIR if configured
    const dataDir = process.env.DATA_DIR;
    if (dataDir) {
      const normalizedPath = path.resolve(workspacePath);
      const normalizedDataDir = path.resolve(dataDir);

      if (!normalizedPath.startsWith(normalizedDataDir)) {
        res.status(403).json({
          error: 'Invalid workspace path: Must be within data directory',
          details: `Allowed path: ${dataDir}`
        });
        return;
      }
    }

    // Verify path exists and is accessible
    try {
      await fs.access(workspacePath);
      const stats = await fs.stat(workspacePath);
      if (!stats.isDirectory()) {
        res.status(400).json({ error: 'Path is not a directory' });
        return;
      }
    } catch {
      // Try to create the directory if it doesn't exist (only within DATA_DIR)
      if (dataDir) {
        try {
          await fs.mkdir(workspacePath, { recursive: true });
        } catch (mkdirError) {
          res.status(400).json({ 
            error: 'Path does not exist and could not be created',
            details: mkdirError instanceof Error ? mkdirError.message : String(mkdirError)
          });
          return;
        }
      } else {
        res.status(400).json({ error: 'Path does not exist or is not accessible' });
        return;
      }
    }

    // Set workspace path
    setWorkspacePath(workspacePath);

    // Get file tree
    const rootFolder = await getFileTree();

    if (!rootFolder) {
      res.status(500).json({ error: 'Failed to read workspace' });
      return;
    }

    res.json({
      workspacePath: workspacePath,
      rootFolder,
    });
  } catch (error) {
    console.error('Error selecting workspace:', error);
    res.status(500).json({
      error: 'Failed to select workspace',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/workspace - Get current workspace info
router.get('/', async (req: Request, res: Response) => {
  try {
    const rootFolder = await getFileTree();
    res.json({ rootFolder });
  } catch (error) {
    console.error('Error getting workspace:', error);
    res.status(500).json({
      error: 'Failed to get workspace',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

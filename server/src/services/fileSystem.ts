import { promises as fs } from 'fs';
import path from 'path';
import type { FileInfo, FolderInfo, ExcalidrawFileData } from '../types/index.js';

// Workspace state (in production, use session or database)
let currentWorkspacePath: string | null = null;

// Set the current workspace path
export function setWorkspacePath(workspacePath: string): void {
  currentWorkspacePath = workspacePath;
}

// Get the current workspace path
export function getWorkspacePath(): string | null {
  return currentWorkspacePath;
}

// Validate path is within workspace (prevent directory traversal attacks)
function validatePath(relativePath: string): string {
  if (!currentWorkspacePath) {
    throw new Error('No workspace selected');
  }

  // Remove workspace name prefix if it exists
  // Files from listExcalidrawFilesRecursive have paths like "workspaceName/file.excalidraw"
  // We need to strip the workspace name to get the actual relative path
  const workspaceName = path.basename(currentWorkspacePath);
  let cleanPath = relativePath;

  if (relativePath.startsWith(workspaceName + '/')) {
    cleanPath = relativePath.substring(workspaceName.length + 1);
  } else if (relativePath === workspaceName) {
    cleanPath = '';
  }

  const absolutePath = path.join(currentWorkspacePath, cleanPath);
  const normalizedPath = path.normalize(absolutePath);
  const normalizedWorkspace = path.normalize(currentWorkspacePath);

  // Strict check: path must be within workspace
  if (!normalizedPath.startsWith(normalizedWorkspace)) {
    console.warn(`⚠️  Attempted to access path outside workspace: ${normalizedPath}`);
    throw new Error('Invalid path: Access outside workspace is not allowed');
  }

  // Additional check: if DATA_DIR is set, ensure path is also within DATA_DIR
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    const normalizedDataDir = path.resolve(dataDir);
    if (!normalizedPath.startsWith(normalizedDataDir)) {
      console.error(`🚫 Security violation: Attempted to access path outside DATA_DIR: ${normalizedPath}`);
      throw new Error('Invalid path: Access outside data directory is not allowed');
    }
  }

  return normalizedPath;
}

// Encode path to fileId (base64)
export function encodeFileId(relativePath: string): string {
  return Buffer.from(relativePath).toString('base64url');
}

// Decode fileId to path
export function decodeFileId(fileId: string): string {
  return Buffer.from(fileId, 'base64url').toString('utf-8');
}

// Check if a file/directory exists
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Recursively list all excalidraw files and folders
export async function listExcalidrawFilesRecursive(
  dirPath: string,
  parentPath: string = ''
): Promise<FolderInfo> {
  const dirName = path.basename(dirPath);
  const currentPath = parentPath ? `${parentPath}/${dirName}` : dirName;
  const children: (FileInfo | FolderInfo)[] = [];

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.excalidraw')) {
      children.push({
        name: entry.name.replace('.excalidraw', ''),
        path: `${currentPath}/${entry.name}`,
        parentPath: currentPath,
      });
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const subDirPath = path.join(dirPath, entry.name);
      const subFolder = await listExcalidrawFilesRecursive(subDirPath, currentPath);
      // Show all folders, even empty ones
      children.push(subFolder);
    }
  }

  // Sort: folders first, then files, alphabetically
  children.sort((a, b) => {
    const aIsFolder = 'children' in a;
    const bIsFolder = 'children' in b;
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    name: dirName,
    path: currentPath,
    parentPath,
    children,
    isExpanded: parentPath === '', // Root folder is expanded by default
  };
}

// Note: hasExcalidrawFiles function is no longer needed but kept for backwards compatibility
// Check if a folder has any excalidraw files (recursively)
function hasExcalidrawFiles(folder: FolderInfo): boolean {
  for (const child of folder.children) {
    if ('children' in child) {
      if (hasExcalidrawFiles(child)) return true;
    } else {
      return true;
    }
  }
  return false;
}

// Read a file
export async function readFile(relativePath: string): Promise<ExcalidrawFileData> {
  const absolutePath = validatePath(relativePath);

  if (!(await exists(absolutePath))) {
    throw new Error('File not found');
  }

  const content = await fs.readFile(absolutePath, 'utf-8');
  return JSON.parse(content);
}

// Save a file
export async function saveFile(relativePath: string, data: ExcalidrawFileData): Promise<void> {
  const absolutePath = validatePath(relativePath);
  await fs.writeFile(absolutePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Create a new file
export async function createFile(name: string, parentPath: string): Promise<FileInfo> {
  const fileName = name.endsWith('.excalidraw') ? name : `${name}.excalidraw`;

  // parentPath comes in format like "root" or "root/subfolder" (includes workspace name)
  // validatePath will handle stripping the workspace name
  const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
  const absolutePath = validatePath(filePath);

  if (await exists(absolutePath)) {
    throw new Error('File already exists');
  }

  const initialData: ExcalidrawFileData = {
    type: "excalidraw",
    version: 2,
    source: "excaliweb",
    elements: [],
    appState: {
      viewBackgroundColor: "#ffffff",
    },
    files: {},
  };

  // Ensure parent directory exists
  const parentDir = path.dirname(absolutePath);
  await fs.mkdir(parentDir, { recursive: true });

  await fs.writeFile(absolutePath, JSON.stringify(initialData, null, 2), 'utf-8');

  // Return FileInfo with same path format as listExcalidrawFilesRecursive
  return {
    name: name.replace('.excalidraw', ''),
    path: filePath,
    parentPath: parentPath || path.basename(currentWorkspacePath!),
  };
}

// Delete a file
export async function deleteFile(relativePath: string): Promise<void> {
  const absolutePath = validatePath(relativePath);

  if (!(await exists(absolutePath))) {
    throw new Error('File not found');
  }

  await fs.unlink(absolutePath);
}

// Delete a folder
export async function deleteFolder(relativePath: string): Promise<void> {
  const workspaceName = path.basename(currentWorkspacePath!);

  // Prevent deleting the workspace root
  if (relativePath === workspaceName || !relativePath) {
    throw new Error('Cannot delete workspace root directory');
  }

  const absolutePath = validatePath(relativePath);

  if (!(await exists(absolutePath))) {
    throw new Error('Folder not found');
  }

  // Check if it's a directory
  const stat = await fs.stat(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error('Path is not a directory');
  }

  // Delete folder recursively
  await fs.rm(absolutePath, { recursive: true, force: true });
}

// Create a new folder
export async function createFolder(name: string, parentPath: string): Promise<FolderInfo> {
  // parentPath comes in format like "root" or "root/subfolder" (includes workspace name)
  // validatePath will handle stripping the workspace name
  const folderPath = parentPath ? `${parentPath}/${name}` : name;
  const absolutePath = validatePath(folderPath);

  // Check if folder already exists
  if (await exists(absolutePath)) {
    throw new Error('Folder already exists');
  }

  // Create the folder
  await fs.mkdir(absolutePath, { recursive: true });

  // Return FolderInfo with same path format as listExcalidrawFilesRecursive
  return {
    name,
    path: folderPath,
    parentPath: parentPath || path.basename(currentWorkspacePath!),
    children: [],
    isExpanded: false,
  };
}

// Rename a file
export async function renameFile(oldRelativePath: string, newName: string): Promise<FileInfo> {
  const oldAbsolutePath = validatePath(oldRelativePath);

  if (!(await exists(oldAbsolutePath))) {
    throw new Error('File not found');
  }

  const fileName = newName.endsWith('.excalidraw') ? newName : `${newName}.excalidraw`;
  const dirPath = path.dirname(oldAbsolutePath);
  const newAbsolutePath = path.join(dirPath, fileName);

  if (await exists(newAbsolutePath)) {
    throw new Error('A file with this name already exists');
  }

  await fs.rename(oldAbsolutePath, newAbsolutePath);

  // Construct new file info
  const parentDirPath = path.dirname(oldRelativePath);
  const newRelativePath = path.join(parentDirPath, fileName);

  return {
    name: newName.replace('.excalidraw', ''),
    path: newRelativePath,
    parentPath: parentDirPath,
  };
}

// Get file tree for current workspace
export async function getFileTree(): Promise<FolderInfo | null> {
  if (!currentWorkspacePath) {
    return null;
  }

  if (!(await exists(currentWorkspacePath))) {
    throw new Error('Workspace path does not exist');
  }

  return await listExcalidrawFilesRecursive(currentWorkspacePath);
}

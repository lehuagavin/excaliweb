// API client for backend communication

// Use empty string to make requests relative, so they go through Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// API Response types (matching server types)
export interface FileInfo {
  name: string;
  path: string;
  parentPath: string;
}

export interface FolderInfo {
  name: string;
  path: string;
  parentPath: string;
  children: (FileInfo | FolderInfo)[];
  isExpanded?: boolean;
}

export interface ExcalidrawFileData {
  type: "excalidraw";
  version: number;
  source: string;
  elements: readonly any[];
  appState?: Record<string, any>;
  files?: Record<string, any>;
}

// Helper to encode file path to fileId
export function encodeFileId(path: string): string {
  return btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper to handle API errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.details || `HTTP ${response.status}`);
  }
  return response.json();
}

// API Methods

// Select workspace directory
export async function selectWorkspace(path: string): Promise<{ workspacePath: string; rootFolder: FolderInfo }> {
  const response = await fetch(`${API_BASE_URL}/api/workspace/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return handleResponse(response);
}

// Get current workspace file tree
export async function getWorkspace(): Promise<{ rootFolder: FolderInfo | null }> {
  const response = await fetch(`${API_BASE_URL}/api/workspace`);
  return handleResponse(response);
}

// Get file tree
export async function getFiles(): Promise<{ rootFolder: FolderInfo | null }> {
  const response = await fetch(`${API_BASE_URL}/api/files`);
  return handleResponse(response);
}

// Get file content
export async function getFileContent(fileId: string): Promise<{ content: ExcalidrawFileData }> {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`);
  return handleResponse(response);
}

// Save file content
export async function saveFileContent(fileId: string, content: ExcalidrawFileData): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return handleResponse(response);
}

// Create new file
export async function createNewFile(name: string, parentPath: string): Promise<{ fileId: string; file: FileInfo }> {
  const response = await fetch(`${API_BASE_URL}/api/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentPath }),
  });
  return handleResponse(response);
}

// Create new folder
export async function createNewFolder(name: string, parentPath: string): Promise<{ folder: FolderInfo }> {
  const response = await fetch(`${API_BASE_URL}/api/files/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentPath }),
  });
  return handleResponse(response);
}

// Delete file
export async function deleteFileById(fileId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// Delete folder
export async function deleteFolderById(folderId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/files/folder/${folderId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// Rename file
export async function renameFileById(fileId: string, newName: string): Promise<{ fileId: string; file: FileInfo }> {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName }),
  });
  return handleResponse(response);
}

// Health check
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleResponse(response);
}

// Get default workspace configuration
export interface DefaultWorkspaceConfig {
  enabled: boolean;
  path?: string;
  name?: string;
  dataDir?: string;
}

export async function getDefaultWorkspace(): Promise<DefaultWorkspaceConfig> {
  const response = await fetch(`${API_BASE_URL}/api/workspace/default`);
  return handleResponse(response);
}

// Filesystem browser
export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isAccessible: boolean;
}

export interface ListDirectoriesResponse {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItem[];
}

export async function listDirectories(path?: string): Promise<ListDirectoriesResponse> {
  const url = path
    ? `${API_BASE_URL}/api/filesystem/list?path=${encodeURIComponent(path)}`
    : `${API_BASE_URL}/api/filesystem/list`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function getHomeDirectory(): Promise<{ path: string }> {
  const response = await fetch(`${API_BASE_URL}/api/filesystem/home`);
  return handleResponse(response);
}

export async function getCommonDirectories(): Promise<{ directories: Array<{ name: string; path: string }> }> {
  const response = await fetch(`${API_BASE_URL}/api/filesystem/common`);
  return handleResponse(response);
}

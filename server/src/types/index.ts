// Backend types - without FileSystemHandle references

export interface FileInfo {
  name: string;
  path: string; // Full path relative to workspace root
  parentPath: string; // Path to parent folder
}

export interface FolderInfo {
  name: string;
  path: string;
  parentPath: string;
  children: (FileInfo | FolderInfo)[];
  isExpanded?: boolean;
}

export type FileTreeItem = FileInfo | FolderInfo;

export function isFolder(item: FileTreeItem): item is FolderInfo {
  return 'children' in item;
}

export interface ExcalidrawFileData {
  type: "excalidraw";
  version: number;
  source: string;
  elements: readonly any[];
  appState?: Record<string, any>;
  files?: Record<string, any>;
}

// API Request/Response types
export interface SelectWorkspaceRequest {
  path: string;
}

export interface SelectWorkspaceResponse {
  workspacePath: string;
  rootFolder: FolderInfo;
}

export interface GetFilesResponse {
  rootFolder: FolderInfo | null;
}

export interface GetFileContentResponse {
  content: ExcalidrawFileData;
}

export interface SaveFileRequest {
  content: ExcalidrawFileData;
}

export interface CreateFileRequest {
  name: string;
  parentPath: string;
}

export interface CreateFileResponse {
  fileId: string;
  file: FileInfo;
}

export interface CreateFolderRequest {
  name: string;
  parentPath: string;
}

export interface CreateFolderResponse {
  folder: FolderInfo;
}

export interface RenameFileRequest {
  newName: string;
}

export interface RenameFileResponse {
  fileId: string;
  file: FileInfo;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

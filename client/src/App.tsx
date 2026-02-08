import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { CreateFileModal, CreateFolderModal, RenameFileModal } from './components/Modal';
import { WorkspaceModal } from './components/WorkspaceModal';
import { useAutoSave } from './hooks/useAutoSave';
import {
  selectWorkspace,
  getWorkspace,
  getFileContent,
  saveFileContent,
  createNewFile,
  createNewFolder,
  deleteFileById,
  deleteFolderById,
  renameFileById,
  encodeFileId,
  getDefaultWorkspace,
} from './utils/api';
import { saveWorkspacePath, getWorkspacePath } from './utils/storage';
import type { FileInfo, FolderInfo, ExcalidrawFileData } from './utils/api';
import './App.css';

// Lightweight fingerprint for detecting actual content changes
// Uses element count + sum of version numbers (O(n), no serialization)
function getFingerprint(data: ExcalidrawFileData): string {
  let versionSum = 0;
  for (const el of data.elements) {
    versionSum += ((el as any).version || 0);
  }
  return `${data.elements.length}:${versionSum}:${data.appState?.viewBackgroundColor || ''}`;
}

function App() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FolderInfo | null>(null);
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [excalidrawData, setExcalidrawData] = useState<ExcalidrawFileData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileInfo | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [createInFolderPath, setCreateInFolderPath] = useState<string | null>(null);

  const currentDataRef = useRef<ExcalidrawFileData | null>(null);
  currentDataRef.current = excalidrawData;

  const currentFileRef = useRef<FileInfo | null>(null);
  currentFileRef.current = currentFile;

  // Track saved state fingerprint to avoid false dirty flags from Excalidraw's frequent onChange
  const savedFingerprintRef = useRef<string>('');

  // Load workspace on mount - prioritize default workspace
  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        // 1. Check if default workspace is configured
        const defaultConfig = await getDefaultWorkspace();

        if (defaultConfig.enabled && defaultConfig.path) {
          // Use default workspace
          console.log('Using default workspace:', defaultConfig.path);
          const { workspacePath: newPath, rootFolder } = await selectWorkspace(defaultConfig.path);

          // Save to localStorage
          saveWorkspacePath(newPath);

          setWorkspacePath(newPath);
          setFileTree(rootFolder);
          setIsWorkspaceModalOpen(false);
        } else {
          // 2. Try to restore from localStorage
          const savedPath = getWorkspacePath();
          if (savedPath) {
            try {
              const { rootFolder } = await getWorkspace();
              if (rootFolder) {
                setWorkspacePath(savedPath);
                setFileTree(rootFolder);
              } else {
                // Workspace not set on server, prompt user
                setIsWorkspaceModalOpen(true);
              }
            } catch (error) {
              console.error('Failed to restore workspace:', error);
              setIsWorkspaceModalOpen(true);
            }
          } else {
            // 3. Show workspace selection dialog
            setIsWorkspaceModalOpen(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        // Fallback to saved workspace or show modal
        const savedPath = getWorkspacePath();
        if (savedPath) {
          try {
            const { rootFolder } = await getWorkspace();
            if (rootFolder) {
              setWorkspacePath(savedPath);
              setFileTree(rootFolder);
            } else {
              setIsWorkspaceModalOpen(true);
            }
          } catch {
            setIsWorkspaceModalOpen(true);
          }
        } else {
          setIsWorkspaceModalOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeWorkspace();
  }, []);

  const handleSave = useCallback(async () => {
    if (currentFileRef.current && currentDataRef.current && isDirty) {
      try {
        const fileId = encodeFileId(currentFileRef.current.path);
        await saveFileContent(fileId, currentDataRef.current);
        savedFingerprintRef.current = getFingerprint(currentDataRef.current);
        setIsDirty(false);
        console.log('File saved:', currentFileRef.current.name);
      } catch (error) {
        console.error('Failed to save file:', error);
        alert('Failed to save. Please try again.');
      }
    }
  }, [isDirty]);

  useAutoSave(isDirty, handleSave);

  const handleSelectWorkspace = async (path: string) => {
    try {
      // Save current file before switching workspace
      if (isDirty && currentFile && excalidrawData) {
        const fileId = encodeFileId(currentFile.path);
        await saveFileContent(fileId, excalidrawData);
      }

      const { workspacePath: newPath, rootFolder } = await selectWorkspace(path);
      setWorkspacePath(newPath);
      saveWorkspacePath(newPath);
      setFileTree(rootFolder);
      setCurrentFile(null);
      setExcalidrawData(null);
      setIsDirty(false);
      setCurrentFolderPath(null);
    } catch (error) {
      console.error('Failed to select workspace:', error);
      alert('Failed to select workspace: ' + (error as Error).message);
    }
  };

  const handleOpenDirectory = () => {
    setIsWorkspaceModalOpen(true);
  };

  const handleSelectFile = async (file: FileInfo) => {
    if (currentFile?.path === file.path) return;

    try {
      // Save current file before switching
      if (isDirty && currentFile && excalidrawData) {
        const fileId = encodeFileId(currentFile.path);
        await saveFileContent(fileId, excalidrawData);
        setIsDirty(false);
      }

      const fileId = encodeFileId(file.path);
      const { content } = await getFileContent(fileId);
      console.log('File loaded:', file.name, {
        elementsCount: content.elements?.length,
        hasAppState: !!content.appState,
        hasFiles: !!content.files,
      });
      setCurrentFile(file);
      setExcalidrawData(content);
      savedFingerprintRef.current = getFingerprint(content);
      setIsDirty(false);
      setCurrentFolderPath(file.parentPath);
    } catch (error) {
      console.error('Failed to read file:', error);
      alert('Failed to read file: ' + (error as Error).message);
    }
  };

  const handleSelectFolder = (folderPath: string | null) => {
    setCurrentFolderPath(folderPath);
  };

  const handleOpenCreateModal = (folderPath: string | null) => {
    if (!workspacePath) {
      alert('Please select a workspace first');
      return;
    }
    setCreateInFolderPath(folderPath || currentFolderPath || fileTree?.path || null);
    setIsCreateModalOpen(true);
  };

  const handleOpenCreateFolderModal = (folderPath: string | null) => {
    if (!workspacePath) {
      alert('Please select a workspace first');
      return;
    }
    setCreateInFolderPath(folderPath || currentFolderPath || fileTree?.path || null);
    setIsCreateFolderModalOpen(true);
  };

  const handleCreateFile = async (name: string) => {
    if (!workspacePath || !fileTree) return;

    try {
      // Save current file before creating new one
      if (isDirty && currentFile && excalidrawData) {
        const fileId = encodeFileId(currentFile.path);
        await saveFileContent(fileId, excalidrawData);
      }

      const targetPath = createInFolderPath || fileTree.path;
      const { fileId, file } = await createNewFile(name, targetPath);

      // Refresh file tree
      const { rootFolder } = await getWorkspace();
      if (rootFolder) {
        setFileTree(rootFolder);

        // Open the newly created file
        const { content } = await getFileContent(fileId);
        setCurrentFile(file);
        setExcalidrawData(content);
        savedFingerprintRef.current = getFingerprint(content);
        setIsDirty(false);
        setCurrentFolderPath(file.parentPath);
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file: ' + (error as Error).message);
    }
  };

  const handleCreateFolder = async (name: string) => {
    if (!workspacePath || !fileTree) return;

    try {
      const targetPath = createInFolderPath || fileTree.path;
      await createNewFolder(name, targetPath);

      // Refresh file tree
      const { rootFolder } = await getWorkspace();
      if (rootFolder) {
        setFileTree(rootFolder);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder: ' + (error as Error).message);
    }
  };

  const handleDeleteFile = async (file: FileInfo) => {
    if (!workspacePath) return;

    try {
      const fileId = encodeFileId(file.path);
      await deleteFileById(fileId);

      // Refresh file tree
      const { rootFolder } = await getWorkspace();
      if (rootFolder) {
        setFileTree(rootFolder);
      }

      if (currentFile?.path === file.path) {
        setCurrentFile(null);
        setExcalidrawData(null);
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file: ' + (error as Error).message);
    }
  };

  const handleDeleteFolder = async (folder: FolderInfo) => {
    if (!workspacePath) return;

    try {
      const folderId = encodeFileId(folder.path);
      await deleteFolderById(folderId);

      // Refresh file tree
      const { rootFolder } = await getWorkspace();
      if (rootFolder) {
        setFileTree(rootFolder);
      }

      // If current file was inside deleted folder, close it
      if (currentFile && currentFile.path.startsWith(folder.path + '/')) {
        setCurrentFile(null);
        setExcalidrawData(null);
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      alert('Failed to delete folder: ' + (error as Error).message);
    }
  };

  const handleOpenRenameModal = (file: FileInfo) => {
    setRenameTarget(file);
  };

  const handleRenameFile = async (newName: string) => {
    if (!workspacePath || !renameTarget) return;

    try {
      // Save current file before renaming if it's the one being renamed
      if (isDirty && currentFile?.path === renameTarget.path && excalidrawData) {
        const fileId = encodeFileId(currentFile.path);
        await saveFileContent(fileId, excalidrawData);
      }

      const oldFileId = encodeFileId(renameTarget.path);
      const { file: updatedFile } = await renameFileById(oldFileId, newName);

      // Refresh file tree
      const { rootFolder } = await getWorkspace();
      if (rootFolder) {
        setFileTree(rootFolder);
      }

      // If the renamed file was the current file, update it
      if (currentFile?.path === renameTarget.path) {
        setCurrentFile(updatedFile);
      }

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to rename file:', error);
      alert('Failed to rename file: ' + (error as Error).message);
    }
  };

  const handleEditorChange = useCallback(
    (
      elements: ExcalidrawFileData['elements'],
      appState: ExcalidrawFileData['appState'],
      files: ExcalidrawFileData['files']
    ) => {
      if (!currentFile) return;

      const newData: ExcalidrawFileData = {
        type: 'excalidraw',
        version: 2,
        source: 'excaliweb',
        elements,
        appState,
        files,
      };

      setExcalidrawData(newData);

      // Only mark dirty if content actually changed from last saved state
      const fingerprint = getFingerprint(newData);
      if (fingerprint !== savedFingerprintRef.current) {
        setIsDirty(true);
      }
    },
    [currentFile]
  );

  if (isLoading) {
    return (
      <div className="app-loading">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        fileTree={fileTree}
        currentFile={currentFile}
        isDirty={isDirty}
        currentFolderPath={currentFolderPath}
        onSelectFile={handleSelectFile}
        onOpenDirectory={handleOpenDirectory}
        onCreateFile={handleOpenCreateModal}
        onCreateFolder={handleOpenCreateFolderModal}
        onDeleteFile={handleDeleteFile}
        onDeleteFolder={handleDeleteFolder}
        onRenameFile={handleOpenRenameModal}
        onSelectFolder={handleSelectFolder}
      />
      <Editor fileKey={currentFile?.path ?? null} data={excalidrawData} onChange={handleEditorChange} />

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onConfirm={handleSelectWorkspace}
      />

      <CreateFileModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateFile}
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onConfirm={handleCreateFolder}
      />

      <RenameFileModal
        isOpen={renameTarget !== null}
        currentName={renameTarget?.name ?? ''}
        onClose={() => setRenameTarget(null)}
        onConfirm={handleRenameFile}
      />
    </div>
  );
}

export default App;

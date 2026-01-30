import { useState, useMemo } from 'react';
import type { FileInfo, FolderInfo } from '../utils/api';
import { countFiles, searchFiles } from '../utils/fileTreeUtils';
import './Sidebar.css';

// Type guard
function isFolder(item: FileInfo | FolderInfo): item is FolderInfo {
  return 'children' in item;
}

// App Logo
const AppLogo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#logoGradient)" />
    <path d="M25 70 L45 30 L55 50 L70 25 L75 70" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="35" cy="45" r="8" fill="white" fillOpacity="0.9" />
    <circle cx="65" cy="55" r="6" fill="white" fillOpacity="0.7" />
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

// SVG Icons
const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const FolderOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <path d="M2 10h20"/>
  </svg>
);

const FolderClosedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const FolderPlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const ExcalidrawFileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 15l2-2 2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const EmptyFolderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
);

const NoResultsIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

interface SidebarProps {
  fileTree: FolderInfo | null;
  currentFile: FileInfo | null;
  isDirty: boolean;
  currentFolderPath: string | null;
  onSelectFile: (file: FileInfo) => void;
  onOpenDirectory: () => void;
  onCreateFile: (folderPath: string | null) => void;
  onCreateFolder: (folderPath: string | null) => void;
  onDeleteFile: (file: FileInfo) => void;
  onDeleteFolder: (folder: FolderInfo) => void;
  onRenameFile: (file: FileInfo) => void;
  onSelectFolder: (folderPath: string | null) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: FileInfo | FolderInfo;
  type: 'file' | 'folder';
}

export function Sidebar({
  fileTree,
  currentFile,
  isDirty,
  currentFolderPath,
  onSelectFile,
  onOpenDirectory,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onSelectFolder,
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fileCount = fileTree ? countFiles(fileTree) : 0;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !fileTree) return null;
    return searchFiles(fileTree, searchQuery.trim());
  }, [searchQuery, fileTree]);

  const handleContextMenu = (e: React.MouseEvent, item: FileInfo | FolderInfo, type: 'file' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  const handleDeleteClick = () => {
    if (contextMenu) {
      if (contextMenu.type === 'file') {
        const file = contextMenu.item as FileInfo;
        const confirmDelete = window.confirm(`Delete file "${file.name}"?`);
        if (confirmDelete) {
          onDeleteFile(file);
        }
      } else {
        const folder = contextMenu.item as FolderInfo;
        const confirmDelete = window.confirm(`Delete folder "${folder.name}" and all its contents?`);
        if (confirmDelete) {
          onDeleteFolder(folder);
        }
      }
      setContextMenu(null);
    }
  };

  const handleRenameClick = () => {
    if (contextMenu && contextMenu.type === 'file') {
      onRenameFile(contextMenu.item as FileInfo);
      setContextMenu(null);
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const isFolderExpanded = (path: string) => {
    return expandedFolders.has(path);
  };

  const renderFileItem = (file: FileInfo, depth: number = 0) => (
    <div
      key={file.path}
      className={`file-item ${currentFile?.path === file.path ? 'active' : ''}`}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
      onClick={() => onSelectFile(file)}
      onContextMenu={(e) => handleContextMenu(e, file, 'file')}
    >
      <div className="file-icon">
        <ExcalidrawFileIcon />
      </div>
      <span className="file-name">{file.name}</span>
      {currentFile?.path === file.path && isDirty && (
        <span className="dirty-indicator" title="Unsaved changes" />
      )}
    </div>
  );

  const renderFolderItem = (folder: FolderInfo, depth: number = 0) => {
    const isExpanded = isFolderExpanded(folder.path);
    const folderFileCount = countFiles(folder);
    const isSelected = currentFolderPath === folder.path;
    const isRootFolder = !folder.parentPath || folder.parentPath === '';

    const handleFolderClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFolder(folder.path);
      onSelectFolder(folder.path);
    };

    const handleFolderContextMenu = (e: React.MouseEvent) => {
      // Don't show context menu for root workspace folder
      if (isRootFolder) {
        e.preventDefault();
        return;
      }
      handleContextMenu(e, folder, 'folder');
    };

    return (
      <div key={folder.path} className="folder-container">
        <div
          className={`folder-item ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          onClick={handleFolderClick}
          onContextMenu={handleFolderContextMenu}
        >
          <span className={`folder-chevron ${isExpanded ? 'expanded' : ''}`}>
            <ChevronRightIcon />
          </span>
          <div className="folder-icon">
            {isExpanded ? <FolderOpenIcon /> : <FolderClosedIcon />}
          </div>
          <span className="folder-name">{folder.name}</span>
          <span className="folder-count">{folderFileCount}</span>
        </div>
        {isExpanded && (
          <div className="folder-children">
            {folder.children.map(child =>
              isFolder(child)
                ? renderFolderItem(child, depth + 1)
                : renderFileItem(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTreeItems = () => {
    if (!fileTree) return null;

    return fileTree.children.map(child =>
      isFolder(child)
        ? renderFolderItem(child, 0)
        : renderFileItem(child, 0)
    );
  };

  const renderSearchResults = () => {
    if (!searchResults) return null;

    if (searchResults.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <NoResultsIcon />
          </div>
          <p className="empty-title">No results found</p>
          <p className="empty-hint">Try different keywords</p>
        </div>
      );
    }

    return (
      <div className="search-results">
        <div className="search-results-header">
          {searchResults.length} file{searchResults.length !== 1 ? 's' : ''} found
        </div>
        <div className="file-items">
          {searchResults.map(file => (
            <div
              key={file.path}
              className={`file-item ${currentFile?.path === file.path ? 'active' : ''}`}
              onClick={() => onSelectFile(file)}
              onContextMenu={(e) => handleContextMenu(e, file, 'file')}
            >
              <div className="file-icon">
                <ExcalidrawFileIcon />
              </div>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-path">{file.parentPath}</span>
              </div>
              {currentFile?.path === file.path && isDirty && (
                <span className="dirty-indicator" title="Unsaved changes" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleCreateFile = () => {
    onCreateFile(currentFolderPath);
  };

  const handleCreateFolder = () => {
    onCreateFolder(currentFolderPath);
  };

  return (
    <div className="sidebar" onClick={handleCloseContextMenu}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <AppLogo />
          <div className="brand-text">
            <h1 className="sidebar-title">ExcaliWeb</h1>
            <span className="sidebar-subtitle">Local Whiteboard Manager</span>
          </div>
        </div>
        <div className="sidebar-actions">
          <button className="action-button" onClick={onOpenDirectory} title="Open Directory">
            <FolderIcon />
            <span>Open Folder</span>
          </button>
          <button className="action-button secondary" onClick={handleCreateFolder} title="Create New Folder">
            <FolderPlusIcon />
            <span>New Folder</span>
          </button>
          <button className="action-button primary" onClick={handleCreateFile} title="Create New File">
            <PlusIcon />
            <span>New File</span>
          </button>
        </div>
      </div>

      <div className="sidebar-divider" />

      {fileTree && (
        <div className="search-container">
          <div className="search-input-wrapper">
            <SearchIcon />
            <input
              type="text"
              className="search-input"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
                <ClearIcon />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="file-list">
        <div className="file-list-header">
          <span className="file-list-title">Files</span>
          <span className="file-count">{fileCount}</span>
        </div>

        {fileTree && (
          <div className="current-directory">
            <FolderOpenIcon />
            <span className="directory-name" title={fileTree.name}>{fileTree.name}</span>
          </div>
        )}

        {!fileTree ? (
          <div className="empty-state">
            <div className="empty-icon">
              <EmptyFolderIcon />
            </div>
            <p className="empty-title">No folder opened</p>
            <p className="empty-hint">Click "Open Folder" to get started</p>
          </div>
        ) : searchQuery ? (
          renderSearchResults()
        ) : fileTree.children.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FileIcon />
            </div>
            <p className="empty-title">No drawings yet</p>
            <p className="empty-hint">Click "New File" to create one</p>
          </div>
        ) : (
          <div className="file-items">
            {renderTreeItems()}
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'file' && (
            <>
              <button className="context-menu-item" onClick={handleRenameClick}>
                <EditIcon />
                <span>Rename</span>
              </button>
              <div className="context-menu-divider" />
            </>
          )}
          <button className="context-menu-item delete" onClick={handleDeleteClick}>
            <TrashIcon />
            <span>Delete {contextMenu.type === 'folder' ? 'Folder' : ''}</span>
          </button>
        </div>
      )}
    </div>
  );
}

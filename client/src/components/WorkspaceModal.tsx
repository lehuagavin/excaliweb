import { useState, useEffect, useRef } from 'react';
import { listDirectories, getHomeDirectory, getCommonDirectories, getDefaultWorkspace, type DirectoryItem, type DefaultWorkspaceConfig } from '../utils/api';
import './Modal.css';

// Icons
const FolderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const FolderOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const FolderLockedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <rect x="10" y="11" width="4" height="5" rx="1" fill="currentColor" opacity="0.3"/>
    <path d="M11 11v-1a1 1 0 0 1 2 0v1" strokeWidth="1.5"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
}

export function WorkspaceModal({ isOpen, onClose, onConfirm }: WorkspaceModalProps) {
  const [mode, setMode] = useState<'browse' | 'manual'>('browse');
  const [path, setPath] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [commonDirs, setCommonDirs] = useState<Array<{ name: string; path: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [defaultWorkspace, setDefaultWorkspace] = useState<DefaultWorkspaceConfig | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load default workspace config
  useEffect(() => {
    const fetchDefaultConfig = async () => {
      try {
        const config = await getDefaultWorkspace();
        setDefaultWorkspace(config);
      } catch (error) {
        console.error('Failed to fetch default workspace config:', error);
      }
    };

    if (isOpen) {
      fetchDefaultConfig();
    }
  }, [isOpen]);

  // Load home directory on mount
  useEffect(() => {
    if (isOpen && mode === 'browse') {
      loadHomeDirectory();
      loadCommonDirectories();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (isOpen && mode === 'manual') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  const loadHomeDirectory = async () => {
    try {
      const { path } = await getHomeDirectory();
      loadDirectory(path);
    } catch (err) {
      console.error('Failed to load home directory:', err);
      setError('Failed to load home directory');
    }
  };

  const loadCommonDirectories = async () => {
    try {
      const { directories } = await getCommonDirectories();
      setCommonDirs(directories);
    } catch (err) {
      console.error('Failed to load common directories:', err);
    }
  };

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await listDirectories(dirPath);
      setCurrentPath(result.currentPath);
      setParentPath(result.parentPath);
      setDirectories(result.directories);
      setPath(result.currentPath);
    } catch (err) {
      console.error('Failed to load directory:', err);
      setError('Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryClick = (dir: DirectoryItem) => {
    if (dir.isAccessible) {
      loadDirectory(dir.path);
    }
  };

  const handleParentClick = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  const handleCommonDirClick = (dirPath: string) => {
    loadDirectory(dirPath);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPath = path.trim();

    if (!trimmedPath) {
      setError('Please select or enter a directory path');
      return;
    }

    if (mode === 'manual' && !trimmedPath.startsWith('/')) {
      setError('Please enter an absolute path (starting with /)');
      return;
    }

    onConfirm(trimmedPath);
    handleClose();
  };

  const handleClose = () => {
    setMode('browse');
    setPath('');
    setCurrentPath('');
    setDirectories([]);
    setError('');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal workspace-modal">
        <div className="modal-header">
          <div className="modal-icon">
            <FolderIcon />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-title">Select Workspace Directory</h2>
            <p className="modal-subtitle">Choose where your drawings are stored</p>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Data Directory Notice */}
            {defaultWorkspace?.enabled && defaultWorkspace?.dataDir && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#1565c0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                <div>
                  <strong>Data Directory Mode</strong>
                  <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
                    This application is configured to use a specific data directory. 
                    You can only select workspaces within: <code style={{ 
                      backgroundColor: 'rgba(0,0,0,0.1)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}>{defaultWorkspace.dataDir}</code>
                  </p>
                </div>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-button ${mode === 'browse' ? 'active' : ''}`}
                onClick={() => setMode('browse')}
              >
                Browse
              </button>
              <button
                type="button"
                className={`mode-button ${mode === 'manual' ? 'active' : ''}`}
                onClick={() => setMode('manual')}
              >
                Manual Input
              </button>
            </div>

            {mode === 'browse' ? (
              <div className="directory-browser">
                {/* Common Directories */}
                {commonDirs.length > 0 && (
                  <div className="common-directories">
                    <div className="section-label">Quick Access</div>
                    <div className="common-dir-list">
                      {commonDirs.map((dir) => (
                        <button
                          key={dir.path}
                          type="button"
                          className="common-dir-item"
                          onClick={() => handleCommonDirClick(dir.path)}
                        >
                          <HomeIcon />
                          <span>{dir.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Path */}
                <div className="current-path">
                  <div className="section-label">Current Path</div>
                  <div className="path-display">{currentPath || '/'}</div>
                </div>

                {/* Directory List */}
                <div className="directory-list-container">
                  <div className="section-label">Directories</div>
                  <div className="directory-list">
                    {loading ? (
                      <div className="loading-state">Loading...</div>
                    ) : error ? (
                      <div className="error-state">{error}</div>
                    ) : (
                      <>
                        {/* Parent Directory */}
                        {parentPath && (
                          <button
                            type="button"
                            className="directory-item parent"
                            onClick={handleParentClick}
                          >
                            <ArrowUpIcon />
                            <span>..</span>
                          </button>
                        )}

                        {/* Subdirectories */}
                        {directories.length === 0 ? (
                          <div className="empty-state-small">No subdirectories</div>
                        ) : (
                          directories.map((dir) => (
                            <button
                              key={dir.path}
                              type="button"
                              className={`directory-item ${!dir.isAccessible ? 'locked' : ''}`}
                              onClick={() => handleDirectoryClick(dir)}
                              disabled={!dir.isAccessible}
                            >
                              {dir.isAccessible ? <FolderOpenIcon /> : <FolderLockedIcon />}
                              <span>{dir.name}</span>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Selected Path Preview */}
                <div className="selected-path">
                  <div className="section-label">Selected Directory</div>
                  <div className="path-preview">{path || 'None selected'}</div>
                </div>
              </div>
            ) : (
              <div className="manual-input">
                <label className="input-label" htmlFor="workspacePath">
                  Directory Path
                </label>
                <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
                  <input
                    ref={inputRef}
                    id="workspacePath"
                    type="text"
                    className="input"
                    placeholder="/home/user/drawings"
                    value={path}
                    onChange={(e) => {
                      setPath(e.target.value);
                      setError('');
                    }}
                  />
                </div>
                {error && <p className="error-message">{error}</p>}
                <p className="input-hint">
                  Enter the absolute path to your excalidraw files directory on the server.
                </p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!path.trim()}>
              Select Directory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

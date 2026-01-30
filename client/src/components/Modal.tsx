import { useState, useEffect, useRef } from 'react';
import './Modal.css';

// Icons
const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

const EditIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const FolderPlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
}

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (folderName: string) => void;
}

interface RenameFileModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

export function CreateFileModal({ isOpen, onClose, onConfirm }: CreateFileModalProps) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFileName('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fileName.trim();

    if (!trimmedName) {
      setError('Please enter a file name');
      return;
    }

    if (!/^[^<>:"/\\|?*]+$/.test(trimmedName)) {
      setError('File name contains invalid characters');
      return;
    }

    onConfirm(trimmedName);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-icon">
            <FileIcon />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-title">Create New File</h2>
            <p className="modal-subtitle">Add a new Excalidraw drawing</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="input-label" htmlFor="fileName">
              File Name
            </label>
            <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
              <input
                ref={inputRef}
                id="fileName"
                type="text"
                className="input"
                placeholder="Enter file name..."
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setError('');
                }}
              />
              <span className="input-suffix">.excalidraw</span>
            </div>
            {error && <p className="error-message">{error}</p>}
            <p className="input-hint">The file will be saved in the current folder</p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateFolderModal({ isOpen, onClose, onConfirm }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = folderName.trim();

    if (!trimmedName) {
      setError('Please enter a folder name');
      return;
    }

    if (!/^[^<>:"/\\|?*]+$/.test(trimmedName)) {
      setError('Folder name contains invalid characters');
      return;
    }

    onConfirm(trimmedName);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-icon folder">
            <FolderPlusIcon />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-title">Create New Folder</h2>
            <p className="modal-subtitle">Add a new folder to organize your drawings</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="input-label" htmlFor="folderName">
              Folder Name
            </label>
            <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
              <input
                ref={inputRef}
                id="folderName"
                type="text"
                className="input"
                placeholder="Enter folder name..."
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setError('');
                }}
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <p className="input-hint">The folder will be created in the current directory</p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RenameFileModal({ isOpen, currentName, onClose, onConfirm }: RenameFileModalProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = newName.trim();

    if (!trimmedName) {
      setError('Please enter a file name');
      return;
    }

    if (!/^[^<>:"/\\|?*]+$/.test(trimmedName)) {
      setError('File name contains invalid characters');
      return;
    }

    if (trimmedName === currentName) {
      onClose();
      return;
    }

    onConfirm(trimmedName);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-icon rename">
            <EditIcon />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-title">Rename File</h2>
            <p className="modal-subtitle">Change the file name</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="input-label" htmlFor="newFileName">
              New Name
            </label>
            <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
              <input
                ref={inputRef}
                id="newFileName"
                type="text"
                className="input"
                placeholder="Enter new file name..."
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError('');
                }}
              />
              <span className="input-suffix">.excalidraw</span>
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';

interface FileEditorProps {
  filename: 'tasks' | 'recurring' | string; // Allow string for list/goal files
  displayName: string;
  onClose: () => void;
  onFileChanged?: () => void;
  fileType?: 'tasks' | 'recurring' | 'list' | 'goal';
  fileName?: string; // For list/goal files like 'grocery', 'goals_1y', etc.
}

interface FileData {
  filename: string;
  content: string;
  path: string;
}

const FileEditor: React.FC<FileEditorProps> = ({ 
  filename, 
  displayName, 
  onClose, 
  onFileChanged, 
  fileType = 'tasks',
  fileName 
}) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  useEffect(() => {
    fetchFileContent();
  }, [filename, fileType, fileName]);

  useEffect(() => {
    if (fileData) {
      setHasChanges(editedContent !== fileData.content);
    }
  }, [editedContent, fileData]);

  const fetchFileContent = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = '';
      if (fileType === 'list' && fileName) {
        url = `${API_URL}/files/lists/${fileName}`;
      } else if (fileType === 'goal' && fileName) {
        url = `${API_URL}/files/goals/${fileName}`;
      } else {
        url = `${API_URL}/files/${filename}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${displayName}`);
      }
      
      const data = await response.json();
      setFileData(data);
      setEditedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!fileData) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      let url = '';
      if (fileType === 'list' && fileName) {
        url = `${API_URL}/files/lists/${fileName}`;
      } else if (fileType === 'goal' && fileName) {
        url = `${API_URL}/files/goals/${fileName}`;
      } else {
        url = `${API_URL}/files/${filename}`;
      }
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedContent
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save ${displayName}`);
      }
      
      const result = await response.json();
      setSuccess(result.message || 'File saved successfully');
      
      // Update the original content to match what was saved
      setFileData({ ...fileData, content: editedContent });
      
      // Notify parent component that file was changed
      if (onFileChanged) {
        onFileChanged();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleRevert = () => {
    if (fileData && window.confirm('Are you sure you want to revert all changes?')) {
      setEditedContent(fileData.content);
    }
  };

  if (loading) {
    return (
      <div className="file-editor-overlay">
        <div className="file-editor">
          <div className="file-editor-header">
            <h2>Loading {displayName}...</h2>
          </div>
          <div className="file-editor-content">
            <div className="loading">Loading file content...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-editor-overlay">
      <div className="file-editor">
        <div className="file-editor-header">
          <h2>Edit {displayName}</h2>
          <div className="file-editor-actions">
            {hasChanges && (
              <button 
                type="button" 
                onClick={handleRevert}
                className="btn-secondary"
                disabled={saving}
              >
                Revert
              </button>
            )}
            <button 
              type="button" 
              onClick={saveFile}
              className="btn-primary"
              disabled={saving || !hasChanges}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button 
              type="button" 
              onClick={handleClose}
              className="btn-close"
              disabled={saving}
            >
              ×
            </button>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}
        
        <div className="file-editor-content">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="file-editor-textarea"
            placeholder={`Enter ${displayName.toLowerCase()} content...`}
            disabled={saving}
          />
        </div>
        
        <div className="file-editor-footer">
          <div className="file-info">
            <span className="file-path">{fileData?.path}</span>
            {hasChanges && <span className="changes-indicator">• Unsaved changes</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileEditor;

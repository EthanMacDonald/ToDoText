import React, { useState } from 'react';
import { API_URL } from '../config/api';

type Props = {
  onTaskCreated: () => void;
  areas: string[];
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

const CreateTaskForm: React.FC<Props> = ({ onTaskCreated, areas, isExpanded, onExpandedChange }) => {
  const [formData, setFormData] = useState({
    area: '',
    description: '',
    priority: '',
    due_date: '',
    context: '',
    project: '',
    recurring: '',
    onhold: '',
    notes: ''  // Add notes field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.area.trim() || !formData.description.trim()) {
      alert('Area and description are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        area: formData.area,
        description: formData.description,
        ...(formData.priority && { priority: formData.priority }),
        ...(formData.due_date && { due_date: formData.due_date }),
        ...(formData.context && { context: formData.context }),
        ...(formData.project && { project: formData.project }),
        ...(formData.recurring && { recurring: formData.recurring }),
        ...(formData.onhold && { onhold: formData.onhold }),
        ...(formData.notes && { notes: formData.notes.split('\n').filter(note => note.trim()) })
      };

      console.log('Sending payload:', payload);

      const response = await fetch(`${API_URL}/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to create task: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Success response:', result);

      // Reset form
      setFormData({
        area: '',
        description: '',
        priority: '',
        due_date: '',
        context: '',
        project: '',
        recurring: '',
        onhold: '',
        notes: ''
      });
      
      onExpandedChange(false);
      onTaskCreated();
      
    } catch (error) {
      console.error('Error creating task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ 
      backgroundColor: '#2d3748', 
      border: '1px solid #4a5568', 
      borderRadius: '8px', 
      marginBottom: '24px',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => onExpandedChange(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#1a202c',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #4a5568' : 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>➕ Create New Task</span>
        <span style={{ fontSize: '12px' }}>
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>
      
      {isExpanded && (
        <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fed7d7',
              color: '#c53030',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            
            {/* Area - Required */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
                Area *
              </label>
              <select
                value={formData.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
                required
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Area</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
                Priority
              </label>
              <input
                type="text"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                placeholder="A, B, C, D, E, F"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Due Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Context */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
                Context
              </label>
              <input
                type="text"
                value={formData.context}
                onChange={(e) => handleInputChange('context', e.target.value)}
                placeholder="e.g., Office, Home, Phone"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Project */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
                Project
              </label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) => handleInputChange('project', e.target.value)}
                placeholder="e.g., SecondBrain, Dashboard"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Recurring */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
                Recurring
              </label>
              <input
                type="text"
                value={formData.recurring}
                onChange={(e) => handleInputChange('recurring', e.target.value)}
                placeholder="e.g., daily, weekly:Mon, monthly:15"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* On Hold */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
                On Hold
              </label>
              <input
                type="text"
                value={formData.onhold}
                onChange={(e) => handleInputChange('onhold', e.target.value)}
                placeholder="e.g., 2025-07-15 or waiting for approval"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Description - Full width */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
              Task Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter task description..."
              required
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Notes - Full width */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter notes for this task (one per line)..."
              rows={3}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>
              Each line will become a separate note
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              disabled={isSubmitting || !formData.area.trim() || !formData.description.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: isSubmitting || !formData.area.trim() || !formData.description.trim() ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting || !formData.area.trim() || !formData.description.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
            
            <button
              type="button"
              onClick={() => onExpandedChange(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateTaskForm;

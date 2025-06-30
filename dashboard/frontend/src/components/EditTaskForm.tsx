import React, { useState } from 'react';
import type { Task } from '../types/task';
import { API_URL } from '../config/api';

type Props = {
  task: Task;
  areas: string[];
  onTaskEdited: () => void;
  onCancel: () => void;
};

const EditTaskForm: React.FC<Props> = ({ task, areas, onTaskEdited, onCancel }) => {
  const [formData, setFormData] = useState({
    area: task.area || '',
    description: task.description || '',
    priority: task.priority || '',
    due_date: task.due_date || '',
    done_date: task.done_date || '',
    followup_date: task.followup_date || '',
    context: task.context || '',
    project: task.project || '',
    recurring: task.recurring || '',
    completed: task.completed || false
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
        completed: formData.completed,
        ...(formData.priority && { priority: formData.priority }),
        ...(formData.due_date && { due_date: formData.due_date }),
        ...(formData.done_date && { done_date: formData.done_date }),
        ...(formData.followup_date && { followup_date: formData.followup_date }),
        ...(formData.context && { context: formData.context }),
        ...(formData.project && { project: formData.project }),
        ...(formData.recurring && { recurring: formData.recurring })
      };

      console.log('Sending edit payload:', payload);

      const response = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to edit task: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Success response:', result);

      onTaskEdited();
      
    } catch (error) {
      console.error('Error editing task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit task. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ 
      backgroundColor: '#2d3748', 
      border: '1px solid #4a5568', 
      borderRadius: '8px', 
      padding: '16px',
      marginTop: '8px'
    }}>
      <h4 style={{ 
        color: 'white', 
        margin: '0 0 16px 0', 
        fontSize: '16px',
        borderBottom: '1px solid #4a5568',
        paddingBottom: '8px'
      }}>
        ✏️ Edit Task
      </h4>
      
      <form onSubmit={handleSubmit}>
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

          {/* Completed Status */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
              Status
            </label>
            <select
              value={formData.completed ? 'completed' : 'incomplete'}
              onChange={(e) => handleInputChange('completed', e.target.value === 'completed')}
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
              <option value="incomplete">Incomplete</option>
              <option value="completed">Completed</option>
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

          {/* Done Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
              Done Date
            </label>
            <input
              type="date"
              value={formData.done_date}
              onChange={(e) => handleInputChange('done_date', e.target.value)}
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

          {/* Follow-up Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>
              Follow-up Date
            </label>
            <input
              type="date"
              value={formData.followup_date}
              onChange={(e) => handleInputChange('followup_date', e.target.value)}
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

        {/* Completion Status */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'white',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={formData.completed}
              onChange={(e) => handleInputChange('completed', e.target.checked)}
              style={{ 
                width: '16px', 
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontWeight: 'bold' }}>
              Mark as completed
            </span>
            {formData.followup_date && (
              <span style={{ 
                fontSize: '12px', 
                color: '#fbbf24',
                fontStyle: 'italic'
              }}>
                (Note: Tasks with follow-up dates are typically not marked as completed)
              </span>
            )}
          </label>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            disabled={isSubmitting || !formData.area.trim() || !formData.description.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: isSubmitting || !formData.area.trim() || !formData.description.trim() ? '#6c757d' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting || !formData.area.trim() || !formData.description.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
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
    </div>
  );
};

export default EditTaskForm;

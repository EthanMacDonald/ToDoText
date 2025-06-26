import React, { useState } from 'react';

type Props = {
  onTaskCreated: () => void;
  areas: string[];
  contexts: string[];
  projects: string[];
};

const CreateTaskForm: React.FC<Props> = ({ onTaskCreated, areas, contexts, projects }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    area: '',
    description: '',
    priority: '',
    due_date: '',
    context: '',
    project: '',
    recurring: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priorityOptions = ['', 'A', 'B', 'C', 'D', 'E', 'F'];
  const recurringOptions = [
    { value: '', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly:Mon', label: 'Weekly (Monday)' },
    { value: 'weekly:Tue', label: 'Weekly (Tuesday)' },
    { value: 'weekly:Wed', label: 'Weekly (Wednesday)' },
    { value: 'weekly:Thu', label: 'Weekly (Thursday)' },
    { value: 'weekly:Fri', label: 'Weekly (Friday)' },
    { value: 'weekly:Sat', label: 'Weekly (Saturday)' },
    { value: 'weekly:Sun', label: 'Weekly (Sunday)' },
    { value: 'monthly:1', label: 'Monthly (1st)' },
    { value: 'monthly:15', label: 'Monthly (15th)' },
    { value: 'yearly:06-24', label: 'Yearly (Example: June 24)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.area.trim() || !formData.description.trim()) {
      alert('Area and description are required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        area: formData.area,
        description: formData.description,
        ...(formData.priority && { priority: formData.priority }),
        ...(formData.due_date && { due_date: formData.due_date }),
        ...(formData.context && { context: formData.context }),
        ...(formData.project && { project: formData.project }),
        ...(formData.recurring && { recurring: formData.recurring })
      };

      const response = await fetch('http://localhost:8000/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      // Reset form
      setFormData({
        area: '',
        description: '',
        priority: '',
        due_date: '',
        context: '',
        project: '',
        recurring: ''
      });
      
      setIsExpanded(false);
      onTaskCreated();
      
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      border: '1px solid #dee2e6', 
      borderRadius: '8px', 
      marginBottom: '24px',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#e9ecef',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #dee2e6' : 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            marginBottom: '16px' 
          }}>
            
            {/* Area - Required */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#dc3545' }}>
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
                  border: '1px solid #ced4da',
                  backgroundColor: 'white'
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
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ced4da',
                  backgroundColor: 'white'
                }}
              >
                {priorityOptions.map(priority => (
                  <option key={priority} value={priority}>
                    {priority || 'None'}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
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
                  border: '1px solid #ced4da',
                  backgroundColor: 'white'
                }}
              />
            </div>

            {/* Context */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Context
              </label>
              <select
                value={formData.context}
                onChange={(e) => handleInputChange('context', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ced4da',
                  backgroundColor: 'white'
                }}
              >
                <option value="">None</option>
                {contexts.map(context => (
                  <option key={context} value={context}>{context}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Project
              </label>
              <select
                value={formData.project}
                onChange={(e) => handleInputChange('project', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ced4da',
                  backgroundColor: 'white'
                }}
              >
                <option value="">None</option>
                {projects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>

            {/* Recurring */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Recurring
              </label>
              <select
                value={formData.recurring}
                onChange={(e) => handleInputChange('recurring', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ced4da',
                  backgroundColor: 'white'
                }}
              >
                {recurringOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description - Full width */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#dc3545' }}>
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
                border: '1px solid #ced4da',
                backgroundColor: 'white',
                fontSize: '16px'
              }}
            />
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
              onClick={() => setIsExpanded(false)}
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

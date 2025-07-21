import React, { useState } from 'react';
import type { Task, TaskGroup } from '../types/task';
import EditTaskForm from './EditTaskForm';

// Enhanced form component for adding subtasks with all task fields
const AddSubtaskForm: React.FC<{
  onSubmit: (description: string, notes: string[], additionalData: any) => void;
  onCancel: () => void;
  parentArea: string; // Add parent area prop
}> = ({ onSubmit, onCancel, parentArea }) => {
  const [formData, setFormData] = useState({
    description: '',
    area: parentArea, // Use parent's area as default
    priority: '',
    due_date: '',
    done_date: '',
    followup_date: '',
    context: '',
    project: '',
    status: '',
    onhold: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.description.trim()) {
      const notes = formData.notes.split('\n').filter(note => note.trim() !== '');
      const additionalData = {
        area: formData.area || parentArea, // Ensure area is always provided
        priority: formData.priority,
        due_date: formData.due_date,
        done_date: formData.done_date,
        followup_date: formData.followup_date,
        context: formData.context,
        project: formData.project,
        status: formData.status,
        onhold: formData.onhold
      };
      onSubmit(formData.description.trim(), notes, additionalData);
      setFormData({
        description: '',
        area: parentArea,
        priority: '',
        due_date: '',
        done_date: '',
        followup_date: '',
        context: '',
        project: '',
        status: '',
        onhold: '',
        notes: ''
      });
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
      padding: '16px',
      margin: '8px 0'
    }}>
      <h4 style={{ 
        color: '#f7fafc', 
        margin: '0 0 12px 0', 
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        Add Subtask
      </h4>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Grid layout for form fields */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px'
        }}>
          
          {/* Priority */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              Priority
            </label>
            <input
              type="text"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              placeholder="A, B, C, D, E, F"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Incomplete</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Done Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              Done Date
            </label>
            <input
              type="date"
              value={formData.done_date}
              onChange={(e) => handleInputChange('done_date', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Follow-up Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              Follow-up Date
            </label>
            <input
              type="date"
              value={formData.followup_date}
              onChange={(e) => handleInputChange('followup_date', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Context */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              Context
            </label>
            <input
              type="text"
              value={formData.context}
              onChange={(e) => handleInputChange('context', e.target.value)}
              placeholder="e.g., Office, Home, Phone"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Project */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              Project
            </label>
            <input
              type="text"
              value={formData.project}
              onChange={(e) => handleInputChange('project', e.target.value)}
              placeholder="e.g., SecondBrain, Dashboard"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* On Hold */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
              On Hold
            </label>
            <input
              type="text"
              value={formData.onhold}
              onChange={(e) => handleInputChange('onhold', e.target.value)}
              placeholder="e.g., 2025-07-15 or waiting for approval"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#f7fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Description - Full width */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
            Subtask Description *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter subtask description..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #4a5568',
              backgroundColor: '#1a202c',
              color: '#f7fafc',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
        </div>
        
        {/* Notes - Full width */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#f7fafc' }}>
            Notes (optional, one per line)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Enter notes, one per line..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #4a5568',
              backgroundColor: '#1a202c',
              color: '#f7fafc',
              fontSize: '12px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              backgroundColor: '#2d3748',
              color: '#a0aec0',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.description.trim()}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: formData.description.trim() ? '#059669' : '#6b7280',
              color: 'white',
              cursor: formData.description.trim() ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Add Subtask
          </button>
        </div>
      </form>
    </div>
  );
};

type Props = {
  data: TaskGroup[] | Task[];
  onCheck: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, description: string, notes: string[], additionalData?: any) => void;
  onRecurringStatus?: (id: string, status: 'completed' | 'missed' | 'deferred') => void;
  filters: { area: string; context: string; project: string };
  isRecurring?: boolean;
  areas: string[];
  onTaskEdited: () => void;
  editingTaskId: string | null;
  onEditingTaskIdChange: (id: string | null) => void;
  addingSubtaskToId: string | null;
  onAddingSubtaskToIdChange: (id: string | null) => void;
};

function filterTask(task: Task, filters: Props['filters']) {
  if (filters.area && task.area !== filters.area) return false;
  if (filters.context && task.context !== filters.context) return false;
  if (filters.project && task.project !== filters.project) return false;
  return true;
}

const TaskItem: React.FC<{
  task: Task;
  onCheck: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, description: string, notes: string[], additionalData?: any) => void;
  onRecurringStatus?: (id: string, status: 'completed' | 'missed' | 'deferred') => void;
  depth?: number;
  isRecurring?: boolean;
  areas: string[];
  onTaskEdited: () => void;
  editingTaskId: string | null;
  onEditingTaskIdChange: (id: string | null) => void;
  addingSubtaskToId: string | null;
  onAddingSubtaskToIdChange: (id: string | null) => void;
}> = ({ task, onCheck, onEdit, onDelete, onAddSubtask, onRecurringStatus, depth = 0, isRecurring = false, areas, onTaskEdited, editingTaskId, onEditingTaskIdChange, addingSubtaskToId, onAddingSubtaskToIdChange }) => {
  // Build metadata string in the format: (priority:A due:2025-06-24 progress:50%)
  const buildMetadataString = (task: Task) => {
    const meta: string[] = [];
    
    if (task.priority) {
      meta.push(`priority:${task.priority}`);
    }
    if (task.due_date) {
      meta.push(`due:${task.due_date}`);
    }
    if (task.done_date_obj) {
      meta.push(`done:${task.done_date_obj}`);
    }
    if (task.followup_date) {
      meta.push(`followup:${task.followup_date}`);
    }
    if (task.recurring) {
      meta.push(`every:${task.recurring}`);
    }
    
    // Add any additional metadata from the metadata object
    if (task.metadata) {
      Object.entries(task.metadata).forEach(([key, value]) => {
        // Skip keys we've already handled above
        if (!['priority', 'due', 'done', 'done_date', 'followup', 'followup_date', 'every'].includes(key) && value) {
          meta.push(`${key}:${value}`);
        }
      });
    }
    
    return meta.length > 0 ? ` (${meta.join(' ')})` : '';
  };

  // Build tags string in the format: +Project @Context &Area
  const buildTagsString = (task: Task, isPrimaryTask: boolean = false) => {
    const tags: string[] = [];
    
    // Add primary project tag
    if (task.project && task.project !== 'NoProject') {
      tags.push(`+${task.project}`);
    }
    
    // Add extra project tags
    if (task.extra_projects && task.extra_projects.length > 0) {
      task.extra_projects.forEach(project => {
        if (project !== task.project) {
          tags.push(`+${project}`);
        }
      });
    }
    
    // Add primary context tag
    if (task.context && task.context !== 'NoContext') {
      tags.push(`@${task.context}`);
    }
    
    // Add extra context tags
    if (task.extra_contexts && task.extra_contexts.length > 0) {
      task.extra_contexts.forEach(context => {
        if (context !== task.context) {
          tags.push(`@${context}`);
        }
      });
    }
    
    // Add area tag for primary tasks (not subtasks)
    if (isPrimaryTask && task.area && depth === 0) {
      tags.push(`&${task.area}`);
    }
    
    return tags.length > 0 ? ` ${tags.join(' ')}` : '';
  };

  const metadataString = buildMetadataString(task);
  const tagsString = buildTagsString(task, depth === 0);

  // Determine task styling based on status
  const getTaskStyle = () => {
    let opacity = 1;
    let backgroundColor = 'transparent';
    let borderLeft = 'none';
    
    if (task.completed || task.status === 'done') {
      opacity = 0.5;
    }
    
    return {
      margin: '4px 0',
      opacity,
      backgroundColor,
      borderLeft,
      borderRadius: '4px',
      padding: '0',
      marginLeft: `${depth * 20}px`,
      fontSize: depth > 0 ? '14px' : '16px'
    };
  };

  return (
    <>
      <li style={getTaskStyle()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          {/* Status buttons for recurring tasks - moved to left */}
          {isRecurring && onRecurringStatus && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onRecurringStatus(task.id, 'completed');
                }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
                title="Mark as completed"
              >
                ✓
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onRecurringStatus(task.id, 'missed');
                }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
                title="Mark as missed"
              >
                ✗
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onRecurringStatus(task.id, 'deferred');
                }}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
                title="Mark as deferred"
              >
                ↻
              </button>
            </div>
          )}
          
          {/* For non-recurring tasks, show checkbox */}
          {!isRecurring && (
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onCheck(task.id)}
              style={{ 
                marginTop: '2px',
                cursor: 'pointer'
              }}
              title={task.followup_date ? 'Mark as completed and remove follow-up' : 'Mark as completed'}
            />
          )}
          
          <span style={{ flex: 1 }}>
            {task.description}
            {metadataString && (
              <span style={{ color: '#666', marginLeft: 4, fontSize: '12px' }}>
                {metadataString}
              </span>
            )}
            {tagsString && (
              <span style={{ color: '#0066cc', marginLeft: 4, fontSize: '12px', fontWeight: 500 }}>
                {tagsString}
              </span>
            )}
          </span>
          
          {/* Only show edit button for non-recurring tasks */}
          {onEdit && !isRecurring && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Purple tag for follow-up tasks */}
              {task.followup_date && (
                <span
                  style={{
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}
                  title={`Follow-up date: ${task.followup_date}`}
                >
                  Follow-up
                </span>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onEditingTaskIdChange(editingTaskId === task.id ? null : task.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3182ce',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px 4px',
                  borderRadius: '2px'
                }}
                title="Edit task"
              >
                {editingTaskId === task.id ? '❌' : '✏️'}
              </button>
            </div>
          )}
        </div>
      </li>
      
      {/* Inline Edit Form - only for non-recurring tasks */}
      {editingTaskId === task.id && !isRecurring && (
        <div style={{ marginLeft: `${depth * 20}px`, marginTop: '8px', marginBottom: '8px' }}>
          <EditTaskForm
            task={task}
            areas={areas}
            onTaskEdited={() => {
              onTaskEdited();
              onEditingTaskIdChange(null);
            }}
            onCancel={() => onEditingTaskIdChange(null)}
            onDelete={onDelete}
            onAddSubtask={onAddSubtask}
            onAddingSubtaskToIdChange={onAddingSubtaskToIdChange}
          />
        </div>
      )}
      
      {/* Inline Add Subtask Form - allow for all tasks, not just top-level */}
      {addingSubtaskToId === task.id && onAddSubtask && !isRecurring && (
        <div style={{ marginLeft: `${depth * 20 + 20}px`, marginTop: '8px', marginBottom: '8px' }}>
          <AddSubtaskForm
            parentArea={task.area || ''}
            onSubmit={(description: string, notes: string[], additionalData: any) => {
              onAddSubtask(task.id, description, notes, additionalData);
              onAddingSubtaskToIdChange(null);
            }}
            onCancel={() => onAddingSubtaskToIdChange(null)}
          />
        </div>
      )}
      
      {/* Render notes */}
      {task.notes?.map((note, index) => (
        <li 
          key={`note-${task.id}-${index}`}
          style={{ 
            margin: '2px 0', 
            marginLeft: `${(depth + 1) * 20}px`,
            fontSize: '13px',
            color: '#666',
            fontStyle: 'italic'
          }}
        >
          {note.content}
        </li>
      ))}
      
      {/* Render subtasks */}
      {task.subtasks?.map(subtask => (
        <TaskItem
          key={subtask.id}
          task={subtask}
          onCheck={onCheck}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubtask={onAddSubtask}
          onRecurringStatus={onRecurringStatus}
          isRecurring={isRecurring}
          depth={depth + 1}
          areas={areas}
          onTaskEdited={onTaskEdited}
          editingTaskId={editingTaskId}
          onEditingTaskIdChange={onEditingTaskIdChange}
          addingSubtaskToId={addingSubtaskToId}
          onAddingSubtaskToIdChange={onAddingSubtaskToIdChange}
        />
      ))}
    </>
  );
};

const TaskList: React.FC<Props> = ({ data, onCheck, onEdit, onDelete, onAddSubtask, onRecurringStatus, filters, isRecurring = false, areas, onTaskEdited, editingTaskId, onEditingTaskIdChange, addingSubtaskToId, onAddingSubtaskToIdChange }) => {
  // Handle null or undefined data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div>No tasks to display</div>;
  }

  // Handle both grouped and flat data structures
  const isGroupedData = (data: TaskGroup[] | Task[]): data is TaskGroup[] => {
    return data.length > 0 && 'type' in data[0] && (data[0].type === 'group' || data[0].type === 'area');
  };

  if (isGroupedData(data)) {
    // Render grouped data
    return (
      <div>
        {data.map(group => {
          // Handle both regular tasks (with title) and recurring tasks (with area)
          const groupTitle = group.title || group.area || 'Unknown';
          const groupKey = group.title || group.area || 'unknown';
          
          return (
            <div key={groupKey}>
              <h3 style={{ 
                marginTop: 20, 
                marginBottom: 10, 
                color: '#666', 
                fontSize: '16px',
                borderBottom: '1px solid #eee',
                paddingBottom: '4px'
              }}>
                {groupTitle}:
              </h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {(group.tasks || [])
                  .filter(task => filterTask(task, filters))
                  .map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onCheck={onCheck}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddSubtask={onAddSubtask}
                      onRecurringStatus={onRecurringStatus}
                      isRecurring={isRecurring}
                      areas={areas}
                      onTaskEdited={onTaskEdited}
                      editingTaskId={editingTaskId}
                      onEditingTaskIdChange={onEditingTaskIdChange}
                      addingSubtaskToId={addingSubtaskToId}
                      onAddingSubtaskToIdChange={onAddingSubtaskToIdChange}
                    />
                  ))
                }
              </ul>
            </div>
          );
        })}
      </div>
    );
  } else {
    // Render flat data (legacy support)
    return (
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {((data as Task[]) || [])
          .filter(task => filterTask(task, filters))
          .map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onCheck={onCheck}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onRecurringStatus={onRecurringStatus}
              isRecurring={isRecurring}
              areas={areas}
              onTaskEdited={onTaskEdited}
              editingTaskId={editingTaskId}
              onEditingTaskIdChange={onEditingTaskIdChange}
              addingSubtaskToId={addingSubtaskToId}
              onAddingSubtaskToIdChange={onAddingSubtaskToIdChange}
            />
          ))
        }
      </ul>
    );
  }
};

export default TaskList;

import React, { useState } from 'react';
import type { Task, TaskGroup } from '../types/task';
import EditTaskForm from './EditTaskForm';

// Simple form component for adding subtasks
const AddSubtaskForm: React.FC<{
  onSubmit: (description: string, notes: string[]) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [notesText, setNotesText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      const notes = notesText.split('\n').filter(note => note.trim() !== '');
      onSubmit(description.trim(), notes);
      setDescription('');
      setNotesText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Subtask Description:</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter subtask description..."
          style={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
          autoFocus
        />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Notes (optional, one per line):</label>
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Enter notes, one per line..."
          rows={3}
          style={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '12px',
            resize: 'vertical'
          }}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '4px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f5f5f5',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!description.trim()}
          style={{
            padding: '4px 12px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: description.trim() ? '#059669' : '#ccc',
            color: 'white',
            cursor: description.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px'
          }}
        >
          Add Subtask
        </button>
      </div>
    </form>
  );
};

type Props = {
  data: TaskGroup[] | Task[];
  onCheck: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, description: string, notes: string[]) => void;
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
  onAddSubtask?: (parentId: string, description: string, notes: string[]) => void;
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
        <div style={{ marginLeft: `${depth * 20 + 20}px`, marginTop: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px', padding: '8px', backgroundColor: '#f9f9f9' }}>
          <AddSubtaskForm
            onSubmit={(description: string, notes: string[]) => {
              onAddSubtask(task.id, description, notes);
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
                {group.tasks
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
        {(data as Task[])
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

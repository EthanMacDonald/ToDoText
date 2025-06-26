import React from 'react';
import type { Task, TaskGroup } from '../types/task';

type Props = {
  data: TaskGroup[] | Task[];
  onCheck: (id: string) => void;
  filters: { area: string; context: string; project: string };
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
  depth?: number;
}> = ({ task, onCheck, depth = 0 }) => {
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
    if (task.recurring) {
      meta.push(`every:${task.recurring}`);
    }
    
    // Add any additional metadata from the metadata object
    if (task.metadata) {
      Object.entries(task.metadata).forEach(([key, value]) => {
        // Skip keys we've already handled
        if (!['priority', 'due', 'done', 'every'].includes(key) && value) {
          meta.push(`${key}:${value}`);
        }
      });
    }
    
    return meta.length > 0 ? ` (${meta.join(' ')})` : '';
  };

  // Build tags string in the format: +Project @Context
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
      tags.push(`+${task.area}`);
    }
    
    return tags.length > 0 ? ` ${tags.join(' ')}` : '';
  };

  const metadataString = buildMetadataString(task);
  const tagsString = buildTagsString(task, depth === 0);

  return (
    <>
      <li 
        style={{ 
          margin: '4px 0', 
          opacity: task.completed ? 0.5 : 1,
          marginLeft: `${depth * 20}px`,
          fontSize: depth > 0 ? '14px' : '16px'
        }}
      >
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onCheck(task.id)}
            disabled={task.completed}
            style={{ marginTop: '2px' }}
          />
          <span>
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
        </label>
      </li>
      
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
          depth={depth + 1}
        />
      ))}
    </>
  );
};

const TaskList: React.FC<Props> = ({ data, onCheck, filters }) => {
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
            />
          ))
        }
      </ul>
    );
  }
};

export default TaskList;

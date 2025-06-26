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
            {task.due_date && (
              <span style={{ color: '#888', marginLeft: 8, fontSize: '12px' }}>
                (Due: {task.due_date})
              </span>
            )}
            {task.priority && (
              <span style={{ color: '#666', marginLeft: 8, fontSize: '12px' }}>
                [Priority: {task.priority}]
              </span>
            )}
            {task.recurring && (
              <span style={{ color: '#888', marginLeft: 8, fontSize: '12px' }}>
                (every: {task.recurring})
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

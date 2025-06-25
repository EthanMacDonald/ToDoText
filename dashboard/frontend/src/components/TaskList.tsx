import React from 'react';

type Task = {
  id: string;
  description: string;
  completed: boolean;
  area?: string;
  context?: string;
  project?: string;
  due_date?: string;
  priority?: string;
};

type Props = {
  tasks: Task[];
  onCheck: (id: string) => void;
  filters: { area: string; context: string; project: string };
};

function filterTask(task: Task, filters: Props['filters']) {
  if (filters.area && task.area !== filters.area) return false;
  if (filters.context && task.context !== filters.context) return false;
  if (filters.project && task.project !== filters.project) return false;
  return true;
}

const TaskList: React.FC<Props> = ({ tasks, onCheck, filters }) => (
  <ul style={{ listStyle: 'none', padding: 0 }}>
    {tasks.filter(t => filterTask(t, filters)).map(task => (
      <li key={task.id} style={{ margin: '8px 0', opacity: task.completed ? 0.5 : 1 }}>
        <label>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onCheck(task.id)}
            disabled={task.completed}
          />
          {' '}
          {task.description}
          {task.due_date && (
            <span style={{ color: '#888', marginLeft: 8 }}>
              (Due: {task.due_date})
            </span>
          )}
        </label>
      </li>
    ))}
  </ul>
);

export default TaskList;

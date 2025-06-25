import React, { useEffect, useState } from 'react';

type Task = {
  id: string;
  description: string;
  completed: boolean;
  area?: string;
  context?: string;
  project?: string;
  due_date?: string;
  priority?: string;
  recurring?: string;
};

const API_URL = 'http://localhost:8000';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<Task[]>([]);
  const [filters, setFilters] = useState({ area: '', context: '', project: '' });

  useEffect(() => {
    fetch(`${API_URL}/tasks`).then(r => r.json()).then(setTasks);
    fetch(`${API_URL}/recurring`).then(r => r.json()).then(setRecurring);
  }, []);

  const handleCheck = async (id: string, recurringTask: boolean) => {
    await fetch(`${API_URL}/${recurringTask ? 'recurring' : 'tasks'}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id })
    });
    fetch(`${API_URL}/tasks`).then(r => r.json()).then(setTasks);
    fetch(`${API_URL}/recurring`).then(r => r.json()).then(setRecurring);
  };

  const filterTask = (task: Task) => {
    if (filters.area && task.area !== filters.area) return false;
    if (filters.context && task.context !== filters.context) return false;
    if (filters.project && task.project !== filters.project) return false;
    return true;
  };

  const unique = (arr: (string|undefined)[]) => Array.from(new Set(arr.filter(Boolean)));
  const areas = unique([...tasks, ...recurring].map(t => t.area));
  const contexts = unique([...tasks, ...recurring].map(t => t.context));
  const projects = unique([...tasks, ...recurring].map(t => t.project));

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 24 }}>
      <h1>Task Dashboard</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <select value={filters.area} onChange={e => setFilters({ ...filters, area: e.target.value })}>
          <option value=''>All Areas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.context} onChange={e => setFilters({ ...filters, context: e.target.value })}>
          <option value=''>All Contexts</option>
          {contexts.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })}>
          <option value=''>All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <h2>Today's Recurring Tasks</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {recurring.filter(filterTask).map(task => (
          <li key={task.id} style={{ margin: '8px 0', opacity: task.completed ? 0.5 : 1 }}>
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleCheck(task.id, true)}
                disabled={task.completed}
              />{' '}
              {task.description}
              {task.recurring && <span style={{ color: '#888', marginLeft: 8 }}>(every: {task.recurring})</span>}
            </label>
          </li>
        ))}
      </ul>
      <h2>Upcoming Tasks</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.filter(filterTask).map(task => (
          <li key={task.id} style={{ margin: '8px 0', opacity: task.completed ? 0.5 : 1 }}>
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleCheck(task.id, false)}
                disabled={task.completed}
              />{' '}
              {task.description}
              {task.due_date && <span style={{ color: '#888', marginLeft: 8 }}>(Due: {task.due_date})</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

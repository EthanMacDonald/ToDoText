import { useEffect, useState } from 'react';

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
  indent_level?: number;
};

const API_URL = 'http://localhost:8000';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<Task[]>([]);
  const [filters, setFilters] = useState({ area: '', context: '', project: '' });
  const [sortBy, setSortBy] = useState('none'); // 'none', 'due', 'priority'

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

  const sortTasks = (taskList: Task[]) => {
    if (sortBy === 'none') return taskList;
    
    const priorityOrder: { [key: string]: number } = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6 };
    
    return [...taskList].sort((a, b) => {
      if (sortBy === 'priority') {
        const aPriority = priorityOrder[a.priority || ''] || 99;
        const bPriority = priorityOrder[b.priority || ''] || 99;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // Secondary sort by description
        return a.description.localeCompare(b.description);
      } else if (sortBy === 'due') {
        // Sort by completion status first (incomplete tasks first)
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Then by due date (tasks with due dates first, null dates last)
        const aDate = a.due_date ? new Date(a.due_date) : null;
        const bDate = b.due_date ? new Date(b.due_date) : null;
        
        if (aDate && bDate) {
          return aDate.getTime() - bDate.getTime();
        } else if (aDate && !bDate) {
          return -1; // a has due date, b doesn't - a comes first
        } else if (!aDate && bDate) {
          return 1; // b has due date, a doesn't - b comes first
        }
        // Both have no due date, sort by description
        return a.description.localeCompare(b.description);
      }
      return 0;
    });
  };

  const unique = (arr: (string|undefined)[]) => Array.from(new Set(arr.filter(Boolean)));
  const areas = unique([...tasks, ...recurring].map(t => t.area));
  const contexts = unique([...tasks, ...recurring].map(t => t.context));
  const projects = unique([...tasks, ...recurring].map(t => t.project));

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 24 }}>
      <h1>Task Dashboard</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px' }}>Filter by Area:</label>
          <select value={filters.area} onChange={e => setFilters({ ...filters, area: e.target.value })}>
            <option value=''>All Areas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px' }}>Filter by Context:</label>
          <select value={filters.context} onChange={e => setFilters({ ...filters, context: e.target.value })}>
            <option value=''>All Contexts</option>
            {contexts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px' }}>Filter by Project:</label>
          <select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })}>
            <option value=''>All Projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px' }}>Sort by:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value='none'>No Sorting</option>
            <option value='due'>Due Date</option>
            <option value='priority'>Priority</option>
          </select>
        </div>
      </div>
      <h2>Today's Recurring Tasks</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sortTasks(recurring.filter(filterTask)).map(task => (
          <li 
            key={task.id} 
            style={{ 
              margin: '8px 0', 
              opacity: task.completed ? 0.5 : 1,
              marginLeft: `${(task.indent_level || 0) * 20}px` // 20px indentation per level
            }}
          >
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
        {sortTasks(tasks.filter(filterTask)).map(task => (
          <li 
            key={task.id} 
            style={{ 
              margin: '8px 0', 
              opacity: task.completed ? 0.5 : 1,
              marginLeft: `${(task.indent_level || 0) * 20}px` // 20px indentation per level
            }}
          >
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

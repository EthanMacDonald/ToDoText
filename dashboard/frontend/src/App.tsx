import React, { useEffect, useState } from 'react';
import TaskList from './components/TaskList';
import Filters from './components/Filters';

const API_URL = 'http://localhost:8000';

function App() {
  const [tasks, setTasks] = useState([]);
  const [recurring, setRecurring] = useState([]);
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
    // Refresh
    fetch(`${API_URL}/tasks`).then(r => r.json()).then(setTasks);
    fetch(`${API_URL}/recurring`).then(r => r.json()).then(setRecurring);
  };

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 24 }}>
      <h1>Task Dashboard</h1>
      <Filters filters={filters} setFilters={setFilters} />
      <h2>Today's Recurring Tasks</h2>
      <TaskList tasks={recurring} onCheck={id => handleCheck(id, true)} filters={filters} />
      <h2>Upcoming Tasks</h2>
      <TaskList tasks={tasks} onCheck={id => handleCheck(id, false)} filters={filters} />
    </div>
  );
}

export default App;

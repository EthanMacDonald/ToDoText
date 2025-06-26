import { useEffect, useState } from 'react';
import TaskList from './components/TaskList';
import type { Task, TaskGroup } from './types/task';

const API_URL = 'http://localhost:8000';

function App() {
  const [tasks, setTasks] = useState<TaskGroup[]>([]);
  const [recurring, setRecurring] = useState<TaskGroup[]>([]);
  const [filters, setFilters] = useState({ area: '', context: '', project: '' });
  const [sortBy, setSortBy] = useState('due'); // 'none', 'due', 'priority'
  const [taskTypeFilter, setTaskTypeFilter] = useState('all'); // 'all', 'regular', 'recurring'

  useEffect(() => {
    const fetchTasks = async () => {
      const tasksUrl = sortBy === 'none' ? '/tasks?sort=none' : 
                      sortBy === 'priority' ? '/tasks?sort=priority' : '/tasks';
      
      const [tasksRes, recurringRes] = await Promise.all([
        fetch(`${API_URL}${tasksUrl}`),
        fetch(`${API_URL}/recurring`)
      ]);
      
      const tasksData = await tasksRes.json();
      const recurringData = await recurringRes.json();
      
      setTasks(tasksData);
      setRecurring(recurringData);
    };
    
    fetchTasks();
  }, [sortBy]);

  const handleCheck = async (id: string, recurringTask: boolean = false) => {
    await fetch(`${API_URL}/${recurringTask ? 'recurring' : 'tasks'}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id })
    });
    // Refresh data
    fetch(`${API_URL}/tasks`).then(r => r.json()).then(setTasks);
    fetch(`${API_URL}/recurring`).then(r => r.json()).then(setRecurring);
  };

  // Extract unique values for filters from both task groups and recurring tasks
  const getAllTasks = (): Task[] => {
    const allTasks: Task[] = [];
    
    // Extract tasks from grouped structure
    const extractFromGroups = (groups: TaskGroup[]) => {
      groups.forEach(group => {
        const extractTasksRecursively = (taskList: Task[]) => {
          taskList.forEach(task => {
            allTasks.push(task);
            if (task.subtasks) {
              extractTasksRecursively(task.subtasks);
            }
          });
        };
        extractTasksRecursively(group.tasks);
      });
    };
    
    extractFromGroups(tasks);
    extractFromGroups(recurring);
    
    return allTasks;
  };

  const allTasks = getAllTasks();
  const unique = (arr: (string | undefined)[]) => Array.from(new Set(arr.filter(Boolean)));
  const areas = unique(allTasks.map(t => t.area));
  const contexts = unique(allTasks.map(t => t.context));
  const projects = unique(allTasks.map(t => t.project));

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 24 }}>
      <h1>Task Dashboard</h1>
      
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px', color: 'white' }}>
            Show:
          </label>
          <select 
            value={taskTypeFilter} 
            onChange={e => setTaskTypeFilter(e.target.value)}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value='all'>All Tasks</option>
            <option value='regular'>Regular Tasks Only</option>
            <option value='recurring'>Recurring Tasks Only</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px', color: 'white' }}>
            Filter by Area:
          </label>
          <select 
            value={filters.area} 
            onChange={e => setFilters({ ...filters, area: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value=''>All Areas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px', color: 'white' }}>
            Filter by Context:
          </label>
          <select 
            value={filters.context} 
            onChange={e => setFilters({ ...filters, context: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value=''>All Contexts</option>
            {contexts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px', color: 'white' }}>
            Filter by Project:
          </label>
          <select 
            value={filters.project} 
            onChange={e => setFilters({ ...filters, project: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value=''>All Projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px', color: 'white' }}>
            Sort by:
          </label>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value='due'>Due Date</option>
            <option value='priority'>Priority</option>
            <option value='none'>No Sorting</option>
          </select>
        </div>
      </div>

      {(taskTypeFilter === 'all' || taskTypeFilter === 'recurring') && recurring.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: 8 }}>
            Today's Recurring Tasks
          </h2>
          <TaskList 
            data={recurring} 
            onCheck={(id) => handleCheck(id, true)} 
            filters={filters} 
          />
        </div>
      )}

      {(taskTypeFilter === 'all' || taskTypeFilter === 'regular') && (
        <div>
          <h2 style={{ color: '#059669', borderBottom: '2px solid #059669', paddingBottom: 8 }}>
            Tasks {sortBy === 'due' ? '(Sorted by Due Date)' : 
                   sortBy === 'priority' ? '(Sorted by Priority)' : 
                   '(No Sorting)'}
          </h2>
          <TaskList 
            data={tasks} 
            onCheck={(id) => handleCheck(id, false)} 
            filters={filters} 
          />
        </div>
      )}
    </div>
  );
}

export default App;

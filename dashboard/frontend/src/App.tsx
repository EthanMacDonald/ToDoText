import { useEffect, useState } from 'react';
import TaskList from './components/TaskList';
import CreateTaskForm from './components/CreateTaskForm';
import EditTaskForm from './components/EditTaskForm';
import Statistics from './components/Statistics';
import type { Task, TaskGroup } from './types/task';

const API_URL = 'http://localhost:8000';

function App() {
  const [tasks, setTasks] = useState<TaskGroup[]>([]);
  const [recurring, setRecurring] = useState<TaskGroup[]>([]);
  const [filters, setFilters] = useState({ area: '', context: '', project: '' });
  const [sortBy, setSortBy] = useState('due'); // 'none', 'due', 'priority'
  const [taskTypeFilter, setTaskTypeFilter] = useState('all'); // 'all', 'regular', 'recurring'
  const [recurringFilter, setRecurringFilter] = useState('today'); // 'today', 'next7days', 'all'
  const [refreshTrigger, setRefreshTrigger] = useState(0); // For triggering statistics refresh
  const [editingTask, setEditingTask] = useState<Task | null>(null); // For editing tasks
  const [commitStatus, setCommitStatus] = useState<string>(''); // For git commit status
  const [isCommitExpanded, setIsCommitExpanded] = useState(false); // For git commit panel expansion

  useEffect(() => {
    const fetchTasks = async () => {
      const tasksUrl = sortBy === 'none' ? '/tasks?sort=none' : 
                      sortBy === 'priority' ? '/tasks?sort=priority' : '/tasks';
      
      const [tasksRes, recurringRes] = await Promise.all([
        fetch(`${API_URL}${tasksUrl}`),
        fetch(`${API_URL}/recurring?filter=${recurringFilter}`)
      ]);
      
      const tasksData = await tasksRes.json();
      const recurringData = await recurringRes.json();
      
      setTasks(tasksData);
      setRecurring(recurringData);
    };
    
    fetchTasks();
  }, [sortBy, recurringFilter]);

  const handleCheck = async (id: string, recurringTask: boolean = false) => {
    await fetch(`${API_URL}/${recurringTask ? 'recurring' : 'tasks'}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id })
    });
    // Refresh data and trigger statistics refresh
    refreshTasks();
    setRefreshTrigger(prev => prev + 1);
  };

  const refreshTasks = async () => {
    const tasksUrl = sortBy === 'none' ? '/tasks?sort=none' : 
                    sortBy === 'priority' ? '/tasks?sort=priority' : '/tasks';
    
    const [tasksRes, recurringRes] = await Promise.all([
      fetch(`${API_URL}${tasksUrl}`),
      fetch(`${API_URL}/recurring?filter=${recurringFilter}`)
    ]);
    
    const tasksData = await tasksRes.json();
    const recurringData = await recurringRes.json();
    
    setTasks(tasksData);
    setRecurring(recurringData);
  };

  const handleRecurringStatus = async (id: string, status: 'completed' | 'missed' | 'deferred') => {
    try {
      await fetch(`${API_URL}/recurring/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: id, status })
      });
      // Refresh recurring tasks after status update
      refreshTasks();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error updating recurring task status:', error);
    }
  };

  const handleTaskCreated = () => {
    // Refresh tasks after creating a new one and trigger statistics refresh
    refreshTasks();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskEdited = () => {
    // Refresh tasks after editing and trigger statistics refresh
    refreshTasks();
    setRefreshTrigger(prev => prev + 1);
    setEditingTask(null); // Close edit form
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  const handleCommitTasks = async () => {
    try {
      setCommitStatus('Committing...');
      const response = await fetch(`${API_URL}/git/commit-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCommitStatus('✓ Tasks committed successfully!');
      } else {
        setCommitStatus(`✗ Commit failed: ${result.message}`);
      }
      
      // Clear status after 3 seconds
      setTimeout(() => setCommitStatus(''), 3000);
    } catch (error) {
      setCommitStatus('✗ Error committing tasks');
      setTimeout(() => setCommitStatus(''), 3000);
    }
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
  const unique = (arr: (string | undefined)[]) => Array.from(new Set(arr.filter((item): item is string => Boolean(item))));
  const areas = unique(allTasks.map(t => t.area));
  const contexts = unique(allTasks.map(t => t.context));
  const projects = unique(allTasks.map(t => t.project));

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 24 }}>
      <h1>Task Dashboard</h1>
      
      {/* Create Task Form */}
      <CreateTaskForm 
        onTaskCreated={handleTaskCreated}
        areas={areas}
      />
      
      {/* Statistics Panel */}
      <Statistics 
        refreshTrigger={refreshTrigger} 
        onTasksChanged={refreshTasks}
      />
      
      {/* Git Commit Panel */}
      <div style={{ 
        backgroundColor: '#2d3748', 
        border: '1px solid #4a5568', 
        borderRadius: '8px', 
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setIsCommitExpanded(!isCommitExpanded)}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#1a202c',
            border: 'none',
            borderBottom: isCommitExpanded ? '1px solid #4a5568' : 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>📝 Git Commit</span>
          <span style={{ fontSize: '12px' }}>
            {isCommitExpanded ? '▲ Collapse' : '▼ Expand'}
          </span>
        </button>
        
        {isCommitExpanded && (
          <div style={{ padding: '16px' }}>
            {commitStatus && (
              <div style={{
                backgroundColor: commitStatus.includes('✓') ? '#c6f6d5' : '#fed7d7',
                color: commitStatus.includes('✓') ? '#22543d' : '#c53030',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {commitStatus}
              </div>
            )}
            
            <p style={{ 
              margin: '0 0 16px 0', 
              fontSize: '14px', 
              color: '#e2e8f0',
              lineHeight: '1.4'
            }}>
              Commits the following files to git with message "Checking in task lists and archives.":
            </p>
            
            <ul style={{ 
              margin: '0 0 16px 0', 
              paddingLeft: '20px',
              fontSize: '14px', 
              color: '#cbd5e0',
              lineHeight: '1.4'
            }}>
              <li>tasks.txt</li>
              <li>recurring_tasks.txt</li>
              <li>All files in archive_files/</li>
            </ul>
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCommitTasks}
                disabled={commitStatus === 'Committing...'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: commitStatus === 'Committing...' ? '#6c757d' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: commitStatus === 'Committing...' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: commitStatus === 'Committing...' ? 0.6 : 1
                }}
              >
                {commitStatus === 'Committing...' ? '📝 Committing...' : '📝 Commit Task Files'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Task Form */}
      {editingTask && (
        <EditTaskForm
          task={editingTask}
          areas={areas}
          onTaskEdited={handleTaskEdited}
          onCancel={handleCancelEdit}
        />
      )}
      
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: 8, margin: 0 }}>
              Recurring Tasks
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px', color: '#666' }}>
                Show Recurring:
              </label>
              <select 
                value={recurringFilter} 
                onChange={e => setRecurringFilter(e.target.value)}
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd', minWidth: 120 }}
              >
                <option value='today'>Today</option>
                <option value='next7days'>Next 7 Days</option>
                <option value='all'>All</option>
              </select>
            </div>
          </div>
          <TaskList 
            data={recurring} 
            onCheck={(id) => handleCheck(id, true)} 
            onEdit={handleEditTask}
            onRecurringStatus={handleRecurringStatus}
            filters={filters} 
            isRecurring={true}
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
            onEdit={handleEditTask}
            filters={filters} 
          />
        </div>
      )}
    </div>
  );
}

export default App;

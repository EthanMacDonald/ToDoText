import { useEffect, useState } from 'react';
import TaskList from './components/TaskList';
import CreateTaskForm from './components/CreateTaskForm';
import Statistics from './components/Statistics';
import TimeSeries from './components/TimeSeries';
import Lists from './components/Lists';
import Goals from './components/Goals';
import type { Task, TaskGroup } from './types/task';
import { API_URL } from './config/api';
import { useDashboardState } from './hooks/useDashboardState';
import StateStorage from './utils/stateStorage';

function App() {
  const [tasks, setTasks] = useState<TaskGroup[]>([]);
  const [recurring, setRecurring] = useState<TaskGroup[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // For triggering statistics refresh
  const [commitStatus, setCommitStatus] = useState<string>(''); // For git commit status
  const [calendarStatus, setCalendarStatus] = useState<string>(''); // For calendar push status
  const [statisticsStatus, setStatisticsStatus] = useState<string>(''); // For statistics save status

  // Use persistent dashboard state
  const { state: dashboardState, updateState, updateFilters, updatePanelStates, updateFormStates, updateListsState, updateGoalsState, isLoaded } = useDashboardState();
  const { filters, sortBy, taskTypeFilter, recurringFilter, panelStates, formStates, listsState, goalsState } = dashboardState;
  const { isCommitExpanded, isStatisticsExpanded, isTimeSeriesExpanded, isListsExpanded, isGoalsExpanded } = panelStates;

  useEffect(() => {
    // Only fetch tasks once the dashboard state is loaded
    if (!isLoaded) return;

    const fetchTasks = async () => {
      try {
        const tasksUrl = sortBy === 'none' ? '/tasks?sort=none' : 
                        sortBy === 'priority' ? '/tasks?sort=priority' : '/tasks';
        
        const [tasksRes, recurringRes] = await Promise.all([
          fetch(`${API_URL}${tasksUrl}`),
          fetch(`${API_URL}/recurring?filter=${recurringFilter}`)
        ]);
        
        if (!tasksRes.ok || !recurringRes.ok) {
          console.error('API request failed:', tasksRes.status, recurringRes.status);
          return;
        }
        
        const tasksData = await tasksRes.json();
        const recurringData = await recurringRes.json();
        
        // Handle both array format and object with data property
        setTasks(Array.isArray(tasksData) ? tasksData : (tasksData.data || []));
        setRecurring(Array.isArray(recurringData) ? recurringData : (recurringData.data || []));
      } catch (error) {
        console.error('Error fetching tasks:', error);
        // Set empty arrays to prevent app crash
        setTasks([]);
        setRecurring([]);
      }
    };
    
    fetchTasks();
  }, [sortBy, recurringFilter, isLoaded]);

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
    try {
      const tasksUrl = sortBy === 'none' ? '/tasks?sort=none' : 
                      sortBy === 'priority' ? '/tasks?sort=priority' : '/tasks';
      
      const [tasksRes, recurringRes] = await Promise.all([
        fetch(`${API_URL}${tasksUrl}`),
        fetch(`${API_URL}/recurring?filter=${recurringFilter}`)
      ]);
      
      if (!tasksRes.ok || !recurringRes.ok) {
        console.error('API request failed during refresh:', tasksRes.status, recurringRes.status);
        return;
      }
      
      const tasksData = await tasksRes.json();
      const recurringData = await recurringRes.json();
      
      // Handle both array format and object with data property
      setTasks(Array.isArray(tasksData) ? tasksData : (tasksData.data || []));
      setRecurring(Array.isArray(recurringData) ? recurringData : (recurringData.data || []));
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
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
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Refresh tasks after deletion and trigger statistics refresh
        refreshTasks();
        setRefreshTrigger(prev => prev + 1);
      } else {
        console.error('Error deleting task:', await response.text());
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddSubtask = async (parentId: string, description: string, notes: string[], additionalData?: any) => {
    try {
      const payload: any = { 
        description,
        notes 
      };
      
      // Add additional fields if provided
      if (additionalData) {
        // Area is required, so ensure it's always present
        payload.area = additionalData.area || 'Work'; // fallback to 'Work' if no area provided
        if (additionalData.priority) payload.priority = additionalData.priority;
        if (additionalData.due_date) payload.due_date = additionalData.due_date;
        if (additionalData.done_date) payload.done_date = additionalData.done_date;
        if (additionalData.followup_date) payload.followup_date = additionalData.followup_date;
        if (additionalData.context) payload.context = additionalData.context;
        if (additionalData.project) payload.project = additionalData.project;
        if (additionalData.onhold) payload.onhold = additionalData.onhold;
      } else {
        // If no additional data is provided, use a default area
        payload.area = 'Work';
      }
      
      console.log('Creating subtask with payload:', payload); // Debug log
      
      const response = await fetch(`${API_URL}/tasks/${parentId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log('Subtask created successfully');
        // Refresh tasks after adding subtask and trigger statistics refresh
        refreshTasks();
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errorText = await response.text();
        console.error('Error adding subtask:', errorText);
        alert(`Failed to create subtask: ${errorText}`);
      }
    } catch (error) {
      console.error('Error adding subtask:', error);
      alert(`Failed to create subtask: ${error}`);
    }
  };

  const handleEditTask = (task: Task) => {
    // This function is kept for compatibility but inline editing handles it now
    console.log('Edit task requested for:', task.id);
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

  const handlePushToCalendar = async () => {
    try {
      setCalendarStatus('Pushing to calendar...');
      const response = await fetch(`${API_URL}/calendar/push-due-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCalendarStatus('✓ Due dates pushed to calendar successfully!');
      } else {
        setCalendarStatus(`✗ Calendar push failed: ${result.message}`);
      }
      
      // Clear status after 3 seconds
      setTimeout(() => setCalendarStatus(''), 3000);
    } catch (error) {
      setCalendarStatus('✗ Error pushing to calendar');
      setTimeout(() => setCalendarStatus(''), 3000);
    }
  };

  const handleSaveStatistics = async () => {
    try {
      setStatisticsStatus('Saving statistics...');
      const response = await fetch(`${API_URL}/tasks/save-statistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatisticsStatus('✓ Statistics saved to log successfully!');
      } else {
        setStatisticsStatus(`✗ Statistics save failed: ${result.message}`);
      }
      
      // Clear status after 3 seconds
      setTimeout(() => setStatisticsStatus(''), 3000);
    } catch (error) {
      setStatisticsStatus('✗ Error saving statistics');
      setTimeout(() => setStatisticsStatus(''), 3000);
    }
  };

  // Extract unique values for filters from both task groups and recurring tasks
  const getAllTasks = (): Task[] => {
    const allTasks: Task[] = [];
    
    // Extract tasks from grouped structure
    const extractFromGroups = (groups: TaskGroup[]) => {
      if (!groups || !Array.isArray(groups)) {
        return;
      }
      groups.forEach(group => {
        const extractTasksRecursively = (taskList: Task[]) => {
          if (!taskList || !Array.isArray(taskList)) {
            return;
          }
          taskList.forEach(task => {
            allTasks.push(task);
            if (task.subtasks) {
              extractTasksRecursively(task.subtasks);
            }
          });
        };
        if (group && group.tasks) {
          extractTasksRecursively(group.tasks);
        }
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

  // Show loading spinner while state is being loaded
  if (!isLoaded) {
    return (
      <div style={{ 
        maxWidth: 800, 
        margin: 'auto', 
        padding: 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#666' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 24 }}>
      <h1>Task Dashboard</h1>
      
      {/* Create Task Form */}
      <CreateTaskForm 
        onTaskCreated={handleTaskCreated}
        areas={areas}
        isExpanded={formStates.isCreateTaskExpanded}
        onExpandedChange={(expanded: boolean) => updateFormStates({ isCreateTaskExpanded: expanded })}
      />
      
      {/* Statistics Panel */}
      <Statistics 
        refreshTrigger={refreshTrigger} 
        onTasksChanged={refreshTasks}
        isExpanded={isStatisticsExpanded}
        onToggleExpanded={(expanded: boolean) => updatePanelStates({ isStatisticsExpanded: expanded })}
      />
      
      {/* Time Series Analysis */}
      <TimeSeries 
        refreshTrigger={refreshTrigger}
        isExpanded={isTimeSeriesExpanded}
        onToggleExpanded={(expanded: boolean) => updatePanelStates({ isTimeSeriesExpanded: expanded })}
      />
      
      {/* Lists */}
      <Lists 
        isExpanded={isListsExpanded}
        onToggleExpanded={(expanded: boolean) => updatePanelStates({ isListsExpanded: expanded })}
        selectedList={listsState.selectedList}
        onSelectedListChange={(listName: string) => updateListsState({ selectedList: listName })}
        isStateLoaded={isLoaded}
      />
      
      {/* Goals */}
      <Goals 
        isExpanded={isGoalsExpanded}
        onToggleExpanded={(expanded: boolean) => updatePanelStates({ isGoalsExpanded: expanded })}
        selectedGoals={goalsState.selectedGoals}
        onSelectedGoalsChange={(goalsName: string) => updateGoalsState({ selectedGoals: goalsName })}
        isStateLoaded={isLoaded}
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
          onClick={() => updatePanelStates({ isCommitExpanded: !isCommitExpanded })}
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
          <span>📝 Commit</span>
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
            
            {calendarStatus && (
              <div style={{
                backgroundColor: calendarStatus.includes('✓') ? '#c6f6d5' : '#fed7d7',
                color: calendarStatus.includes('✓') ? '#22543d' : '#c53030',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {calendarStatus}
              </div>
            )}
            
            {statisticsStatus && (
              <div style={{
                backgroundColor: statisticsStatus.includes('✓') ? '#c6f6d5' : '#fed7d7',
                color: statisticsStatus.includes('✓') ? '#22543d' : '#c53030',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {statisticsStatus}
              </div>
            )}
            
            {/* Git Commit Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '16px', 
                color: '#f7fafc',
                fontWeight: 'bold'
              }}>
                📝 Git Commit
              </h4>
              
              <p style={{ 
                margin: '0 0 12px 0', 
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
            
            {/* Calendar Push Section */}
            <div>
              <h4 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '16px', 
                color: '#f7fafc',
                fontWeight: 'bold'
              }}>
                📅 Google Calendar
              </h4>
              
              <p style={{ 
                margin: '0 0 16px 0', 
                fontSize: '14px', 
                color: '#e2e8f0',
                lineHeight: '1.4'
              }}>
                Push tasks with due dates to your Google Calendar for better scheduling and reminders.
              </p>
              
              <button
                onClick={handlePushToCalendar}
                disabled={calendarStatus === 'Pushing to calendar...'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: calendarStatus === 'Pushing to calendar...' ? '#6c757d' : '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: calendarStatus === 'Pushing to calendar...' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: calendarStatus === 'Pushing to calendar...' ? 0.6 : 1
                }}
              >
                {calendarStatus === 'Pushing to calendar...' ? '📅 Pushing...' : '📅 Push Due Dates to Calendar'}
              </button>
            </div>
            
            {/* Statistics Section */}
            <div>
              <h4 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '16px', 
                color: '#f7fafc',
                fontWeight: 'bold'
              }}>
                📊 Statistics Log
              </h4>
              
              <p style={{ 
                margin: '0 0 16px 0', 
                fontSize: '14px', 
                color: '#e2e8f0',
                lineHeight: '1.4'
              }}>
                Save current task statistics to historical log for time-series analysis.
              </p>
              
              <button
                onClick={handleSaveStatistics}
                disabled={statisticsStatus === 'Saving statistics...'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: statisticsStatus === 'Saving statistics...' ? '#6c757d' : '#9333ea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: statisticsStatus === 'Saving statistics...' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: statisticsStatus === 'Saving statistics...' ? 0.6 : 1
                }}
              >
                {statisticsStatus === 'Saving statistics...' ? '📊 Saving...' : '📊 Save Statistics to Log'}
              </button>
            </div>
          </div>
        )}
      </div>
      

      
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
            onChange={e => updateState({ taskTypeFilter: e.target.value })}
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
            onChange={e => updateFilters({ area: e.target.value })}
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
            onChange={e => updateFilters({ context: e.target.value })}
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
            onChange={e => updateFilters({ project: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value=''>All Projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
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
                onChange={e => updateState({ recurringFilter: e.target.value })}
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
            onDelete={handleDeleteTask}
            onAddSubtask={handleAddSubtask}
            onRecurringStatus={handleRecurringStatus}
            filters={filters} 
            isRecurring={true}
            areas={areas}
            onTaskEdited={handleTaskEdited}
            editingTaskId={formStates.editingTaskId}
            onEditingTaskIdChange={(id: string | null) => updateFormStates({ editingTaskId: id })}
            addingSubtaskToId={formStates.addingSubtaskToId}
            onAddingSubtaskToIdChange={(id: string | null) => updateFormStates({ addingSubtaskToId: id })}
          />
        </div>
      )}

      {(taskTypeFilter === 'all' || taskTypeFilter === 'regular') && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ color: '#059669', borderBottom: '2px solid #059669', paddingBottom: 8, margin: 0 }}>
              Tasks
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: 4, fontWeight: 'bold', fontSize: '14px', color: '#666' }}>
                Sort by:
              </label>
              <select 
                value={sortBy} 
                onChange={e => updateState({ sortBy: e.target.value })}
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd', minWidth: 120 }}
              >
                <option value='due'>Due Date</option>
                <option value='priority'>Priority</option>
                <option value='none'>No Sorting</option>
              </select>
            </div>
          </div>
          <TaskList 
            data={tasks} 
            onCheck={(id) => handleCheck(id, false)} 
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onAddSubtask={handleAddSubtask}
            filters={filters}
            areas={areas}
            onTaskEdited={handleTaskEdited}
            editingTaskId={formStates.editingTaskId}
            onEditingTaskIdChange={(id: string | null) => updateFormStates({ editingTaskId: id })}
            addingSubtaskToId={formStates.addingSubtaskToId}
            onAddingSubtaskToIdChange={(id: string | null) => updateFormStates({ addingSubtaskToId: id })}
          />
        </div>
      )}

      {/* State Management Panel - Development/Debug */}
      {false && (
        <div style={{ 
          backgroundColor: '#1a1a2e', 
          border: '1px solid #4a5568', 
          borderRadius: '8px', 
          marginBottom: '24px',
          padding: '16px'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px', 
            color: '#f7fafc',
            fontWeight: 'bold'
          }}>
            🔧 State Management (Development)
          </h4>
          <p style={{ 
            margin: '0 0 12px 0', 
            fontSize: '12px', 
            color: '#e2e8f0'
          }}>
            Dashboard settings are automatically saved. Use the button below to reset to defaults.
          </p>
          <button
            onClick={async () => {
              try {
                await StateStorage.clearState();
                window.location.reload();
              } catch (error) {
                console.error('Failed to clear state:', error);
              }
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            🗑️ Reset Dashboard State
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';

type StatisticsData = {
  total: number;
  completed: number;
  incomplete: number;
  completion_pct: number;
  with_due_date: number;
  overdue: number;
  due_today: number;
  due_this_week: number;
  [key: string]: number; // For dynamic priority_, project_, and context_ stats
};

type Props = {
  refreshTrigger?: number; // Optional prop to trigger refresh
  onTasksChanged?: () => void; // Callback when tasks are modified (e.g., archived)
  isExpanded?: boolean; // Control expand/collapse state externally
  onToggleExpanded?: (expanded: boolean) => void; // Callback when expand state changes
};

const Statistics: React.FC<Props> = ({ refreshTrigger, onTasksChanged, isExpanded: externalIsExpanded, onToggleExpanded }) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    if (onToggleExpanded) {
      onToggleExpanded(newExpanded);
    } else {
      setInternalIsExpanded(newExpanded);
    }
  };
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);

  const fetchStatistics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/statistics`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.status}`);
      }
      
      const data = await response.json();
      setStatistics(data);
      
    } catch (error) {
      console.error('Error fetching statistics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch statistics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const archiveCompletedTasks = async () => {
    setIsArchiving(true);
    setError(null);
    setArchiveMessage(null);
    
    try {
      const response = await fetch(`${API_URL}/tasks/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to archive tasks: ${response.status}`);
      }
      
      const result = await response.json();
      setArchiveMessage(result.message);
      
      // Refresh statistics after archiving
      await fetchStatistics();
      
      // Notify parent component that tasks have changed
      if (onTasksChanged) {
        onTasksChanged();
      }
      
    } catch (error) {
      console.error('Error archiving tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive tasks';
      setError(errorMessage);
    } finally {
      setIsArchiving(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchStatistics();
    }
  }, [isExpanded, refreshTrigger]);

  const formatValue = (value: number): string => {
    if (value % 1 === 0) {
      return value.toString();
    }
    return value.toFixed(2);
  };

  const renderStatisticItem = (label: string, value: number, isPercentage: boolean = false) => (
    <div key={label} style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid #4a5568'
    }}>
      <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{label}</span>
      <span style={{ 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: '14px' 
      }}>
        {formatValue(value)}{isPercentage ? '%' : ''}
      </span>
    </div>
  );

  const renderStatistics = () => {
    if (!statistics) return null;

    const basicStats = [
      { label: 'Total Tasks', value: statistics.total },
      { label: 'Completed', value: statistics.completed },
      { label: 'Incomplete', value: statistics.incomplete },
      { label: 'Completion Rate', value: statistics.completion_pct, isPercentage: true },
    ];

    const dueDateStats = [
      { label: 'Tasks with Due Dates', value: statistics.with_due_date },
      { label: 'Overdue Tasks', value: statistics.overdue },
      { label: 'Due Today', value: statistics.due_today },
      { label: 'Due This Week', value: statistics.due_this_week },
    ];

    // Extract priority, project, and context stats
    const priorityStats = Object.entries(statistics)
      .filter(([key]) => key.startsWith('priority_'))
      .map(([key, value]) => ({ 
        label: `Priority ${key.replace('priority_', '')}`, 
        value: value as number 
      }));

    const projectStats = Object.entries(statistics)
      .filter(([key]) => key.startsWith('project_'))
      .map(([key, value]) => ({ 
        label: `Project ${key.replace('project_', '')}`, 
        value: value as number 
      }));

    const contextStats = Object.entries(statistics)
      .filter(([key]) => key.startsWith('context_'))
      .map(([key, value]) => ({ 
        label: `Context ${key.replace('context_', '')}`, 
        value: value as number 
      }));

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px' 
      }}>
        {/* Basic Statistics */}
        <div style={{
          backgroundColor: '#1a202c',
          border: '1px solid #4a5568',
          borderRadius: '6px',
          padding: '12px'
        }}>
          <h4 style={{ 
            color: '#63b3ed', 
            margin: '0 0 12px 0', 
            fontSize: '16px',
            borderBottom: '1px solid #4a5568',
            paddingBottom: '8px'
          }}>
            Task Overview
          </h4>
          {basicStats.map(stat => 
            renderStatisticItem(stat.label, stat.value, stat.isPercentage)
          )}
        </div>

        {/* Due Date Statistics */}
        <div style={{
          backgroundColor: '#1a202c',
          border: '1px solid #4a5568',
          borderRadius: '6px',
          padding: '12px'
        }}>
          <h4 style={{ 
            color: '#68d391', 
            margin: '0 0 12px 0', 
            fontSize: '16px',
            borderBottom: '1px solid #4a5568',
            paddingBottom: '8px'
          }}>
            Due Date Summary
          </h4>
          {dueDateStats.map(stat => 
            renderStatisticItem(stat.label, stat.value)
          )}
        </div>

        {/* Priority Statistics */}
        {priorityStats.length > 0 && (
          <div style={{
            backgroundColor: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <h4 style={{ 
              color: '#f6ad55', 
              margin: '0 0 12px 0', 
              fontSize: '16px',
              borderBottom: '1px solid #4a5568',
              paddingBottom: '8px'
            }}>
              By Priority
            </h4>
            {priorityStats.map(stat => 
              renderStatisticItem(stat.label, stat.value)
            )}
          </div>
        )}

        {/* Project Statistics */}
        {projectStats.length > 0 && (
          <div style={{
            backgroundColor: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <h4 style={{ 
              color: '#fc8181', 
              margin: '0 0 12px 0', 
              fontSize: '16px',
              borderBottom: '1px solid #4a5568',
              paddingBottom: '8px'
            }}>
              By Project
            </h4>
            {projectStats.map(stat => 
              renderStatisticItem(stat.label, stat.value)
            )}
          </div>
        )}

        {/* Context Statistics */}
        {contextStats.length > 0 && (
          <div style={{
            backgroundColor: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <h4 style={{ 
              color: '#b794f6', 
              margin: '0 0 12px 0', 
              fontSize: '16px',
              borderBottom: '1px solid #4a5568',
              paddingBottom: '8px'
            }}>
              By Context
            </h4>
            {contextStats.map(stat => 
              renderStatisticItem(stat.label, stat.value)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      backgroundColor: '#2d3748', 
      border: '1px solid #4a5568', 
      borderRadius: '8px', 
      marginBottom: '24px',
      overflow: 'hidden'
    }}>
      <button
        onClick={toggleExpanded}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#1a202c',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #4a5568' : 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>📊 Task Statistics</span>
        <span style={{ fontSize: '12px' }}>
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>
      
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fed7d7',
              color: '#c53030',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          {archiveMessage && (
            <div style={{
              backgroundColor: '#c6f6d5',
              color: '#22543d',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {archiveMessage}
            </div>
          )}
          
          {isLoading && (
            <div style={{
              color: 'white',
              textAlign: 'center',
              padding: '20px',
              fontSize: '14px'
            }}>
              Loading statistics...
            </div>
          )}
          
          {!isLoading && !error && statistics && renderStatistics()}
          
          {!isLoading && !error && statistics && (
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid #4a5568',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={fetchStatistics}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                🔄 Refresh Statistics
              </button>
              
              <button
                onClick={archiveCompletedTasks}
                disabled={isArchiving || !statistics?.completed}
                style={{
                  padding: '8px 16px',
                  backgroundColor: !statistics?.completed ? '#6c757d' : '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isArchiving || !statistics?.completed ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isArchiving || !statistics?.completed ? 0.6 : 1
                }}
                title={!statistics?.completed ? 'No completed tasks to archive' : 'Archive all completed tasks'}
              >
                {isArchiving ? '📦 Archiving...' : '📦 Archive Completed'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Statistics;

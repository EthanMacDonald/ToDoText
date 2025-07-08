import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

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

type TimeSeriesEntry = {
  date: string;
  total: number;
  completed: number;
  incomplete: number;
  completion_pct: number;
  with_due_date: number;
  overdue: number;
  due_today: number;
  due_this_week: number;
  compliance?: {
    date: string;
    completed: number;
    missed: number;
    deferred: number;
    total: number;
    compliance_pct: number;
  } | null;
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
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTimeSeries, setIsLoadingTimeSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSeriesError, setTimeSeriesError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [showTimeSeries, setShowTimeSeries] = useState(false);

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

  const fetchTimeSeriesData = async () => {
    setIsLoadingTimeSeries(true);
    setTimeSeriesError(null);
    
    try {
      const response = await fetch(`${API_URL}/statistics/time-series`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch time series data: ${response.status}`);
      }
      
      const data = await response.json();
      setTimeSeriesData(data);
      
    } catch (error) {
      console.error('Error fetching time series data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch time series data';
      setTimeSeriesError(errorMessage);
    } finally {
      setIsLoadingTimeSeries(false);
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
      fetchTimeSeriesData();
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

  const renderTimeSeriesChart = () => {
    if (timeSeriesData.length === 0) return null;

    const chartData = {
      labels: timeSeriesData.map(entry => entry.date),
      datasets: [
        {
          label: 'Total Tasks',
          data: timeSeriesData.map(entry => entry.total),
          borderColor: '#63b3ed',
          backgroundColor: 'rgba(99, 179, 237, 0.2)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Completed Tasks',
          data: timeSeriesData.map(entry => entry.completed),
          borderColor: '#68d391',
          backgroundColor: 'rgba(104, 211, 145, 0.2)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Incomplete Tasks',
          data: timeSeriesData.map(entry => entry.incomplete),
          borderColor: '#f6ad55',
          backgroundColor: 'rgba(246, 173, 85, 0.2)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Overdue Tasks',
          data: timeSeriesData.map(entry => entry.overdue),
          borderColor: '#fc8181',
          backgroundColor: 'rgba(252, 129, 129, 0.2)',
          borderWidth: 2,
          fill: true,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#e2e8f0',
          },
        },
        tooltip: {
          bodyColor: '#2d3748',
          backgroundColor: '#edf2f7',
          borderColor: '#4a5568',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: 'day' as const,
            tooltipFormat: 'MMM D, YYYY',
            displayFormats: {
              day: 'MMM D',
            },
          },
          ticks: {
            color: '#e2e8f0',
          },
          grid: {
            color: '#4a5568',
          },
        },
        y: {
          ticks: {
            color: '#e2e8f0',
          },
          grid: {
            color: '#4a5568',
          },
        },
      },
    };

    return (
      <div style={{ 
        backgroundColor: '#1a202c', 
        borderRadius: '6px', 
        padding: '16px',
        border: '1px solid #4a5568',
        marginTop: '16px'
      }}>
        <h4 style={{ 
          color: '#63b3ed', 
          margin: '0 0 12px 0', 
          fontSize: '16px',
          borderBottom: '1px solid #4a5568',
          paddingBottom: '8px'
        }}>
          Task Trends Over Time
        </h4>
        <Line data={chartData} options={chartOptions} />
      </div>
    );
  };

  const createCompletionTrendChart = () => {
    if (timeSeriesData.length === 0) return null;

    const chartData = {
      labels: timeSeriesData.map(entry => entry.date),
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: timeSeriesData.map(entry => entry.completion_pct),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Total Tasks',
          data: timeSeriesData.map(entry => entry.total),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
          yAxisID: 'y1',
        }
      ]
    };

    const options = {
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Task Completion Trends Over Time',
          color: '#e2e8f0'
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          },
          title: {
            display: true,
            text: 'Completion Rate (%)',
            color: '#e2e8f0'
          }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Total Tasks',
            color: '#e2e8f0'
          }
        },
      },
    };

    return <Line data={chartData} options={options} />;
  };

  const createDueDateTrendChart = () => {
    if (timeSeriesData.length === 0) return null;

    const chartData = {
      labels: timeSeriesData.map(entry => entry.date),
      datasets: [
        {
          label: 'Overdue Tasks',
          data: timeSeriesData.map(entry => entry.overdue),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Due Today',
          data: timeSeriesData.map(entry => entry.due_today),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Due This Week',
          data: timeSeriesData.map(entry => entry.due_this_week),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.1,
          fill: true,
        }
      ]
    };

    const options = {
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Due Date Trends Over Time',
          color: '#e2e8f0'
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          }
        },
        y: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          },
          title: {
            display: true,
            text: 'Number of Tasks',
            color: '#e2e8f0'
          }
        }
      },
    };

    return <Line data={chartData} options={options} />;
  };

  const createComplianceChart = () => {
    const complianceData = timeSeriesData.filter(entry => entry.compliance);
    if (complianceData.length === 0) return null;

    const chartData = {
      labels: complianceData.map(entry => entry.date),
      datasets: [
        {
          label: 'Compliance Rate (%)',
          data: complianceData.map(entry => entry.compliance?.compliance_pct || 0),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.1,
          fill: true,
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Recurring Task Compliance Over Time',
          color: '#e2e8f0'
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          },
          title: {
            display: true,
            text: 'Compliance Rate (%)',
            color: '#e2e8f0'
          }
        }
      },
    };

    return <Line data={chartData} options={options} />;
  };

  const renderTimeSeriesAnalysis = () => {
    if (!showTimeSeries) return null;

    return (
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ 
          color: '#63b3ed', 
          margin: '0 0 16px 0', 
          fontSize: '18px',
          borderBottom: '2px solid #4a5568',
          paddingBottom: '8px'
        }}>
          📈 Time Series Analysis
        </h3>

        {isLoadingTimeSeries && (
          <div style={{
            backgroundColor: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '6px',
            color: 'white',
            textAlign: 'center',
            padding: '20px',
            fontSize: '14px'
          }}>
            Loading time series data...
          </div>
        )}

        {timeSeriesError && (
          <div style={{
            backgroundColor: '#2d1b1b',
            border: '1px solid #e53e3e',
            borderRadius: '6px',
            color: '#feb2b2',
            padding: '16px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            Error loading time series data: {timeSeriesError}
          </div>
        )}

        {!isLoadingTimeSeries && !timeSeriesError && timeSeriesData.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '24px' 
          }}>
            {/* Completion Trends Chart */}
            <div style={{
              backgroundColor: '#1a202c',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '16px'
            }}>
              {createCompletionTrendChart()}
            </div>

            {/* Due Date Trends Chart */}
            <div style={{
              backgroundColor: '#1a202c',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '16px'
            }}>
              {createDueDateTrendChart()}
            </div>

            {/* Compliance Chart */}
            {timeSeriesData.some(entry => entry.compliance) && (
              <div style={{
                backgroundColor: '#1a202c',
                border: '1px solid #4a5568',
                borderRadius: '6px',
                padding: '16px'
              }}>
                {createComplianceChart()}
              </div>
            )}

            {/* Data Summary */}
            <div style={{
              backgroundColor: '#1a202c',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '16px'
            }}>
              <h4 style={{ 
                color: '#63b3ed', 
                margin: '0 0 12px 0', 
                fontSize: '16px',
                borderBottom: '1px solid #4a5568',
                paddingBottom: '8px'
              }}>
                📊 Data Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Date Range:</strong> {timeSeriesData[0]?.date} to {timeSeriesData[timeSeriesData.length - 1]?.date}
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Total Data Points:</strong> {timeSeriesData.length}
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Compliance Data Points:</strong> {timeSeriesData.filter(entry => entry.compliance).length}
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Average Completion Rate:</strong> {(timeSeriesData.reduce((sum, entry) => sum + entry.completion_pct, 0) / timeSeriesData.length).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoadingTimeSeries && !timeSeriesError && timeSeriesData.length === 0 && (
          <div style={{
            backgroundColor: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '6px',
            color: '#a0aec0',
            textAlign: 'center',
            padding: '20px',
            fontSize: '14px'
          }}>
            No time series data available. Historical task data will appear here once statistics have been collected over time.
          </div>
        )}

        <div style={{ 
          marginTop: '16px', 
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={fetchTimeSeriesData}
            disabled={isLoadingTimeSeries}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoadingTimeSeries ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isLoadingTimeSeries ? 0.6 : 1
            }}
          >
            {isLoadingTimeSeries ? '🔄 Loading...' : '🔄 Refresh Time Series'}
          </button>
        </div>
      </div>
    );
  };

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

  const renderTimeSeriesChart = () => {
    if (timeSeriesData.length === 0) return null;

    const chartData = {
      labels: timeSeriesData.map(entry => entry.date),
      datasets: [
        {
          label: 'Total Tasks',
          data: timeSeriesData.map(entry => entry.total),
          borderColor: '#63b3ed',
          backgroundColor: 'rgba(99, 179, 237, 0.2)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Completed Tasks',
          data: timeSeriesData.map(entry => entry.completed),
          borderColor: '#68d391',
          backgroundColor: 'rgba(104, 211, 145, 0.2)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Incomplete Tasks',
          data: timeSeriesData.map(entry => entry.incomplete),
          borderColor: '#f6ad55',
          backgroundColor: 'rgba(246, 173, 85, 0.2)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Overdue Tasks',
          data: timeSeriesData.map(entry => entry.overdue),
          borderColor: '#fc8181',
          backgroundColor: 'rgba(252, 129, 129, 0.2)',
          borderWidth: 2,
          fill: true,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#e2e8f0',
          },
        },
        tooltip: {
          bodyColor: '#2d3748',
          backgroundColor: '#edf2f7',
          borderColor: '#4a5568',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: 'day' as const,
            tooltipFormat: 'MMM D, YYYY',
            displayFormats: {
              day: 'MMM D',
            },
          },
          ticks: {
            color: '#e2e8f0',
          },
          grid: {
            color: '#4a5568',
          },
        },
        y: {
          ticks: {
            color: '#e2e8f0',
          },
          grid: {
            color: '#4a5568',
          },
        },
      },
    };

    return (
      <div style={{ 
        backgroundColor: '#1a202c', 
        borderRadius: '6px', 
        padding: '16px',
        border: '1px solid #4a5568',
        marginTop: '16px'
      }}>
        <h4 style={{ 
          color: '#63b3ed', 
          margin: '0 0 12px 0', 
          fontSize: '16px',
          borderBottom: '1px solid #4a5568',
          paddingBottom: '8px'
        }}>
          Task Trends Over Time
        </h4>
        <Line data={chartData} options={chartOptions} />
      </div>
    );
  };

  const createCompletionTrendChart = () => {
    if (timeSeriesData.length === 0) return null;

    const chartData = {
      labels: timeSeriesData.map(entry => entry.date),
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: timeSeriesData.map(entry => entry.completion_pct),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Total Tasks',
          data: timeSeriesData.map(entry => entry.total),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
          yAxisID: 'y1',
        }
      ]
    };

    const options = {
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Task Completion Trends Over Time',
          color: '#e2e8f0'
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          },
          title: {
            display: true,
            text: 'Completion Rate (%)',
            color: '#e2e8f0'
          }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Total Tasks',
            color: '#e2e8f0'
          }
        },
      },
    };

    return <Line data={chartData} options={options} />;
  };

  const createDueDateTrendChart = () => {
    if (timeSeriesData.length === 0) return null;

    const chartData = {
      labels: timeSeriesData.map(entry => entry.date),
      datasets: [
        {
          label: 'Overdue Tasks',
          data: timeSeriesData.map(entry => entry.overdue),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Due Today',
          data: timeSeriesData.map(entry => entry.due_today),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Due This Week',
          data: timeSeriesData.map(entry => entry.due_this_week),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.1,
          fill: true,
        }
      ]
    };

    const options = {
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Due Date Trends Over Time',
          color: '#e2e8f0'
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          }
        },
        y: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          },
          title: {
            display: true,
            text: 'Number of Tasks',
            color: '#e2e8f0'
          }
        }
      },
    };

    return <Line data={chartData} options={options} />;
  };

  const createComplianceChart = () => {
    const complianceData = timeSeriesData.filter(entry => entry.compliance);
    if (complianceData.length === 0) return null;

    const chartData = {
      labels: complianceData.map(entry => entry.date),
      datasets: [
        {
          label: 'Compliance Rate (%)',
          data: complianceData.map(entry => entry.compliance?.compliance_pct || 0),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.1,
          fill: true,
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Recurring Task Compliance Over Time',
          color: '#e2e8f0'
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: '#a0aec0'
          },
          grid: {
            color: 'rgba(160, 174, 192, 0.1)'
          },
          title: {
            display: true,
            text: 'Compliance Rate (%)',
            color: '#e2e8f0'
          }
        }
      },
    };

    return <Line data={chartData} options={options} />;
  };

  const renderTimeSeriesAnalysis = () => {
    if (!showTimeSeries) return null;

    return (
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ 
          color: '#63b3ed', 
          margin: '0 0 16px 0', 
          fontSize: '18px',
          borderBottom: '2px solid #4a5568',
          paddingBottom: '8px'
        }}>
          📈 Time Series Analysis
        </h3>

        {isLoadingTimeSeries && (
          <div style={{
            backgroundColor: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '6px',
            color: 'white',
            textAlign: 'center',
            padding: '20px',
            fontSize: '14px'
          }}>
            Loading time series data...
          </div>
        )}

        {timeSeriesError && (
          <div style={{
            backgroundColor: '#2d1b1b',
            border: '1px solid #e53e3e',
            borderRadius: '6px',
            color: '#feb2b2',
            padding: '16px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            Error loading time series data: {timeSeriesError}
          </div>
        )}

        {!isLoadingTimeSeries && !timeSeriesError && timeSeriesData.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '24px' 
          }}>
            {/* Completion Trends Chart */}
            <div style={{
              backgroundColor: '#1a202c',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '16px'
            }}>
              {createCompletionTrendChart()}
            </div>

            {/* Due Date Trends Chart */}
            <div style={{
              backgroundColor: '#1a202c',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '16px'
            }}>
              {createDueDateTrendChart()}
            </div>

            {/* Compliance Chart */}
            {timeSeriesData.some(entry => entry.compliance) && (
              <div style={{
                backgroundColor: '#1a202c',
                border: '1px solid #4a5568',
                borderRadius: '6px',
                padding: '16px'
              }}>
                {createComplianceChart()}
              </div>
            )}

            {/* Data Summary */}
            <div style={{
              backgroundColor: '#1a202c',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '16px'
            }}>
              <h4 style={{ 
                color: '#63b3ed', 
                margin: '0 0 12px 0', 
                fontSize: '16px',
                borderBottom: '1px solid #4a5568',
                paddingBottom: '8px'
              }}>
                📊 Data Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Date Range:</strong> {timeSeriesData[0]?.date} to {timeSeriesData[timeSeriesData.length - 1]?.date}
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Total Data Points:</strong> {timeSeriesData.length}
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Compliance Data Points:</strong> {timeSeriesData.filter(entry => entry.compliance).length}
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  <strong>Average Completion Rate:</strong> {(timeSeriesData.reduce((sum, entry) => sum + entry.completion_pct, 0) / timeSeriesData.length).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoadingTimeSeries && !timeSeriesError && timeSeriesData.length === 0 && (
          <div style={{
            backgroundColor: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '6px',
            color: '#a0aec0',
            textAlign: 'center',
            padding: '20px',
            fontSize: '14px'
          }}>
            No time series data available. Historical task data will appear here once statistics have been collected over time.
          </div>
        )}

        <div style={{ 
          marginTop: '16px', 
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={fetchTimeSeriesData}
            disabled={isLoadingTimeSeries}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoadingTimeSeries ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isLoadingTimeSeries ? 0.6 : 1
            }}
          >
            {isLoadingTimeSeries ? '🔄 Loading...' : '🔄 Refresh Time Series'}
          </button>
        </div>
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
              
              <button
                onClick={() => {
                  setShowTimeSeries(!showTimeSeries);
                  if (!showTimeSeries && timeSeriesData.length === 0) {
                    fetchTimeSeriesData();
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: showTimeSeries ? '#38a169' : '#4a5568',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                title="Toggle time series analysis view"
              >
                {showTimeSeries ? '📈 Hide Charts' : '📈 Show Charts'}
              </button>
            </div>
          )}

          {/* Render Time Series Chart */}
          {renderTimeSeriesChart()}

          {/* Render Time Series Analysis */}
          {renderTimeSeriesAnalysis()}
        </div>
      )}
    </div>
  );
};

export default Statistics;

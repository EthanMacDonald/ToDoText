import React, { useState, useEffect } from 'react';
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
  TimeScale,
);

type TimeSeriesData = {
  date: string;
  total: number;
  completed: number;
  incomplete: number;
  completion_pct: number;
  with_due_date: number;
  overdue: number;
  due_today: number;
  due_this_week: number;
};

type ComplianceData = {
  date: string;
  completed: number;
  missed: number;
  deferred: number;
  total: number;
  compliance_pct: number;
};

type Props = {
  refreshTrigger?: number;
};

const TimeSeries: React.FC<Props> = ({ refreshTrigger }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [statisticsData, setStatisticsData] = useState<TimeSeriesData[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'stats' | 'compliance'>('stats');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [statsResponse, complianceResponse] = await Promise.all([
        fetch('http://localhost:8000/statistics/time-series'),
        fetch('http://localhost:8000/recurring/compliance')
      ]);
      
      if (!statsResponse.ok || !complianceResponse.ok) {
        throw new Error('Failed to fetch time series data');
      }
      
      const [statsData, complianceData] = await Promise.all([
        statsResponse.json(),
        complianceResponse.json()
      ]);
      
      setStatisticsData(statsData);
      setComplianceData(complianceData);
      
    } catch (error) {
      console.error('Error fetching time series data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate-sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate sample data');
      }
      
      await response.json();
      
      // Refresh data after generating samples
      await fetchData();
      
    } catch (error) {
      console.error('Error generating sample data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate sample data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, refreshTrigger]);

  const createStatsChartData = () => {
    if (!statisticsData.length) return null;

    const labels = statisticsData.map(d => d.date);
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Tasks',
          data: statisticsData.map(d => d.total),
          borderColor: 'rgb(99, 179, 237)',
          backgroundColor: 'rgba(99, 179, 237, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Completed Tasks',
          data: statisticsData.map(d => d.completed),
          borderColor: 'rgb(104, 211, 145)',
          backgroundColor: 'rgba(104, 211, 145, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Completion %',
          data: statisticsData.map(d => d.completion_pct),
          borderColor: 'rgb(246, 173, 85)',
          backgroundColor: 'rgba(246, 173, 85, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
        {
          label: 'Overdue Tasks',
          data: statisticsData.map(d => d.overdue),
          borderColor: 'rgb(252, 129, 129)',
          backgroundColor: 'rgba(252, 129, 129, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  const createComplianceChartData = () => {
    if (!complianceData.length) return null;

    const labels = complianceData.map(d => d.date);
    
    return {
      labels,
      datasets: [
        {
          label: 'Compliance %',
          data: complianceData.map(d => d.compliance_pct),
          borderColor: 'rgb(104, 211, 145)',
          backgroundColor: 'rgba(104, 211, 145, 0.2)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Completed',
          data: complianceData.map(d => d.completed),
          borderColor: 'rgb(99, 179, 237)',
          backgroundColor: 'rgba(99, 179, 237, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
        {
          label: 'Missed',
          data: complianceData.map(d => d.missed),
          borderColor: 'rgb(252, 129, 129)',
          backgroundColor: 'rgba(252, 129, 129, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
        {
          label: 'Deferred',
          data: complianceData.map(d => d.deferred),
          borderColor: 'rgb(183, 148, 246)',
          backgroundColor: 'rgba(183, 148, 246, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
      ],
    };
  };

  const statsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: 'Task Statistics Over Time',
        color: 'white',
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Task Count',
          color: 'white',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: {
          color: 'white',
        },
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Completion %',
          color: 'white',
        },
      },
    },
  };

  const complianceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: 'Recurring Task Compliance Over Time',
        color: 'white',
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Compliance %',
          color: 'white',
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: {
          color: 'white',
        },
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Task Count',
          color: 'white',
        },
      },
    },
  };

  const statsChartData = createStatsChartData();
  const complianceChartData = createComplianceChartData();

  return (
    <div style={{ 
      backgroundColor: '#2d3748', 
      border: '1px solid #4a5568', 
      borderRadius: '8px', 
      marginBottom: '24px',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
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
        <span>📈 Time Series Analysis</span>
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
          
          {isLoading && (
            <div style={{
              color: 'white',
              textAlign: 'center',
              padding: '20px',
              fontSize: '14px'
            }}>
              Loading time series data...
            </div>
          )}
          
          {!isLoading && !error && (
            <>
              {/* Chart Selector */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '16px',
                borderBottom: '1px solid #4a5568',
                paddingBottom: '12px'
              }}>
                <button
                  onClick={() => setActiveChart('stats')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'stats' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📊 Task Statistics
                </button>
                <button
                  onClick={() => setActiveChart('compliance')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'compliance' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✅ Recurring Task Compliance
                </button>
              </div>

              {/* Chart Display */}
              <div style={{ height: '400px', marginBottom: '16px' }}>
                {activeChart === 'stats' && statsChartData && (
                  <Line data={statsChartData} options={statsChartOptions} />
                )}
                {activeChart === 'compliance' && complianceChartData && (
                  <Line data={complianceChartData} options={complianceChartOptions} />
                )}
                {activeChart === 'stats' && !statsChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No historical statistics data available
                    <div style={{ marginTop: '16px' }}>
                      <button
                        onClick={generateSampleData}
                        disabled={isLoading}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#38a169',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          opacity: isLoading ? 0.6 : 1
                        }}
                      >
                        📊 Generate Sample Data
                      </button>
                    </div>
                  </div>
                )}
                {activeChart === 'compliance' && !complianceChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No recurring task compliance data available
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #4a5568'
              }}>
                <button
                  onClick={fetchData}
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
                  🔄 Refresh Charts
                </button>
                
                {statisticsData.length === 0 && (
                  <button
                    onClick={generateSampleData}
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#38a169',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    📊 Generate Sample Data
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeSeries;

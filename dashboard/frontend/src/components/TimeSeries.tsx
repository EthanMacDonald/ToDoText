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
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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

type IndividualTaskData = {
  task_id: string;
  task_description: string;
  total_completed: number;
  total_missed: number;
  total_deferred: number;
  total_entries: number;
  overall_compliance_pct: number;
  first_date: string;
  last_date: string;
};

type IndividualComplianceData = {
  date: string;
  task_id: string;
  task_description: string;
  completed: number;
  missed: number;
  deferred: number;
  total: number;
  compliance_pct: number;
};

// New types for advanced analytics
type HeatmapData = {
  date: string;
  performance_score: number;
  recurring_compliance: number;
  task_completion: number;
  overdue_count: number;
  total_tasks: number;
  recurring_total: number;
};

type DayOfWeekData = {
  day: string;
  avg_compliance_pct: number;
  avg_completion_pct: number;
  avg_total_tasks: number;
  avg_overdue: number;
  data_points: number;
  overall_performance: number;
};

type CorrelationData = {
  task1_id: string;
  task1_description: string;
  task2_id: string;
  task2_description: string;
  correlation: number;
  both_completed_days: number;
  task1_completed_days: number;
  task2_completed_days: number;
  total_days_analyzed: number;
};

type StreakData = {
  task_id: string;
  task_description: string;
  current_streak: number;
  best_streak: number;
  completion_rate: number;
  total_entries: number;
  completed_entries: number;
};

type BadgeData = {
  type: string;
  level: string;
  title: string;
  description: string;
  task_id: string | null;
  value: number;
};

type BehavioralMetrics = {
  procrastination_score: number;
  completion_velocity: number;
  task_difficulty_distribution: Record<string, number>;
  peak_performance_hours: number[];
  consistency_score: number;
};

type ChallengeData = {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  progress: number;
  type: string;
  difficulty: string;
  reward: string;
  status: string;
};

type RecurringTask = {
  task_id: string;
  description: string;
};

type Props = {
  refreshTrigger?: number;
  isExpanded?: boolean; // Control expand/collapse state externally
  onToggleExpanded?: (expanded: boolean) => void; // Callback when expand state changes
};

const TimeSeries: React.FC<Props> = ({ refreshTrigger, isExpanded: externalIsExpanded, onToggleExpanded }) => {
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
  const [statisticsData, setStatisticsData] = useState<TimeSeriesData[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'stats' | 'compliance' | 'individual' | 'heatmap' | 'dayofweek' | 'correlation' | 'streaks' | 'badges' | 'behavioral' | 'challenges'>('stats');
  
  // Enhanced state for new analytics
  const [timeframe, setTimeframe] = useState<number | null>(30);
  const [availableTasks, setAvailableTasks] = useState<IndividualTaskData[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [individualTaskData, setIndividualTaskData] = useState<IndividualComplianceData[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  
  // New analytics data state
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<DayOfWeekData[]>([]);
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [streakData, setStreakData] = useState<StreakData[]>([]);
  const [badgeData, setBadgeData] = useState<BadgeData[]>([]);
  const [behavioralData, setBehavioralData] = useState<BehavioralMetrics | null>(null);
  const [challengeData, setChallengeData] = useState<ChallengeData[]>([]);
  
  // Enhanced options
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [movingAverageWindow, setMovingAverageWindow] = useState(7);
  const [selectedTasksForComparison, setSelectedTasksForComparison] = useState<string[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build URLs with timeframe filter
      const timeframeParam = timeframe ? `?days=${timeframe}` : '';
      const enhancedParam = timeframe ? `?days=${timeframe}&moving_average=${movingAverageWindow}&include_trend=${showTrend}` : `?moving_average=${movingAverageWindow}&include_trend=${showTrend}`;
      
      const urls = [
        `${API_URL}/api/statistics/time-series/enhanced${enhancedParam}`,
        `${API_URL}/api/recurring/compliance`,
        `${API_URL}/api/recurring/compliance/individual${timeframeParam}`,
        `${API_URL}/api/recurring/task-list`,
        `${API_URL}/api/analytics/heatmap${timeframeParam}`,
        `${API_URL}/api/analytics/day-of-week${timeframeParam}`,
        `${API_URL}/api/analytics/correlation${timeframeParam}`,
        `${API_URL}/api/analytics/streaks`,
        `${API_URL}/api/gamification/badges`,
        `${API_URL}/api/analytics/behavioral${timeframeParam}`,
        `${API_URL}/api/gamification/challenges`
      ];
      
      const responses = await Promise.all(urls.map(url => fetch(url)));
      
      const allResponses = await Promise.all(responses.map(response => response.json()));
      
      // Set all data
      setStatisticsData(allResponses[0].data || []);
      setComplianceData(allResponses[1].data || []);
      setAvailableTasks(allResponses[2].data || []);
      setRecurringTasks(allResponses[3].data || []);
      setHeatmapData(allResponses[4].data || []);
      setDayOfWeekData(allResponses[5].data || []);
      setCorrelationData(allResponses[6].data || []);
      setStreakData(allResponses[7].data || []);
      setBadgeData(allResponses[8].data || []);
      setBehavioralData(allResponses[9].data || null);
      setChallengeData(allResponses[10].data || []);
      
      // If a specific task is selected, fetch its individual data
      if (selectedTaskId && allResponses[2].data?.some((t: IndividualTaskData) => t.task_id === selectedTaskId)) {
        await fetchIndividualTaskData(selectedTaskId);
      }
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIndividualTaskData = async (taskId: string) => {
    try {
      const enhancedParam = `?task_id=${taskId}${timeframe ? `&days=${timeframe}` : ''}&moving_average=${movingAverageWindow}&include_trend=${showTrend}`;
      const response = await fetch(`${API_URL}/api/recurring/compliance/enhanced${enhancedParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch individual task data');
      }
      
      const result = await response.json();
      setIndividualTaskData(result.data || []);
      
    } catch (error) {
      console.error('Error fetching individual task data:', error);
      setError('Failed to fetch individual task data');
    }
  };

  const handleTimeframeChange = (newTimeframe: number | null) => {
    setTimeframe(newTimeframe);
  };

  const handleTaskSelection = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      fetchIndividualTaskData(taskId);
    }
  };

  const generateSampleData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/generate-sample-data`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Refresh data after generating samples
        await fetchData();
      }
    } catch (error) {
      console.error('Error generating sample data:', error);
      setError('Failed to generate sample data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, refreshTrigger, timeframe]);

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

  const createIndividualTaskChartData = () => {
    if (!individualTaskData.length) return null;

    const labels = individualTaskData.map(d => d.date);
    
    return {
      labels,
      datasets: [
        {
          label: 'Compliance %',
          data: individualTaskData.map(d => d.compliance_pct),
          borderColor: 'rgb(104, 211, 145)',
          backgroundColor: 'rgba(104, 211, 145, 0.2)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Completed',
          data: individualTaskData.map(d => d.completed),
          borderColor: 'rgb(99, 179, 237)',
          backgroundColor: 'rgba(99, 179, 237, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
        {
          label: 'Missed',
          data: individualTaskData.map(d => d.missed),
          borderColor: 'rgb(252, 129, 129)',
          backgroundColor: 'rgba(252, 129, 129, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
        {
          label: 'Deferred',
          data: individualTaskData.map(d => d.deferred),
          borderColor: 'rgb(183, 148, 246)',
          backgroundColor: 'rgba(183, 148, 246, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
      ],
    };
  };
  
  // New chart creation functions for advanced analytics
  
  const createHeatmapChartData = () => {
    if (!heatmapData.length) return null;
    
    // For a simple line representation of heatmap data
    const labels = heatmapData.map(d => d.date);
    
    return {
      labels,
      datasets: [
        {
          label: 'Performance Score',
          data: heatmapData.map(d => d.performance_score),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Recurring Compliance %',
          data: heatmapData.map(d => d.recurring_compliance),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Task Completion %',
          data: heatmapData.map(d => d.task_completion),
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: 'rgba(255, 205, 86, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  const createDayOfWeekChartData = () => {
    if (!dayOfWeekData.length) return null;
    
    const labels = dayOfWeekData.map(d => d.day);
    
    return {
      labels,
      datasets: [
        {
          label: 'Avg Compliance %',
          data: dayOfWeekData.map(d => d.avg_compliance_pct),
          backgroundColor: 'rgba(99, 179, 237, 0.6)',
          borderColor: 'rgb(99, 179, 237)',
          borderWidth: 1,
        },
        {
          label: 'Avg Completion %',
          data: dayOfWeekData.map(d => d.avg_completion_pct),
          backgroundColor: 'rgba(104, 211, 145, 0.6)',
          borderColor: 'rgb(104, 211, 145)',
          borderWidth: 1,
        },
        {
          label: 'Overall Performance',
          data: dayOfWeekData.map(d => d.overall_performance),
          backgroundColor: 'rgba(246, 173, 85, 0.6)',
          borderColor: 'rgb(246, 173, 85)',
          borderWidth: 1,
        },
      ],
    };
  };

  const createStreakChartData = () => {
    if (!streakData.length) return null;
    
    // Show top 10 tasks by current streak
    const topStreaks = streakData.slice(0, 10);
    const labels = topStreaks.map(d => d.task_description.substring(0, 30) + '...');
    
    return {
      labels,
      datasets: [
        {
          label: 'Current Streak (days)',
          data: topStreaks.map(d => d.current_streak),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
        },
        {
          label: 'Best Streak (days)',
          data: topStreaks.map(d => d.best_streak),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
        },
      ],
    };
  };

  const createBehavioralChart = () => {
    if (!behavioralData) return null;
    
    const metrics = [
      { label: 'Consistency Score', value: behavioralData.consistency_score, color: 'rgba(99, 179, 237, 0.6)' },
      { label: 'Procrastination Score', value: behavioralData.procrastination_score, color: 'rgba(252, 129, 129, 0.6)' },
      { label: 'Completion Velocity', value: behavioralData.completion_velocity * 10, color: 'rgba(104, 211, 145, 0.6)' }, // Scale for visibility
    ];
    
    return {
      labels: metrics.map(m => m.label),
      datasets: [
        {
          label: 'Behavioral Metrics',
          data: metrics.map(m => m.value),
          backgroundColor: metrics.map(m => m.color),
          borderColor: metrics.map(m => m.color.replace('0.6', '1')),
          borderWidth: 1,
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

  const individualTaskChartOptions = {
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
        text: selectedTaskId ? `Compliance: ${availableTasks.find(t => t.task_id === selectedTaskId)?.task_description || 'Selected Task'}` : 'Individual Task Compliance',
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

  const heatmapChartOptions = {
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
        text: 'Task Performance and Compliance Heatmap',
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
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Metrics',
          color: 'white',
        },
      },
    },
  };

  const dayOfWeekChartOptions = {
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
        text: 'Average Task Metrics by Day of Week',
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
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Average %',
          color: 'white',
        },
      },
    },
  };

  const correlationChartOptions = {
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
        text: 'Task Correlation Analysis',
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
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Correlation Coefficient',
          color: 'white',
        },
      },
    },
  };

  const streakChartOptions = {
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
        text: 'Task Streak Analysis',
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
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Days',
          color: 'white',
        },
      },
    },
  };

  const badgeChartOptions = {
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
        text: 'Badge Acquisition Overview',
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
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Badge Count',
          color: 'white',
        },
      },
    },
  };

  const behavioralChartOptions = {
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
        text: 'Behavioral Metrics Analysis',
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
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Score / Velocity',
          color: 'white',
        },
      },
    },
  };

  const challengeChartOptions = {
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
        text: 'Challenge Progress Overview',
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
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        title: {
          display: true,
          text: 'Progress %',
          color: 'white',
        },
      },
    },
  };

  const statsChartData = createStatsChartData();
  const complianceChartData = createComplianceChartData();
  const individualTaskChartData = createIndividualTaskChartData();
  const heatmapChartData = createHeatmapChartData();
  const dayOfWeekChartData = createDayOfWeekChartData();
  const correlationChartData = correlationData.length ? {
    labels: correlationData.map(d => `${d.task1_description.substring(0, 15)} & ${d.task2_description.substring(0, 15)}`),
    datasets: [
      {
        label: 'Correlation',
        data: correlationData.map(d => d.correlation),
        backgroundColor: 'rgba(99, 179, 237, 0.6)',
        borderColor: 'rgb(99, 179, 237)',
        borderWidth: 1,
      },
    ],
  } : null;
  const streakChartData = createStreakChartData();
  const behavioralChartData = createBehavioralChart();
  const challengeChartData = {
    labels: challengeData.map(c => c.title),
    datasets: [
      {
        label: 'Progress',
        data: challengeData.map(c => c.progress),
        backgroundColor: 'rgba(104, 211, 145, 0.6)',
        borderColor: 'rgb(104, 211, 145)',
        borderWidth: 1,
      },
    ],
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
              {/* Timeframe Selector */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '16px',
                borderBottom: '1px solid #4a5568',
                paddingBottom: '12px'
              }}>
                <span style={{ color: '#e2e8f0', fontSize: '14px', marginRight: '8px', alignSelf: 'center' }}>
                  Timeframe:
                </span>
                {[
                  { label: '7 days', value: 7 },
                  { label: '30 days', value: 30 },
                  { label: '90 days', value: 90 },
                  { label: 'All time', value: null }
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => handleTimeframeChange(value)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: timeframe === value ? '#3182ce' : '#4a5568',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

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
                  ✅ Overall Compliance
                </button>
                <button
                  onClick={() => setActiveChart('individual')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'individual' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🎯 Individual Task
                </button>
                <button
                  onClick={() => setActiveChart('heatmap')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'heatmap' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🌡️ Heatmap
                </button>
                <button
                  onClick={() => setActiveChart('dayofweek')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'dayofweek' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📅 Day of Week
                </button>
                <button
                  onClick={() => setActiveChart('correlation')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'correlation' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔗 Correlation
                </button>
                <button
                  onClick={() => setActiveChart('streaks')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'streaks' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📈 Streaks
                </button>
                <button
                  onClick={() => setActiveChart('badges')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'badges' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🏅 Badges
                </button>
                <button
                  onClick={() => setActiveChart('behavioral')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'behavioral' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📊 Behavioral Metrics
                </button>
                <button
                  onClick={() => setActiveChart('challenges')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeChart === 'challenges' ? '#3182ce' : '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🎯 Challenges
                </button>
              </div>

              {/* Individual Task Selector */}
              {activeChart === 'individual' && (
                <div style={{ 
                  marginBottom: '16px',
                  borderBottom: '1px solid #4a5568',
                  paddingBottom: '12px'
                }}>
                  <label style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    Select Task:
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => handleTaskSelection(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#2d3748',
                      color: 'white',
                      border: '1px solid #4a5568',
                      borderRadius: '4px',
                      fontSize: '14px',
                      width: '100%',
                      maxWidth: '400px'
                    }}
                  >
                    <option value="">Select a recurring task...</option>
                    {availableTasks.map(task => (
                      <option key={task.task_id} value={task.task_id}>
                        {task.task_description} ({task.overall_compliance_pct}% compliance)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Enhanced Options for Time Series Charts */}
              {(activeChart === 'stats' || activeChart === 'compliance' || activeChart === 'individual') && (
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginBottom: '16px',
                  padding: '8px',
                  backgroundColor: '#1a202c',
                  borderRadius: '4px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <label style={{ color: '#e2e8f0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={showMovingAverage}
                      onChange={(e) => setShowMovingAverage(e.target.checked)}
                      style={{ marginRight: '4px' }}
                    />
                    Moving Average
                  </label>
                  
                  {showMovingAverage && (
                    <select
                      value={movingAverageWindow}
                      onChange={(e) => setMovingAverageWindow(Number(e.target.value))}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#4a5568',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        fontSize: '12px'
                      }}
                    >
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  )}
                  
                  <label style={{ color: '#e2e8f0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={showTrend}
                      onChange={(e) => setShowTrend(e.target.checked)}
                      style={{ marginRight: '4px' }}
                    />
                    Trend Line
                  </label>
                </div>
              )}

              {/* Comparative Analysis for Multiple Tasks */}
              {(activeChart === 'compliance' || activeChart === 'individual') && (
                <div style={{ 
                  marginBottom: '16px',
                  padding: '8px',
                  backgroundColor: '#1a202c',
                  borderRadius: '4px'
                }}>
                  <label style={{ color: '#e2e8f0', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                    Compare Multiple Tasks (select up to 5):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {recurringTasks.slice(0, 10).map(task => (
                      <label key={task.task_id} style={{ 
                        color: '#e2e8f0', 
                        fontSize: '11px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '2px',
                        padding: '2px 6px',
                        backgroundColor: selectedTasksForComparison.includes(task.task_id) ? '#3182ce' : '#4a5568',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedTasksForComparison.includes(task.task_id)}
                          onChange={(e) => {
                            if (e.target.checked && selectedTasksForComparison.length < 5) {
                              setSelectedTasksForComparison([...selectedTasksForComparison, task.task_id]);
                            } else if (!e.target.checked) {
                              setSelectedTasksForComparison(selectedTasksForComparison.filter(id => id !== task.task_id));
                            }
                          }}
                          style={{ margin: 0, width: '12px', height: '12px' }}
                        />
                        {task.description.substring(0, 20)}...
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart Display */}
              <div style={{ height: '400px', marginBottom: '16px' }}>
                {activeChart === 'stats' && statsChartData && (
                  <Line data={statsChartData} options={statsChartOptions} />
                )}
                {activeChart === 'compliance' && complianceChartData && (
                  <Line data={complianceChartData} options={complianceChartOptions} />
                )}
                {activeChart === 'individual' && individualTaskChartData && selectedTaskId && (
                  <Line data={individualTaskChartData} options={individualTaskChartOptions} />
                )}
                {activeChart === 'heatmap' && heatmapChartData && (
                  <Line data={heatmapChartData} options={heatmapChartOptions} />
                )}
                {activeChart === 'dayofweek' && dayOfWeekChartData && (
                  <Line data={dayOfWeekChartData} options={dayOfWeekChartOptions} />
                )}
                {activeChart === 'correlation' && correlationChartData && (
                  <Bar data={correlationChartData} options={correlationChartOptions} />
                )}
                {activeChart === 'streaks' && streakChartData && (
                  <Bar data={streakChartData} options={streakChartOptions} />
                )}
                {activeChart === 'badges' && badgeData.length > 0 && (
                  <Bar 
                    data={{
                      labels: badgeData.map(b => b.title),
                      datasets: [
                        {
                          label: 'Badge Count',
                          data: badgeData.map(b => b.value),
                          backgroundColor: 'rgba(104, 211, 145, 0.6)',
                          borderColor: 'rgb(104, 211, 145)',
                          borderWidth: 1,
                        },
                      ],
                    }} 
                    options={badgeChartOptions} 
                  />
                )}
                {activeChart === 'behavioral' && behavioralChartData && (
                  <Bar data={behavioralChartData} options={behavioralChartOptions} />
                )}
                {activeChart === 'challenges' && challengeChartData && (
                  <Bar data={challengeChartData} options={challengeChartOptions} />
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
                {activeChart === 'individual' && !selectedTaskId && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    Select a recurring task above to view its compliance over time
                  </div>
                )}
                {activeChart === 'individual' && selectedTaskId && !individualTaskChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No data available for the selected task
                  </div>
                )}
                {activeChart === 'heatmap' && !heatmapChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No heatmap data available for the selected timeframe
                  </div>
                )}
                {activeChart === 'dayofweek' && !dayOfWeekChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No day of week data available for the selected timeframe
                  </div>
                )}
                {activeChart === 'correlation' && !correlationChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No correlation data available for the selected timeframe
                  </div>
                )}
                {activeChart === 'streaks' && !streakChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No streak data available
                  </div>
                )}
                {activeChart === 'badges' && badgeData.length === 0 && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No badge data available
                  </div>
                )}
                {activeChart === 'behavioral' && !behavioralChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No behavioral data available for the selected timeframe
                  </div>
                )}
                {activeChart === 'challenges' && !challengeChartData && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No challenge data available
                  </div>
                )}
              </div>

              {/* Enhanced Data Displays for specific analytics */}
              
              {/* Badges Display */}
              {activeChart === 'badges' && badgeData.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ color: 'white', fontSize: '16px', marginBottom: '12px' }}>🏆 Achievement Badges</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {badgeData.map((badge, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: badge.level === 'platinum' ? '#805ad5' : 
                                         badge.level === 'gold' ? '#dd6b20' :
                                         badge.level === 'silver' ? '#718096' : '#4a5568',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #4a5568',
                          color: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{badge.title}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            backgroundColor: 'rgba(255,255,255,0.2)', 
                            borderRadius: '10px' 
                          }}>
                            {badge.level.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#e2e8f0', margin: '4px 0' }}>{badge.description}</p>
                        <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                          Value: {badge.value} | Type: {badge.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlation Data Table */}
              {activeChart === 'correlation' && correlationData.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ color: 'white', fontSize: '16px', marginBottom: '12px' }}>🔗 Task Correlations</h4>
                  <div style={{ 
                    backgroundColor: '#1a202c', 
                    borderRadius: '6px', 
                    overflow: 'hidden',
                    border: '1px solid #4a5568'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#2d3748' }}>
                          <th style={{ padding: '8px', color: '#e2e8f0', fontSize: '12px', textAlign: 'left' }}>Task 1</th>
                          <th style={{ padding: '8px', color: '#e2e8f0', fontSize: '12px', textAlign: 'left' }}>Task 2</th>
                          <th style={{ padding: '8px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>Correlation</th>
                          <th style={{ padding: '8px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>Both Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correlationData.slice(0, 10).map((correlation, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #4a5568' }}>
                            <td style={{ padding: '8px', color: '#e2e8f0', fontSize: '11px' }}>
                              {correlation.task1_description.substring(0, 30)}...
                            </td>
                            <td style={{ padding: '8px', color: '#e2e8f0', fontSize: '11px' }}>
                              {correlation.task2_description.substring(0, 30)}...
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              color: correlation.correlation > 0.5 ? '#48bb78' : correlation.correlation > 0.3 ? '#ed8936' : '#e53e3e', 
                              fontSize: '11px', 
                              textAlign: 'center',
                              fontWeight: 'bold'
                            }}>
                              {(correlation.correlation * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '8px', color: '#a0aec0', fontSize: '11px', textAlign: 'center' }}>
                              {correlation.both_completed_days} days
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Behavioral Metrics Display */}
              {activeChart === 'behavioral' && behavioralData && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ color: 'white', fontSize: '16px', marginBottom: '12px' }}>🧠 Behavioral Insights</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                    <div style={{ backgroundColor: '#1a202c', padding: '12px', borderRadius: '6px', border: '1px solid #4a5568' }}>
                      <h5 style={{ color: '#63b3ed', fontSize: '14px', marginBottom: '8px' }}>📈 Completion Velocity</h5>
                      <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                        {behavioralData.completion_velocity.toFixed(1)} tasks/day
                      </div>
                      <p style={{ color: '#a0aec0', fontSize: '11px', marginTop: '4px' }}>
                        Average tasks completed per day
                      </p>
                    </div>
                    
                    <div style={{ backgroundColor: '#1a202c', padding: '12px', borderRadius: '6px', border: '1px solid #4a5568' }}>
                      <h5 style={{ color: '#68d391', fontSize: '14px', marginBottom: '8px' }}>🎯 Consistency Score</h5>
                      <div style={{ 
                        color: behavioralData.consistency_score > 80 ? '#48bb78' : 
                               behavioralData.consistency_score > 60 ? '#ed8936' : '#e53e3e', 
                        fontSize: '20px', 
                        fontWeight: 'bold' 
                      }}>
                        {behavioralData.consistency_score.toFixed(1)}%
                      </div>
                      <p style={{ color: '#a0aec0', fontSize: '11px', marginTop: '4px' }}>
                        Consistency in daily completion
                      </p>
                    </div>
                    
                    <div style={{ backgroundColor: '#1a202c', padding: '12px', borderRadius: '6px', border: '1px solid #4a5568' }}>
                      <h5 style={{ color: '#f6ad55', fontSize: '14px', marginBottom: '8px' }}>⏳ Procrastination Score</h5>
                      <div style={{ 
                        color: behavioralData.procrastination_score < 20 ? '#48bb78' : 
                               behavioralData.procrastination_score < 40 ? '#ed8936' : '#e53e3e', 
                        fontSize: '20px', 
                        fontWeight: 'bold' 
                      }}>
                        {behavioralData.procrastination_score.toFixed(1)}%
                      </div>
                      <p style={{ color: '#a0aec0', fontSize: '11px', marginTop: '4px' }}>
                        Percentage of tasks deferred
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#1a202c', padding: '12px', borderRadius: '6px', border: '1px solid #4a5568' }}>
                      <h5 style={{ color: '#fc8181', fontSize: '14px', marginBottom: '8px' }}>⏰ Peak Hours</h5>
                      <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                        {behavioralData.peak_performance_hours.length > 0 
                          ? behavioralData.peak_performance_hours.map(h => `${h}:00`).join(', ')
                          : 'No peak hours identified'
                        }
                      </div>
                      <p style={{ color: '#a0aec0', fontSize: '11px', marginTop: '4px' }}>
                        Most productive hours
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Challenge Progress Display */}
              {activeChart === 'challenges' && challengeData.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ color: 'white', fontSize: '16px', marginBottom: '12px' }}>🎮 Active Challenges</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {challengeData.map((challenge, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: '#1a202c',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #4a5568',
                          color: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h5 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{challenge.title}</h5>
                          <span style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            backgroundColor: challenge.status === 'completed' ? '#48bb78' : 
                                           challenge.status === 'in_progress' ? '#ed8936' : '#4a5568',
                            borderRadius: '10px',
                            color: 'white'
                          }}>
                            {challenge.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#e2e8f0', margin: '4px 0 8px 0' }}>{challenge.description}</p>
                        
                        {/* Progress Bar */}
                        <div style={{ backgroundColor: '#4a5568', borderRadius: '10px', overflow: 'hidden', marginBottom: '4px' }}>
                          <div
                            style={{
                              width: `${Math.min(challenge.progress, 100)}%`,
                              height: '6px',
                              backgroundColor: challenge.progress >= 100 ? '#48bb78' : 
                                             challenge.progress >= 50 ? '#ed8936' : '#3182ce',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a0aec0' }}>
                          <span>Progress: {challenge.current}/{challenge.target}</span>
                          <span>{challenge.progress.toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#68d391', marginTop: '4px' }}>
                          🏆 Reward: {challenge.reward}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeSeries;

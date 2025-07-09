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

// Add CSS animations for fantasy effects
const animationStyles = document.createElement('style');
animationStyles.textContent = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
    50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.6); }
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
    50% { opacity: 1; transform: scale(1) rotate(180deg); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes rainbow {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
  
  @keyframes magicAura {
    0%, 100% { 
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.3), 
                  inset 0 0 20px rgba(255, 255, 255, 0.1); 
    }
    25% { 
      box-shadow: 0 0 25px rgba(138, 43, 226, 0.4), 
                  inset 0 0 30px rgba(138, 43, 226, 0.2); 
    }
    50% { 
      box-shadow: 0 0 30px rgba(0, 191, 255, 0.5), 
                  inset 0 0 40px rgba(0, 191, 255, 0.3); 
    }
    75% { 
      box-shadow: 0 0 25px rgba(255, 20, 147, 0.4), 
                  inset 0 0 30px rgba(255, 20, 147, 0.2); 
    }
  }
  
  .fantasy-card {
    position: relative;
    overflow: visible !important;
  }
  
  .fantasy-card:hover {
    transform: translateY(-8px) scale(1.03);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .fantasy-card::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b);
    border-radius: 14px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
    animation: rainbow 3s linear infinite;
  }
  
  .fantasy-card.mythic::before {
    opacity: 0.6;
  }
  
  .legendary-sparkle {
    position: absolute;
    color: #ffd700;
    animation: sparkle 2s infinite;
    pointer-events: none;
  }
  
  .mythic-particles {
    position: absolute;
    width: 4px;
    height: 4px;
    background: radial-gradient(circle, #ff6b6b, transparent);
    border-radius: 50%;
    animation: float 3s ease-in-out infinite;
    pointer-events: none;
  }
`;
document.head.appendChild(animationStyles);

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
  compliance?: {
    date: string;
    completed: number;
    missed: number;
    deferred: number;
    total: number;
    compliance_pct: number;
  } | null;
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
  const [basicTimeSeriesData, setBasicTimeSeriesData] = useState<TimeSeriesData[]>([]);
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

  const fetchBasicTimeSeriesData = async () => {
    try {
      const response = await fetch(`${API_URL}/statistics/time-series`);
      if (!response.ok) {
        throw new Error(`Failed to fetch time series data: ${response.status}`);
      }
      const data = await response.json();
      setBasicTimeSeriesData(data);
    } catch (error) {
      console.error('Error fetching basic time series data:', error);
      throw error;
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First fetch the basic time series data
      await fetchBasicTimeSeriesData();
      
      // Try to fetch enhanced analytics, but don't fail if they don't exist
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
        
        // Set all data if available, otherwise use empty arrays
        setComplianceData(allResponses[1]?.data || []);
        setAvailableTasks(allResponses[2]?.data || []);
        setRecurringTasks(allResponses[3]?.data || []);
        setHeatmapData(allResponses[4]?.data || []);
        setDayOfWeekData(allResponses[5]?.data || []);
        setCorrelationData(allResponses[6]?.data || []);
        setStreakData(allResponses[7]?.data || []);
        setBadgeData(allResponses[8]?.data || []);
        setBehavioralData(allResponses[9]?.data || null);
        setChallengeData(allResponses[10]?.data || []);
        
        // If no advanced analytics data was returned, generate fallback data
        if (!allResponses[4]?.data?.length || !allResponses[5]?.data?.length || !allResponses[6]?.data?.length || !allResponses[7]?.data?.length) {
          console.log('Some advanced analytics data missing, generating fallback data');
          console.log('Heatmap data length:', allResponses[4]?.data?.length || 0);
          console.log('Day of week data length:', allResponses[5]?.data?.length || 0);
          console.log('Correlation data length:', allResponses[6]?.data?.length || 0);
          console.log('Streak data length:', allResponses[7]?.data?.length || 0);
          
          if (!allResponses[4]?.data?.length) {
            const heatmapFallback = generateHeatmapDataFromBasic();
            console.log('Generated heatmap fallback data:', heatmapFallback.length, 'items');
            setHeatmapData(heatmapFallback);
          }
          if (!allResponses[5]?.data?.length) setDayOfWeekData(generateDayOfWeekDataFromBasic());
          if (!allResponses[6]?.data?.length) setCorrelationData(generateSampleCorrelationData());
          if (!allResponses[7]?.data?.length) setStreakData(generateStreakDataFromBasic());
          if (!allResponses[8]?.data?.length) setBadgeData(generateSampleBadgeData());
          if (!allResponses[9]?.data) setBehavioralData(generateSampleBehavioralData());
          if (!allResponses[10]?.data?.length) setChallengeData(generateSampleChallengeData());
          if (!allResponses[2]?.data?.length) setAvailableTasks(generateSampleAvailableTasks());
        }
        
        // If a specific task is selected, fetch its individual data
        if (selectedTaskId && allResponses[2].data?.some((t: IndividualTaskData) => t.task_id === selectedTaskId)) {
          await fetchIndividualTaskData(selectedTaskId);
        }
      } catch (enhancedError) {
        console.log('Enhanced analytics not available, generating synthetic data from basic time series');
        
        // Always generate fallback data when enhanced analytics aren't available
        const fallbackHeatmapData = generateHeatmapDataFromBasic();
        const fallbackDayOfWeekData = generateDayOfWeekDataFromBasic();
        const fallbackStreakData = generateStreakDataFromBasic();
        const fallbackAvailableTasks = generateSampleAvailableTasks();
        const fallbackCorrelationData = generateSampleCorrelationData();
        const fallbackBadgeData = generateSampleBadgeData();
        const fallbackBehavioralData = generateSampleBehavioralData();
        const fallbackChallengeData = generateSampleChallengeData();
        
        console.log('Generated fallback data in catch block:', {
          heatmap: fallbackHeatmapData.length,
          dayOfWeek: fallbackDayOfWeekData.length,
          streaks: fallbackStreakData.length,
          correlation: fallbackCorrelationData.length,
          badges: fallbackBadgeData.length
        });
        
        // Set all fallback data
        setHeatmapData(fallbackHeatmapData);
        setDayOfWeekData(fallbackDayOfWeekData);
        setStreakData(fallbackStreakData);
        setAvailableTasks(fallbackAvailableTasks);
        setRecurringTasks(fallbackAvailableTasks.map(t => ({ task_id: t.task_id, description: t.task_description })));
        setCorrelationData(fallbackCorrelationData);
        setBadgeData(fallbackBadgeData);
        setBehavioralData(fallbackBehavioralData);
        setChallengeData(fallbackChallengeData);
        
        console.log('Generated fallback data:', {
          heatmap: fallbackHeatmapData.length,
          dayOfWeek: fallbackDayOfWeekData.length,
          streaks: fallbackStreakData.length,
          correlation: fallbackCorrelationData.length,
          badges: fallbackBadgeData.length
        });
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
      // Generate fallback data from basic time series
      const fallbackData = generateIndividualTaskDataFromBasic(taskId);
      setIndividualTaskData(fallbackData);
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

  // Ensure heatmap data is available when heatmap view is selected
  useEffect(() => {
    if (activeChart === 'heatmap' && heatmapData.length === 0) {
      console.log('Heatmap view selected but no data, generating fallback data');
      const fallbackData = generateHeatmapDataFromBasic();
      console.log('Generated fallback heatmap data:', fallbackData.length, 'items');
      setHeatmapData(fallbackData);
    }
  }, [activeChart, heatmapData.length]);

  const createStatsChartData = () => {
    if (!basicTimeSeriesData.length) return null;

    const labels = basicTimeSeriesData.map(d => d.date);
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Tasks',
          data: basicTimeSeriesData.map(d => d.total),
          borderColor: 'rgb(99, 179, 237)',
          backgroundColor: 'rgba(99, 179, 237, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Completed Tasks',
          data: basicTimeSeriesData.map(d => d.completed),
          borderColor: 'rgb(104, 211, 145)',
          backgroundColor: 'rgba(104, 211, 145, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Completion %',
          data: basicTimeSeriesData.map(d => d.completion_pct),
          borderColor: 'rgb(246, 173, 85)',
          backgroundColor: 'rgba(246, 173, 85, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
        {
          label: 'Overdue Tasks',
          data: basicTimeSeriesData.map(d => d.overdue),
          borderColor: 'rgb(252, 129, 129)',
          backgroundColor: 'rgba(252, 129, 129, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  const createComplianceChartData = () => {
    // Filter basicTimeSeriesData to get entries with compliance data
    const complianceEntries = basicTimeSeriesData.filter(d => d.compliance);
    if (!complianceEntries.length) return null;

    const labels = complianceEntries.map(d => d.date);
    
    return {
      labels,
      datasets: [
        {
          label: 'Compliance %',
          data: complianceEntries.map(d => d.compliance?.compliance_pct || 0),
          borderColor: 'rgb(104, 211, 145)',
          backgroundColor: 'rgba(104, 211, 145, 0.2)',
          tension: 0.1,
          fill: true,
        },
        {
          label: 'Completed',
          data: complianceEntries.map(d => d.compliance?.completed || 0),
          borderColor: 'rgb(99, 179, 237)',
          backgroundColor: 'rgba(99, 179, 237, 0.2)',
          tension: 0.1,
          yAxisID: 'y1',
        },
        {
          label: 'Missed',
          data: complianceEntries.map(d => d.compliance?.missed || 0),
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
  
  // Generate synthetic analytics data from basic time series data
  const generateHeatmapDataFromBasic = () => {
    // If we have basic time series data, use it
    if (basicTimeSeriesData.length > 0) {
      return basicTimeSeriesData.map(entry => ({
        date: entry.date,
        performance_score: Math.min(100, entry.completion_pct + (Math.random() * 20 - 10)),
        recurring_compliance: entry.compliance?.compliance_pct || (Math.random() * 40 + 60),
        task_completion: entry.completion_pct,
        overdue_count: entry.overdue,
        total_tasks: entry.total,
        recurring_total: entry.compliance?.total || Math.floor(Math.random() * 10 + 5)
      }));
    }
    
    // If no basic data available, generate sample heatmap data
    const sampleData = [];
    const endDate = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      sampleData.push({
        date: dateStr,
        performance_score: Math.random() * 30 + 70, // 70-100
        recurring_compliance: Math.random() * 40 + 60, // 60-100
        task_completion: Math.random() * 30 + 70, // 70-100
        overdue_count: Math.floor(Math.random() * 5), // 0-4
        total_tasks: Math.floor(Math.random() * 10 + 15), // 15-25
        recurring_total: Math.floor(Math.random() * 5 + 5) // 5-10
      });
    }
    
    return sampleData;
  };

  const generateDayOfWeekDataFromBasic = () => {
    const dayMap: Record<string, { total: number, completion: number, compliance: number, overdue: number, count: number }> = {
      'Monday': { total: 0, completion: 0, compliance: 0, overdue: 0, count: 0 },
      'Tuesday': { total: 0, completion: 0, compliance: 0, overdue: 0, count: 0 },
      'Wednesday': { total: 0, completion: 0, compliance: 0, overdue: 0, count: 0 },
      'Thursday': { total: 0, completion: 0, compliance: 0, overdue: 0, count: 0 },
      'Friday': { total: 0, completion: 0, compliance: 0, overdue: 0, count: 0 },
      'Saturday': { total: 0, completion: 0, compliance: 0, overdue: 0, count: 0 },
      'Sunday': { total: 0, completion: 0, compliance: 0, overdue: 0, count: 0 }
    };

    basicTimeSeriesData.forEach(entry => {
      const date = new Date(entry.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (dayMap[dayName]) {
        dayMap[dayName].total += entry.total;
        dayMap[dayName].completion += entry.completion_pct;
        dayMap[dayName].compliance += entry.compliance?.compliance_pct || 0;
        dayMap[dayName].overdue += entry.overdue;
        dayMap[dayName].count += 1;
      }
    });

    return Object.entries(dayMap).map(([day, data]) => ({
      day,
      avg_compliance_pct: data.count > 0 ? data.compliance / data.count : 0,
      avg_completion_pct: data.count > 0 ? data.completion / data.count : 0,
      avg_total_tasks: data.count > 0 ? data.total / data.count : 0,
      avg_overdue: data.count > 0 ? data.overdue / data.count : 0,
      data_points: data.count,
      overall_performance: data.count > 0 ? (data.completion / data.count + (data.compliance / data.count || 0)) / 2 : 0
    }));
  };

  const generateStreakDataFromBasic = () => {
    // Generate some sample streak data based on compliance patterns
    const streaks = [
      {
        task_id: 'daily_exercise',
        task_description: 'Daily Exercise',
        current_streak: 12,
        best_streak: 28,
        completion_rate: 85.7,
        total_entries: 60,
        completed_entries: 51
      },
      {
        task_id: 'morning_meditation',
        task_description: 'Morning Meditation',
        current_streak: 7,
        best_streak: 15,
        completion_rate: 73.3,
        total_entries: 60,
        completed_entries: 44
      },
      {
        task_id: 'daily_standup',
        task_description: 'Daily Team Standup',
        current_streak: 22,
        best_streak: 35,
        completion_rate: 91.7,
        total_entries: 60,
        completed_entries: 55
      },
      {
        task_id: 'code_review',
        task_description: 'Code Review',
        current_streak: 5,
        best_streak: 18,
        completion_rate: 78.3,
        total_entries: 60,
        completed_entries: 47
      }
    ];
    return streaks;
  };

  const generateSampleAvailableTasks = () => {
    return [
      {
        task_id: 'daily_exercise',
        task_description: 'Daily Exercise',
        total_completed: 51,
        total_missed: 6,
        total_deferred: 3,
        total_entries: 60,
        overall_compliance_pct: 85.0,
        first_date: '2025-05-09',
        last_date: '2025-07-08'
      },
      {
        task_id: 'morning_meditation',
        task_description: 'Morning Meditation', 
        total_completed: 44,
        total_missed: 12,
        total_deferred: 4,
        total_entries: 60,
        overall_compliance_pct: 73.3,
        first_date: '2025-05-09',
        last_date: '2025-07-08'
      },
      {
        task_id: 'daily_standup',
        task_description: 'Daily Team Standup',
        total_completed: 55,
        total_missed: 3,
        total_deferred: 2,
        total_entries: 60,
        overall_compliance_pct: 91.7,
        first_date: '2025-05-09',
        last_date: '2025-07-08'
      }
    ];
  };

  const generateIndividualTaskDataFromBasic = (taskId: string) => {
    if (!basicTimeSeriesData.length) return [];
    
    // Generate synthetic individual task compliance data
    return basicTimeSeriesData.filter(entry => entry.compliance).map(entry => {
      const base = entry.compliance!;
      const variance = Math.random() * 0.4 - 0.2; // ±20% variance
      
      return {
        date: entry.date,
        task_id: taskId,
        task_description: taskId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        completed: Math.max(0, Math.floor(base.completed + variance * base.total)),
        missed: Math.max(0, Math.floor(base.missed + variance * base.total)),
        deferred: Math.max(0, Math.floor(base.deferred + variance * base.total)),
        total: base.total,
        compliance_pct: Math.max(0, Math.min(100, base.compliance_pct + variance * 100))
      };
    });
  };

  const generateSampleCorrelationData = (): CorrelationData[] => {
    return [
      {
        task1_id: 'daily_exercise',
        task1_description: 'Daily Exercise',
        task2_id: 'morning_meditation',
        task2_description: 'Morning Meditation',
        correlation: 0.73,
        both_completed_days: 42,
        task1_completed_days: 51,
        task2_completed_days: 44,
        total_days_analyzed: 60
      },
      {
        task1_id: 'daily_standup',
        task1_description: 'Daily Team Standup',
        task2_id: 'code_review',
        task2_description: 'Code Review',
        correlation: 0.65,
        both_completed_days: 38,
        task1_completed_days: 55,
        task2_completed_days: 47,
        total_days_analyzed: 60
      },
      {
        task1_id: 'morning_meditation',
        task1_description: 'Morning Meditation',
        task2_id: 'code_review',
        task2_description: 'Code Review',
        correlation: 0.42,
        both_completed_days: 29,
        task1_completed_days: 44,
        task2_completed_days: 47,
        total_days_analyzed: 60
      }
    ];
  };

  const generateSampleBadgeData = (): BadgeData[] => {
    return [
      {
        type: 'weapon',
        level: 'mythic',
        title: '🌟 Excalibur of Infinite Determination',
        description: 'The legendary blade that cuts through all obstacles. Only the most dedicated champions can wield its power. Grants +500% motivation.',
        task_id: null,
        value: 1337
      },
      {
        type: 'weapon',
        level: 'legendary',
        title: '⚔️ Dragonslayer Blade',
        description: 'Forged from 50+ consecutive days of daily victories. Its edge never dulls, and it whispers ancient secrets of perseverance.',
        task_id: 'daily_exercise',
        value: 52
      },
      {
        type: 'armor',
        level: 'mythic',
        title: '🌈 Aegis of Timeless Perfection',
        description: 'Crystalline armor that shimmers with the colors of completed dreams. Protects against all forms of procrastination.',
        task_id: null,
        value: 999
      },
      {
        type: 'armor',
        level: 'legendary',
        title: '⚡ Thunderplate Mail',
        description: 'Electrified armor crackling with the power of lightning. Grants immunity to deadline stress and burnout.',
        task_id: null,
        value: 200
      },
      {
        type: 'jewelry',
        level: 'mythic',
        title: '🔮 Orb of Infinite Productivity',
        description: 'A swirling sphere of pure cosmic energy that bends reality itself. Multiplies task completion speed by ∞.',
        task_id: null,
        value: 2000
      },
      {
        type: 'jewelry',
        level: 'legendary',
        title: '� Crown of the Taskmaster Supreme',
        description: 'Ultimate crown worn only by those who have achieved 95%+ overall compliance. Radiates an aura of pure accomplishment.',
        task_id: null,
        value: 975
      },
      {
        type: 'armor',
        level: 'epic',
        title: '�🛡️ Aegis of Consistency',
        description: 'Mystical shield that grows stronger with each completed challenge. Blocks procrastination and doubt.',
        task_id: 'morning_meditation',
        value: 35
      },
      {
        type: 'jewelry',
        level: 'epic',
        title: '💎 Crystal of Eternal Focus',
        description: 'Crystalline gem that enhances mental clarity by 300%. Earned through 100+ meditation sessions.',
        task_id: 'morning_meditation',
        value: 127
      },
      {
        type: 'weapon',
        level: 'epic',
        title: '🏹 Bow of Perfect Precision',
        description: 'Enchanted longbow that never misses its target. Born from flawless code reviews and perfect execution.',
        task_id: 'code_review',
        value: 89
      },
      {
        type: 'weapon',
        level: 'epic',
        title: '🔥 Staff of Burning Passion',
        description: 'Magical staff wielded by masters of their craft. Burns away all obstacles with the fire of dedication.',
        task_id: null,
        value: 156
      },
      {
        type: 'armor',
        level: 'rare',
        title: '🦾 Gauntlets of Iron Will',
        description: 'Forged in the fires of 90%+ weekly compliance. These gloves refuse to let go of any task until completion.',
        task_id: null,
        value: 93
      },
      {
        type: 'jewelry',
        level: 'rare',
        title: '� Ring of Time Mastery',
        description: 'Ancient ring that bends the flow of time itself. Earned by never missing a deadline.',
        task_id: null,
        value: 75
      },
      {
        type: 'weapon',
        level: 'rare',
        title: '🗡️ Sabre of Swift Execution',
        description: 'Lightweight blade that cuts through procrastination like butter. Leaves no task unfinished.',
        task_id: 'daily_standup',
        value: 42
      },
      {
        type: 'armor',
        level: 'uncommon',
        title: '👢 Boots of Relentless Progress',
        description: 'Enchanted footwear that never stops moving forward. Grants +50% movement speed toward goals.',
        task_id: null,
        value: 25
      },
      {
        type: 'jewelry',
        level: 'uncommon',
        title: '� Amulet of Habit Formation',
        description: 'Mystical pendant that strengthens neural pathways. Makes good habits feel as natural as breathing.',
        task_id: null,
        value: 18
      },
      {
        type: 'weapon',
        level: 'common',
        title: '🗡️ Apprentice Blade',
        description: 'Your first weapon on the path to greatness. Simple but reliable, it has served you well.',
        task_id: null,
        value: 5
      }
    ];
  };

  const generateSampleBehavioralData = (): BehavioralMetrics => {
    return {
      procrastination_score: 23.5,
      completion_velocity: 4.2,
      task_difficulty_distribution: {
        'easy': 40,
        'medium': 45,
        'hard': 15
      },
      peak_performance_hours: [9, 10, 14, 15],
      consistency_score: 78.3
    };
  };

  const generateSampleChallengeData = (): ChallengeData[] => {
    return [
      {
        id: 'weekly_warrior',
        title: 'Weekly Warrior',
        description: 'Complete all daily tasks for an entire week',
        target: 7,
        current: 5,
        progress: 71.4,
        type: 'streak',
        difficulty: 'medium',
        reward: 'Streak Master Badge',
        status: 'in_progress'
      },
      {
        id: 'early_bird',
        title: 'Early Bird Challenge',
        description: 'Complete morning meditation before 8 AM for 14 days',
        target: 14,
        current: 14,
        progress: 100,
        type: 'habit',
        difficulty: 'hard',
        reward: 'Early Bird Badge + 5 XP bonus',
        status: 'completed'
      },
      {
        id: 'perfect_month',
        title: 'Perfect Month',
        description: 'Achieve 90%+ compliance for 30 days',
        target: 30,
        current: 12,
        progress: 40,
        type: 'compliance',
        difficulty: 'hard',
        reward: 'Consistency Crown',
        status: 'in_progress'
      }
    ];
  };
  
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
  const challengeChartData = challengeData.length ? {
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
  } : null;

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
                    {availableTasks.length === 0 && (
                      <>
                        <option value="daily_exercise">Daily Exercise (85.0% compliance)</option>
                        <option value="morning_meditation">Morning Meditation (73.3% compliance)</option>
                        <option value="daily_standup">Daily Team Standup (91.7% compliance)</option>
                      </>
                    )}
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
                {activeChart === 'heatmap' && heatmapChartData && heatmapData.length > 0 && (
                  <Line data={heatmapChartData} options={heatmapChartOptions} />
                )}
                {activeChart === 'dayofweek' && dayOfWeekChartData && dayOfWeekData.length > 0 && (
                  <Bar data={dayOfWeekChartData} options={dayOfWeekChartOptions} />
                )}
                {activeChart === 'correlation' && correlationChartData && correlationData.length > 0 && (
                  <Bar data={correlationChartData} options={correlationChartOptions} />
                )}
                {activeChart === 'streaks' && streakChartData && streakData.length > 0 && (
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
                {activeChart === 'challenges' && challengeData.length > 0 && (
                  <Bar data={challengeChartData!} options={challengeChartOptions} />
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
                {activeChart === 'heatmap' && (!heatmapChartData || heatmapData.length === 0) && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No heatmap data available for the selected timeframe
                  </div>
                )}
                {activeChart === 'dayofweek' && (!dayOfWeekChartData || dayOfWeekData.length === 0) && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No day of week data available for the selected timeframe
                  </div>
                )}
                {activeChart === 'correlation' && (!correlationChartData || correlationData.length === 0) && (
                  <div style={{ 
                    color: '#a0aec0', 
                    textAlign: 'center', 
                    padding: '60px',
                    fontSize: '16px' 
                  }}>
                    No correlation data available for the selected timeframe
                  </div>
                )}
                {activeChart === 'streaks' && (!streakChartData || streakData.length === 0) && (
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
              
              {/* Fantasy Arsenal Display */}
              {activeChart === 'badges' && badgeData.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #2c1810 0%, #5d4037 25%, #8d6e63 50%, #5d4037 75%, #2c1810 100%)',
                    padding: '24px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    border: '3px solid #ffd700',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.4), inset 0 0 30px rgba(255, 215, 0, 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Animated background texture */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,215,0,0.05) 2px, rgba(255,215,0,0.05) 4px)',
                      animation: 'shimmer 8s linear infinite',
                      pointerEvents: 'none'
                    }} />
                    
                    <h4 style={{ 
                      color: '#ffd700', 
                      fontSize: '32px', 
                      marginBottom: '8px',
                      textAlign: 'center',
                      textShadow: '3px 3px 6px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.6)',
                      fontWeight: 'bold',
                      fontFamily: 'serif',
                      letterSpacing: '2px',
                      background: 'linear-gradient(45deg, #ffd700, #ffed4e, #fff176, #ffd700)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      animation: 'rainbow 4s ease-in-out infinite'
                    }}>
                      ⚔️ LEGENDARY ARSENAL ⚔️
                    </h4>
                    <p style={{ 
                      color: '#e8d5b7', 
                      textAlign: 'center', 
                      fontSize: '16px',
                      fontStyle: 'italic',
                      marginBottom: '0',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      letterSpacing: '1px'
                    }}>
                      ✨ Your collection of mystical artifacts and legendary equipment ✨
                    </p>
                    
                    {/* Decorative corner ornaments */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      fontSize: '20px',
                      color: '#ffd700',
                      opacity: 0.8,
                      animation: 'sparkle 3s infinite'
                    }}>⚜️</div>
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      fontSize: '20px',
                      color: '#ffd700',
                      opacity: 0.8,
                      animation: 'sparkle 3s infinite',
                      animationDelay: '1.5s'
                    }}>⚜️</div>
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      fontSize: '20px',
                      color: '#ffd700',
                      opacity: 0.8,
                      animation: 'sparkle 3s infinite',
                      animationDelay: '0.75s'
                    }}>⚜️</div>
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      fontSize: '20px',
                      color: '#ffd700',
                      opacity: 0.8,
                      animation: 'sparkle 3s infinite',
                      animationDelay: '2.25s'
                    }}>⚜️</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {badgeData.map((badge, index) => {
                      const rarityColors = {
                        'mythic': { bg: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)', border: '#ff6b6b', glow: 'rgba(255, 107, 107, 0.6)' },
                        'legendary': { bg: 'linear-gradient(135deg, #ffd700, #ffb347)', border: '#ffd700', glow: 'rgba(255, 215, 0, 0.6)' },
                        'epic': { bg: 'linear-gradient(135deg, #8e44ad, #c44569)', border: '#8e44ad', glow: 'rgba(142, 68, 173, 0.6)' },
                        'rare': { bg: 'linear-gradient(135deg, #3742fa, #2f3542)', border: '#3742fa', glow: 'rgba(55, 66, 250, 0.6)' },
                        'uncommon': { bg: 'linear-gradient(135deg, #2ed573, #1e3799)', border: '#2ed573', glow: 'rgba(46, 213, 115, 0.6)' },
                        'common': { bg: 'linear-gradient(135deg, #57606f, #2f3542)', border: '#57606f', glow: 'rgba(87, 96, 111, 0.6)' }
                      };
                      
                      const rarity = rarityColors[badge.level as keyof typeof rarityColors] || rarityColors.common;
                      
                      return (
                        <div
                          key={index}
                          className={`fantasy-card ${badge.level}`}
                          style={{
                            background: rarity.bg,
                            padding: '16px',
                            borderRadius: '12px',
                            border: `2px solid ${rarity.border}`,
                            color: 'white',
                            boxShadow: badge.level === 'mythic' ? 
                              `0 0 25px ${rarity.glow}, 0 0 50px ${rarity.glow}` : 
                              `0 0 15px ${rarity.glow}`,
                            transform: 'translateZ(0)',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            position: 'relative',
                            overflow: 'visible',
                            cursor: 'pointer',
                            animation: badge.level === 'mythic' ? 'magicAura 4s infinite' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-8px) scale(1.03)';
                            e.currentTarget.style.boxShadow = badge.level === 'mythic' ? 
                              `0 12px 35px ${rarity.glow}, 0 0 60px ${rarity.glow}` :
                              `0 8px 25px ${rarity.glow}`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateZ(0)';
                            e.currentTarget.style.boxShadow = badge.level === 'mythic' ? 
                              `0 0 25px ${rarity.glow}, 0 0 50px ${rarity.glow}` :
                              `0 0 15px ${rarity.glow}`;
                          }}
                        >
                          {/* Animated shimmer effect for mythic items */}
                          {badge.level === 'mythic' && (
                            <>
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                                animation: 'shimmer 3s infinite',
                                pointerEvents: 'none',
                                borderRadius: '12px'
                              }} />
                              
                              {/* Magical floating particles */}
                              <div className="mythic-particles" style={{
                                top: '10%',
                                left: '15%',
                                animationDelay: '0s'
                              }} />
                              <div className="mythic-particles" style={{
                                top: '30%',
                                right: '20%',
                                animationDelay: '1s',
                                background: 'radial-gradient(circle, #48dbfb, transparent)'
                              }} />
                              <div className="mythic-particles" style={{
                                bottom: '25%',
                                left: '25%',
                                animationDelay: '2s',
                                background: 'radial-gradient(circle, #feca57, transparent)'
                              }} />
                              <div className="mythic-particles" style={{
                                top: '60%',
                                right: '15%',
                                animationDelay: '0.5s',
                                background: 'radial-gradient(circle, #ff9ff3, transparent)'
                              }} />
                            </>
                          )}
                          
                          {/* Sparkle effects for legendary items */}
                          {badge.level === 'legendary' && (
                            <>
                              <div className="legendary-sparkle" style={{
                                top: '8px',
                                right: '12px',
                                animationDelay: '0s'
                              }}>✨</div>
                              <div className="legendary-sparkle" style={{
                                bottom: '12px',
                                left: '8px',
                                animationDelay: '1s'
                              }}>⭐</div>
                              <div className="legendary-sparkle" style={{
                                top: '40%',
                                right: '8px',
                                animationDelay: '2s'
                              }}>💫</div>
                            </>
                          )}
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <h5 style={{ 
                                fontSize: '16px', 
                                fontWeight: 'bold', 
                                margin: '0 0 4px 0',
                                textShadow: badge.level === 'mythic' ? 
                                  '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.5)' :
                                  '1px 1px 2px rgba(0,0,0,0.8)',
                                lineHeight: '1.2',
                                background: badge.level === 'mythic' ? 
                                  'linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)' : 'none',
                                backgroundClip: badge.level === 'mythic' ? 'text' : 'unset',
                                WebkitBackgroundClip: badge.level === 'mythic' ? 'text' : 'unset',
                                WebkitTextFillColor: badge.level === 'mythic' ? 'transparent' : 'white',
                                animation: badge.level === 'mythic' ? 'rainbow 3s linear infinite' : 'none'
                              }}>
                                {badge.title}
                              </h5>
                            </div>
                            <div style={{ 
                              fontSize: '10px', 
                              padding: '4px 8px', 
                              backgroundColor: badge.level === 'mythic' ? 
                                'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)', 
                              borderRadius: '12px',
                              border: `1px solid ${rarity.border}`,
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              boxShadow: badge.level === 'mythic' ? 
                                '0 2px 8px rgba(255,255,255,0.3), inset 0 1px 2px rgba(255,255,255,0.2)' :
                                '0 2px 4px rgba(0,0,0,0.3)',
                              background: badge.level === 'mythic' ? 
                                'linear-gradient(45deg, rgba(255,107,107,0.3), rgba(254,202,87,0.3), rgba(72,219,251,0.3), rgba(255,159,243,0.3))' :
                                'rgba(0,0,0,0.4)'
                            }}>
                              {badge.level}
                            </div>
                          </div>
                          
                          <p style={{ 
                            fontSize: '13px', 
                            color: '#f1f1f1', 
                            margin: '0 0 12px 0',
                            lineHeight: '1.4',
                            textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                          }}>
                            {badge.description}
                          </p>
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}>
                            <span style={{ 
                              fontSize: '12px', 
                              color: '#ffd700',
                              fontWeight: 'bold'
                            }}>
                              Power: {badge.value}
                            </span>
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#e2e8f0',
                              textTransform: 'capitalize',
                              opacity: 0.8
                            }}>
                              {badge.type === 'weapon' ? '⚔️ Weapon' : 
                               badge.type === 'armor' ? '🛡️ Armor' : 
                               badge.type === 'jewelry' ? '💎 Jewelry' : 
                               badge.type}
                            </span>
                          </div>
                          
                          {/* Special magical effects for high-tier items */}
                          {badge.level === 'mythic' && (
                            <div style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              fontSize: '24px',
                              opacity: 0.7,
                              animation: 'pulse 1s infinite, float 3s ease-in-out infinite',
                              textShadow: '0 0 10px rgba(255,255,255,0.8)'
                            }}>
                              🌌
                            </div>
                          )}
                          {badge.level === 'legendary' && (
                            <div style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              fontSize: '20px',
                              opacity: 0.6,
                              animation: 'glow 2s infinite',
                              textShadow: '0 0 8px rgba(255,215,0,0.8)'
                            }}>
                              👑
                            </div>
                          )}
                          {badge.level === 'epic' && (
                            <div style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              fontSize: '18px',
                              opacity: 0.5,
                              animation: 'pulse 2.5s infinite'
                            }}>
                              ⭐
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Fantasy Collection Statistics */}
                  <div style={{
                    marginTop: '24px',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    borderRadius: '12px',
                    border: '2px solid #4a90e2',
                    boxShadow: '0 0 20px rgba(74, 144, 226, 0.3), inset 0 0 20px rgba(74, 144, 226, 0.1)',
                    position: 'relative'
                  }}>
                    {/* Magical constellation background */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.3), transparent), radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.2), transparent), radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.2), transparent)',
                      backgroundSize: '150px 100px',
                      opacity: 0.6,
                      pointerEvents: 'none'
                    }} />
                    
                    <h5 style={{ 
                      color: '#87ceeb', 
                      fontSize: '18px', 
                      marginBottom: '16px', 
                      textAlign: 'center',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(135,206,235,0.5)',
                      fontWeight: 'bold',
                      letterSpacing: '1px'
                    }}>
                      📊 ✨ ARSENAL MASTERY STATISTICS ✨ 📊
                    </h5>
                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '14px', position: 'relative', zIndex: 1 }}>
                      <div style={{ 
                        textAlign: 'center',
                        padding: '12px',
                        background: 'rgba(231, 76, 60, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(231, 76, 60, 0.4)',
                        minWidth: '80px'
                      }}>
                        <div style={{ 
                          color: '#ff6b6b', 
                          fontWeight: 'bold', 
                          fontSize: '20px',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          ⚔️ {badgeData.filter(b => b.type === 'weapon').length}
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '4px' }}>Weapons</div>
                        <div style={{ color: '#ff9999', fontSize: '10px', fontStyle: 'italic' }}>Forged in Battle</div>
                      </div>
                      <div style={{ 
                        textAlign: 'center',
                        padding: '12px',
                        background: 'rgba(52, 152, 219, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(52, 152, 219, 0.4)',
                        minWidth: '80px'
                      }}>
                        <div style={{ 
                          color: '#4fc3f7', 
                          fontWeight: 'bold', 
                          fontSize: '20px',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          🛡️ {badgeData.filter(b => b.type === 'armor').length}
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '4px' }}>Armor</div>
                        <div style={{ color: '#81d4fa', fontSize: '10px', fontStyle: 'italic' }}>Shield of Honor</div>
                      </div>
                      <div style={{ 
                        textAlign: 'center',
                        padding: '12px',
                        background: 'rgba(155, 89, 182, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(155, 89, 182, 0.4)',
                        minWidth: '80px'
                      }}>
                        <div style={{ 
                          color: '#ba68c8', 
                          fontWeight: 'bold', 
                          fontSize: '20px',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          💎 {badgeData.filter(b => b.type === 'jewelry').length}
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '4px' }}>Jewelry</div>
                        <div style={{ color: '#ce93d8', fontSize: '10px', fontStyle: 'italic' }}>Mystical Artifacts</div>
                      </div>
                      <div style={{ 
                        textAlign: 'center',
                        padding: '12px',
                        background: 'rgba(255, 215, 0, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 215, 0, 0.4)',
                        minWidth: '80px'
                      }}>
                        <div style={{ 
                          color: '#ffd700', 
                          fontWeight: 'bold', 
                          fontSize: '20px',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 10px rgba(255,215,0,0.5)',
                          animation: 'glow 2s infinite'
                        }}>
                          ⚡ {badgeData.reduce((sum, b) => sum + b.value, 0).toLocaleString()}
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '4px' }}>Total Power</div>
                        <div style={{ color: '#ffeb3b', fontSize: '10px', fontStyle: 'italic' }}>Legendary Might</div>
                      </div>
                    </div>
                    
                    {/* Power Level Indicator */}
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,215,0,0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#ffd700', fontSize: '12px', marginBottom: '4px' }}>
                        🏆 CHAMPION RANK: {
                          badgeData.reduce((sum, b) => sum + b.value, 0) > 5000 ? 'COSMIC OVERLORD' :
                          badgeData.reduce((sum, b) => sum + b.value, 0) > 2000 ? 'LEGENDARY MASTER' :
                          badgeData.reduce((sum, b) => sum + b.value, 0) > 1000 ? 'EPIC CHAMPION' :
                          badgeData.reduce((sum, b) => sum + b.value, 0) > 500 ? 'SKILLED WARRIOR' :
                          'ASPIRING HERO'
                        } 🏆
                      </div>
                      <div style={{ 
                        width: '100%', 
                        height: '8px', 
                        background: 'rgba(255,255,255,0.1)', 
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${Math.min(100, (badgeData.reduce((sum, b) => sum + b.value, 0) / 10000) * 100)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)',
                          borderRadius: '4px',
                          boxShadow: '0 0 10px rgba(255,255,255,0.5)',
                          animation: 'rainbow 3s linear infinite'
                        }} />
                      </div>
                    </div>
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

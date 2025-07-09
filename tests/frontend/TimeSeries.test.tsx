import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeSeries } from '../../components/TimeSeries'

global.fetch = vi.fn()
const mockFetch = global.fetch as any

const mockTimeSeriesData = [
  {
    date: '2024-01-01',
    total: 10,
    completed: 8,
    incomplete: 2,
    completion_pct: 80,
    with_due_date: 5,
    overdue: 1,
    due_today: 0,
    due_this_week: 2,
    compliance: {
      date: '2024-01-01',
      completed: 6,
      missed: 1,
      deferred: 0,
      total: 7,
      compliance_pct: 85.7
    }
  },
  {
    date: '2024-01-02',
    total: 12,
    completed: 10,
    incomplete: 2,
    completion_pct: 83.3,
    with_due_date: 6,
    overdue: 0,
    due_today: 1,
    due_this_week: 3,
    compliance: {
      date: '2024-01-02',
      completed: 7,
      missed: 0,
      deferred: 1,
      total: 8,
      compliance_pct: 87.5
    }
  }
]

const mockBadgeData = [
  {
    type: 'weapon',
    level: 'legendary',
    title: '⚔️ Dragonslayer Blade',
    description: 'Forged from 50+ consecutive days of daily victories',
    task_id: 'daily_exercise',
    value: 52
  },
  {
    type: 'armor',
    level: 'epic',
    title: '🛡️ Aegis of Consistency',
    description: 'Mystical shield that grows stronger with each completed challenge',
    task_id: null,
    value: 35
  }
]

describe('TimeSeries', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockTimeSeriesData,
    })
  })

  it('renders collapsed by default', () => {
    render(<TimeSeries />)
    
    expect(screen.getByText('📈 Time Series Analysis')).toBeInTheDocument()
    expect(screen.getByText('▼ Expand')).toBeInTheDocument()
    expect(screen.queryByText('Timeframe:')).not.toBeInTheDocument()
  })

  it('expands when clicked', async () => {
    const user = userEvent.setup()
    render(<TimeSeries />)
    
    const expandButton = screen.getByRole('button', { name: /time series analysis/i })
    await user.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('▲ Collapse')).toBeInTheDocument()
      expect(screen.getByText('Timeframe:')).toBeInTheDocument()
    })
  })

  it('fetches data when expanded', async () => {
    const user = userEvent.setup()
    render(<TimeSeries />)
    
    const expandButton = screen.getByRole('button', { name: /time series analysis/i })
    await user.click(expandButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/statistics/time-series')
      )
    })
  })

  it('displays timeframe options', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('7 days')).toBeInTheDocument()
      expect(screen.getByText('30 days')).toBeInTheDocument()
      expect(screen.getByText('90 days')).toBeInTheDocument()
      expect(screen.getByText('All time')).toBeInTheDocument()
    })
  })

  it('changes timeframe when option is selected', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('7 days')).toBeInTheDocument()
    })
    
    const sevenDaysButton = screen.getByRole('button', { name: '7 days' })
    await user.click(sevenDaysButton)
    
    // Should refetch data with new timeframe
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('days=7')
    )
  })

  it('displays chart type options', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('📊 Task Statistics')).toBeInTheDocument()
      expect(screen.getByText('✅ Overall Compliance')).toBeInTheDocument()
      expect(screen.getByText('🎯 Individual Task')).toBeInTheDocument()
      expect(screen.getByText('🌡️ Heatmap')).toBeInTheDocument()
      expect(screen.getByText('🏅 Badges')).toBeInTheDocument()
    })
  })

  it('switches between chart types', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('📊 Task Statistics')).toBeInTheDocument()
    })
    
    const badgesButton = screen.getByRole('button', { name: /badges/i })
    await user.click(badgesButton)
    
    // Should display badges content
    await waitFor(() => {
      // Assuming badges section has specific content
      expect(screen.getByText(/fantasy/i)).toBeInTheDocument()
    })
  })

  it('handles loading state', async () => {
    // Mock a slow response
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<TimeSeries isExpanded={true} />)
    
    expect(screen.getByText('Loading time series data...')).toBeInTheDocument()
  })

  it('handles API errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    render(<TimeSeries isExpanded={true} />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
    })
  })

  it('displays statistics chart correctly', async () => {
    render(<TimeSeries isExpanded={true} />)
    
    await waitFor(() => {
      // Check that chart canvas is rendered
      expect(screen.getByRole('img')).toBeInTheDocument() // Chart.js renders as img
    })
  })

  it('displays badge information in fantasy theme', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockBadgeData })
    })
    
    render(<TimeSeries isExpanded={true} />)
    
    const badgesButton = screen.getByRole('button', { name: /badges/i })
    await user.click(badgesButton)
    
    await waitFor(() => {
      expect(screen.getByText('⚔️ Dragonslayer Blade')).toBeInTheDocument()
      expect(screen.getByText('🛡️ Aegis of Consistency')).toBeInTheDocument()
    })
  })

  it('handles external expansion control', () => {
    const mockOnToggle = vi.fn()
    render(<TimeSeries isExpanded={true} onToggleExpanded={mockOnToggle} />)
    
    expect(screen.getByText('▲ Collapse')).toBeInTheDocument()
    expect(screen.getByText('Timeframe:')).toBeInTheDocument()
  })

  it('calls external toggle handler', async () => {
    const mockOnToggle = vi.fn()
    const user = userEvent.setup()
    
    render(<TimeSeries isExpanded={false} onToggleExpanded={mockOnToggle} />)
    
    const expandButton = screen.getByRole('button', { name: /time series analysis/i })
    await user.click(expandButton)
    
    expect(mockOnToggle).toHaveBeenCalledWith(true)
  })

  it('refreshes data when refresh trigger changes', async () => {
    const { rerender } = render(<TimeSeries isExpanded={true} refreshTrigger={1} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    
    rerender(<TimeSeries isExpanded={true} refreshTrigger={2} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  it('generates fallback data when API returns empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })
    
    render(<TimeSeries isExpanded={true} />)
    
    await waitFor(() => {
      // Should still render charts with fallback data
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  it('displays correlation analysis', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    const correlationButton = screen.getByRole('button', { name: /correlation/i })
    await user.click(correlationButton)
    
    await waitFor(() => {
      // Should display correlation content
      expect(screen.getByText(/correlation/i)).toBeInTheDocument()
    })
  })

  it('displays streak analysis', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    const streaksButton = screen.getByRole('button', { name: /streaks/i })
    await user.click(streaksButton)
    
    await waitFor(() => {
      // Should display streaks content
      expect(screen.getByText(/streak/i)).toBeInTheDocument()
    })
  })

  it('displays day of week analysis', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    const dayOfWeekButton = screen.getByRole('button', { name: /day of week/i })
    await user.click(dayOfWeekButton)
    
    await waitFor(() => {
      // Should display day of week analysis
      expect(screen.getByText(/day of week/i)).toBeInTheDocument()
    })
  })

  it('handles individual task selection', async () => {
    const user = userEvent.setup()
    render(<TimeSeries isExpanded={true} />)
    
    const individualTaskButton = screen.getByRole('button', { name: /individual task/i })
    await user.click(individualTaskButton)
    
    // Should show task selection UI
    await waitFor(() => {
      expect(screen.getByText(/individual/i)).toBeInTheDocument()
    })
  })
})

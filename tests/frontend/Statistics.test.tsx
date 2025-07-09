import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Statistics } from '../../components/Statistics'

global.fetch = vi.fn()
const mockFetch = global.fetch as any

const mockStatistics = {
  total: 150,
  completed: 120,
  incomplete: 30,
  completion_pct: 80.0,
  with_due_date: 75,
  overdue: 5,
  due_today: 8,
  due_this_week: 22,
  by_priority: {
    'Critical': 10,
    'High': 35,
    'Medium': 60,
    'Low': 45
  },
  by_area: {
    'Work': 80,
    'Personal': 40,
    'Home': 20,
    'Health': 10
  },
  by_status: {
    'active': 30,
    'completed': 120
  }
}

describe('Statistics Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatistics,
    })
  })

  it('renders statistics correctly', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument() // total
      expect(screen.getByText('120')).toBeInTheDocument() // completed
      expect(screen.getByText('30')).toBeInTheDocument() // incomplete
      expect(screen.getByText('80.0%')).toBeInTheDocument() // completion_pct
    })
  })

  it('displays due date statistics', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument() // with_due_date
      expect(screen.getByText('5')).toBeInTheDocument() // overdue
      expect(screen.getByText('8')).toBeInTheDocument() // due_today
      expect(screen.getByText('22')).toBeInTheDocument() // due_this_week
    })
  })

  it('shows priority breakdown', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('Critical: 10')).toBeInTheDocument()
      expect(screen.getByText('High: 35')).toBeInTheDocument()
      expect(screen.getByText('Medium: 60')).toBeInTheDocument()
      expect(screen.getByText('Low: 45')).toBeInTheDocument()
    })
  })

  it('shows area breakdown', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('Work: 80')).toBeInTheDocument()
      expect(screen.getByText('Personal: 40')).toBeInTheDocument()
      expect(screen.getByText('Home: 20')).toBeInTheDocument()
      expect(screen.getByText('Health: 10')).toBeInTheDocument()
    })
  })

  it('handles loading state', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<Statistics />)
    
    expect(screen.getByText('Loading statistics...')).toBeInTheDocument()
  })

  it('handles API errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading statistics/i)).toBeInTheDocument()
    })
  })

  it('refreshes data when refresh button is clicked', async () => {
    const user = userEvent.setup()
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('displays completion percentage with proper formatting', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      const completionElement = screen.getByText('80.0%')
      expect(completionElement).toBeInTheDocument()
      expect(completionElement).toHaveClass('completion-percentage')
    })
  })

  it('highlights overdue tasks', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      const overdueElement = screen.getByText('5')
      expect(overdueElement.closest('.overdue-highlight')).toBeInTheDocument()
    })
  })

  it('shows zero values correctly', async () => {
    const statsWithZeros = {
      ...mockStatistics,
      overdue: 0,
      due_today: 0
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => statsWithZeros,
    })
    
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument() // Should show 0 for overdue
    })
  })

  it('calculates percentages correctly', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      // Verify completion percentage calculation
      const completionPct = (120 / 150) * 100 // 80%
      expect(screen.getByText('80.0%')).toBeInTheDocument()
    })
  })

  it('handles empty statistics', async () => {
    const emptyStats = {
      total: 0,
      completed: 0,
      incomplete: 0,
      completion_pct: 0,
      with_due_date: 0,
      overdue: 0,
      due_today: 0,
      due_this_week: 0,
      by_priority: {},
      by_area: {},
      by_status: {}
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyStats,
    })
    
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('No tasks found')).toBeInTheDocument()
    })
  })

  it('formats large numbers correctly', async () => {
    const largeStats = {
      ...mockStatistics,
      total: 1500,
      completed: 1200
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => largeStats,
    })
    
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('1,500')).toBeInTheDocument()
      expect(screen.getByText('1,200')).toBeInTheDocument()
    })
  })

  it('shows trend indicators when available', async () => {
    const statsWithTrends = {
      ...mockStatistics,
      trends: {
        completion_trend: 5.2,
        task_creation_trend: -2.1
      }
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => statsWithTrends,
    })
    
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText('↗ 5.2%')).toBeInTheDocument() // Positive trend
      expect(screen.getByText('↘ 2.1%')).toBeInTheDocument() // Negative trend
    })
  })

  it('handles malformed API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 'data' }),
    })
    
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid data format/i)).toBeInTheDocument()
    })
  })

  it('updates automatically when props change', async () => {
    const { rerender } = render(<Statistics refreshTrigger={1} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    
    rerender(<Statistics refreshTrigger={2} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  it('displays statistics in correct sections', async () => {
    render(<Statistics />)
    
    await waitFor(() => {
      expect(screen.getByTestId('overview-section')).toBeInTheDocument()
      expect(screen.getByTestId('due-dates-section')).toBeInTheDocument()
      expect(screen.getByTestId('priority-breakdown')).toBeInTheDocument()
      expect(screen.getByTestId('area-breakdown')).toBeInTheDocument()
    })
  })
})

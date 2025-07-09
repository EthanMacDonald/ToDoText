import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskList } from '../../components/TaskList'

global.fetch = vi.fn()
const mockFetch = global.fetch as any

const mockTasks = [
  {
    id: 1,
    description: 'Test task 1',
    due_date: '2024-12-31',
    priority: 'High',
    area: 'Work',
    status: 'active',
    created: '2024-01-01',
    metadata: {}
  },
  {
    id: 2,
    description: 'Test task 2',
    due_date: '2024-12-25',
    priority: 'Medium',
    area: 'Personal',
    status: 'completed',
    created: '2024-01-02',
    metadata: {}
  },
  {
    id: 3,
    description: 'Test task 3',
    due_date: null,
    priority: 'Low',
    area: 'Home',
    status: 'active',
    created: '2024-01-03',
    metadata: {}
  }
]

describe('TaskList', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockTasks,
    })
  })

  it('renders task list correctly', async () => {
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
      expect(screen.getByText('Test task 2')).toBeInTheDocument()
      expect(screen.getByText('Test task 3')).toBeInTheDocument()
    })
  })

  it('displays task priorities correctly', async () => {
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })
  })

  it('shows due dates when available', async () => {
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('2024-12-31')).toBeInTheDocument()
      expect(screen.getByText('2024-12-25')).toBeInTheDocument()
    })
  })

  it('handles tasks without due dates', async () => {
    render(<TaskList />)
    
    await waitFor(() => {
      // Should render task 3 even without due date
      expect(screen.getByText('Test task 3')).toBeInTheDocument()
    })
  })

  it('filters tasks by status', async () => {
    const user = userEvent.setup()
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    // Assuming there's a filter for completed tasks
    const completedFilter = screen.getByRole('button', { name: /completed/i })
    await user.click(completedFilter)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 2')).toBeInTheDocument()
      expect(screen.queryByText('Test task 1')).not.toBeInTheDocument()
    })
  })

  it('sorts tasks by priority', async () => {
    const user = userEvent.setup()
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const sortButton = screen.getByRole('button', { name: /sort by priority/i })
    await user.click(sortButton)
    
    // Check that tasks are sorted (High, Medium, Low)
    const taskElements = screen.getAllByTestId('task-item')
    expect(taskElements[0]).toHaveTextContent('Test task 1') // High priority
  })

  it('sorts tasks by due date', async () => {
    const user = userEvent.setup()
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const sortButton = screen.getByRole('button', { name: /sort by due date/i })
    await user.click(sortButton)
    
    // Check that tasks with due dates come first
    const taskElements = screen.getAllByTestId('task-item')
    expect(taskElements[0]).toHaveTextContent('Test task 2') // Earlier due date
  })

  it('opens edit form when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const editButton = screen.getAllByRole('button', { name: /edit/i })[0]
    await user.click(editButton)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('deletes task when delete button is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Task deleted successfully' }),
    })
    
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0]
    await user.click(deleteButton)
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('marks task as completed', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Task updated successfully' }),
    })
    
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const completeButton = screen.getAllByRole('button', { name: /complete/i })[0]
    await user.click(completeButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/1'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('completed'),
        })
      )
    })
  })

  it('handles empty task list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })
    
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText(/no tasks found/i)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading tasks/i)).toBeInTheDocument()
    })
  })

  it('refreshes task list', async () => {
    const user = userEvent.setup()
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    expect(mockFetch).toHaveBeenCalledTimes(2) // Initial load + refresh
  })

  it('searches tasks by description', async () => {
    const user = userEvent.setup()
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText(/search tasks/i)
    await user.type(searchInput, 'task 1')
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
      expect(screen.queryByText('Test task 2')).not.toBeInTheDocument()
    })
  })

  it('filters tasks by area', async () => {
    const user = userEvent.setup()
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
    })
    
    const areaFilter = screen.getByLabelText(/filter by area/i)
    await user.selectOptions(areaFilter, 'Work')
    
    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument()
      expect(screen.queryByText('Test task 2')).not.toBeInTheDocument()
    })
  })

  it('displays task metadata when available', async () => {
    const taskWithMetadata = {
      ...mockTasks[0],
      metadata: { tags: ['urgent', 'important'] }
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [taskWithMetadata],
    })
    
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('urgent')).toBeInTheDocument()
      expect(screen.getByText('important')).toBeInTheDocument()
    })
  })

  it('handles pagination correctly', async () => {
    const user = userEvent.setup()
    const largeMockTasks = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      description: `Task ${i + 1}`,
      due_date: null,
      priority: 'Medium',
      area: 'Test',
      status: 'active',
      created: '2024-01-01',
      metadata: {}
    }))
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => largeMockTasks,
    })
    
    render(<TaskList />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Assuming pagination shows 10 items per page
    expect(screen.queryByText('Task 15')).not.toBeInTheDocument()
    
    const nextPageButton = screen.getByRole('button', { name: /next page/i })
    await user.click(nextPageButton)
    
    await waitFor(() => {
      expect(screen.getByText('Task 15')).toBeInTheDocument()
    })
  })
})

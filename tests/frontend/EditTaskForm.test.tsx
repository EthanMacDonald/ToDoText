import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditTaskForm } from '../../components/EditTaskForm'

global.fetch = vi.fn()
const mockFetch = global.fetch as any

const mockTask = {
  id: 1,
  description: 'Test task',
  due_date: '2024-12-31',
  priority: 'High',
  area: 'Work',
  project: 'Test Project',
  context: 'Office',
  status: 'active',
  created: '2024-01-01',
  metadata: {}
}

describe('EditTaskForm', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders with pre-filled task data', () => {
    render(<EditTaskForm task={mockTask} onSave={vi.fn()} onCancel={vi.fn()} />)
    
    expect(screen.getByDisplayValue('Test task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument()
    expect(screen.getByDisplayValue('High')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Work')).toBeInTheDocument()
  })

  it('calls onSave when form is submitted successfully', async () => {
    const mockOnSave = vi.fn()
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Task updated successfully' }),
    })

    render(<EditTaskForm task={mockTask} onSave={mockOnSave} onCancel={vi.fn()} />)
    
    await user.clear(screen.getByDisplayValue('Test task'))
    await user.type(screen.getByDisplayValue(''), 'Updated task')
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled()
    })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const mockOnCancel = vi.fn()
    const user = userEvent.setup()
    
    render(<EditTaskForm task={mockTask} onSave={vi.fn()} onCancel={mockOnCancel} />)
    
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('handles update errors gracefully', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<EditTaskForm task={mockTask} onSave={vi.fn()} onCancel={vi.fn()} />)
    
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/error updating task/i)).toBeInTheDocument()
    })
  })

  it('validates required fields during edit', async () => {
    const user = userEvent.setup()
    
    render(<EditTaskForm task={mockTask} onSave={vi.fn()} onCancel={vi.fn()} />)
    
    await user.clear(screen.getByDisplayValue('Test task'))
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(screen.getByText(/task description is required/i)).toBeInTheDocument()
  })

  it('preserves original data on cancel', async () => {
    const user = userEvent.setup()
    
    render(<EditTaskForm task={mockTask} onSave={vi.fn()} onCancel={vi.fn()} />)
    
    await user.clear(screen.getByDisplayValue('Test task'))
    await user.type(screen.getByDisplayValue(''), 'Modified task')
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    
    // After cancel, original data should be preserved
    expect(mockTask.description).toBe('Test task')
  })

  it('handles task with no due date', () => {
    const taskWithoutDueDate = { ...mockTask, due_date: null }
    
    render(<EditTaskForm task={taskWithoutDueDate} onSave={vi.fn()} onCancel={vi.fn()} />)
    
    const dueDateInput = screen.getByLabelText(/due date/i)
    expect(dueDateInput).toHaveValue('')
  })

  it('handles task with empty metadata', () => {
    const taskWithEmptyMetadata = { ...mockTask, metadata: {} }
    
    render(<EditTaskForm task={taskWithEmptyMetadata} onSave={vi.fn()} onCancel={vi.fn()} />)
    
    // Should render without errors
    expect(screen.getByDisplayValue('Test task')).toBeInTheDocument()
  })

  it('updates all task fields correctly', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Task updated successfully' }),
    })

    render(<EditTaskForm task={mockTask} onSave={vi.fn()} onCancel={vi.fn()} />)
    
    await user.clear(screen.getByDisplayValue('Test task'))
    await user.type(screen.getByDisplayValue(''), 'New description')
    await user.selectOptions(screen.getByDisplayValue('High'), 'Low')
    await user.clear(screen.getByDisplayValue('Work'))
    await user.type(screen.getByDisplayValue(''), 'Personal')
    
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/tasks/${mockTask.id}`),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('New description'),
        })
      )
    })
  })

  it('handles keyboard shortcuts', async () => {
    const mockOnSave = vi.fn()
    const mockOnCancel = vi.fn()
    const user = userEvent.setup()
    
    render(<EditTaskForm task={mockTask} onSave={mockOnSave} onCancel={mockOnCancel} />)
    
    // Test Escape key for cancel
    await user.keyboard('{Escape}')
    expect(mockOnCancel).toHaveBeenCalled()
  })
})

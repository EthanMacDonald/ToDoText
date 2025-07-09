import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateTaskForm } from '../../components/CreateTaskForm'

// Mock fetch globally
global.fetch = vi.fn()

const mockFetch = global.fetch as any

describe('CreateTaskForm', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form correctly', () => {
    render(<CreateTaskForm />)
    
    expect(screen.getByLabelText(/task description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/area/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/project/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/context/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<CreateTaskForm />)
    
    const submitButton = screen.getByRole('button', { name: /create task/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/task description is required/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, message: 'Task created successfully' }),
    })

    render(<CreateTaskForm />)
    
    await user.type(screen.getByLabelText(/task description/i), 'Test task')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'High')
    await user.type(screen.getByLabelText(/area/i), 'Work')
    
    await user.click(screen.getByRole('button', { name: /create task/i }))
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test task'),
        })
      )
    })
  })

  it('handles form submission errors', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<CreateTaskForm />)
    
    await user.type(screen.getByLabelText(/task description/i), 'Test task')
    await user.click(screen.getByRole('button', { name: /create task/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/error creating task/i)).toBeInTheDocument()
    })
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, message: 'Task created successfully' }),
    })

    render(<CreateTaskForm />)
    
    const taskInput = screen.getByLabelText(/task description/i)
    await user.type(taskInput, 'Test task')
    await user.click(screen.getByRole('button', { name: /create task/i }))
    
    await waitFor(() => {
      expect(taskInput).toHaveValue('')
    })
  })

  it('handles due date input correctly', async () => {
    const user = userEvent.setup()
    render(<CreateTaskForm />)
    
    const dueDateInput = screen.getByLabelText(/due date/i)
    await user.type(dueDateInput, '2024-12-31')
    
    expect(dueDateInput).toHaveValue('2024-12-31')
  })

  it('validates date format', async () => {
    const user = userEvent.setup()
    render(<CreateTaskForm />)
    
    const dueDateInput = screen.getByLabelText(/due date/i)
    await user.type(dueDateInput, 'invalid-date')
    
    // Assuming the form validates date format
    await user.click(screen.getByRole('button', { name: /create task/i }))
    
    expect(screen.getByText(/invalid date format/i)).toBeInTheDocument()
  })

  it('handles all priority levels', async () => {
    const user = userEvent.setup()
    render(<CreateTaskForm />)
    
    const prioritySelect = screen.getByLabelText(/priority/i)
    
    // Test each priority option
    const priorities = ['Low', 'Medium', 'High', 'Critical']
    for (const priority of priorities) {
      await user.selectOptions(prioritySelect, priority)
      expect(prioritySelect).toHaveValue(priority)
    }
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<CreateTaskForm />)
    
    // Tab through all form elements
    await user.tab()
    expect(screen.getByLabelText(/task description/i)).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText(/due date/i)).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText(/priority/i)).toHaveFocus()
  })

  it('handles special characters in task description', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, message: 'Task created successfully' }),
    })

    render(<CreateTaskForm />)
    
    const specialCharsTask = 'Task with @#$%^&*() characters'
    await user.type(screen.getByLabelText(/task description/i), specialCharsTask)
    await user.click(screen.getByRole('button', { name: /create task/i }))
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks'),
        expect.objectContaining({
          body: expect.stringContaining(specialCharsTask),
        })
      )
    })
  })
})

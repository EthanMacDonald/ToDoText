import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Filters } from '../../dashboard/frontend/src/components/Filters'

describe('Filters', () => {
  const mockOnFilterChange = vi.fn()
  
  beforeEach(() => {
    mockOnFilterChange.mockClear()
  })

  it('renders all filter options', () => {
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/area/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
  })

  it('calls onFilterChange when status filter changes', async () => {
    const user = userEvent.setup()
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    const statusFilter = screen.getByLabelText(/status/i)
    await user.selectOptions(statusFilter, 'completed')
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    )
  })

  it('calls onFilterChange when priority filter changes', async () => {
    const user = userEvent.setup()
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    const priorityFilter = screen.getByLabelText(/priority/i)
    await user.selectOptions(priorityFilter, 'High')
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'High' })
    )
  })

  it('calls onFilterChange when area filter changes', async () => {
    const user = userEvent.setup()
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    const areaFilter = screen.getByLabelText(/area/i)
    await user.type(areaFilter, 'Work')
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ area: 'Work' })
    )
  })

  it('calls onFilterChange when due date filter changes', async () => {
    const user = userEvent.setup()
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    const dueDateFilter = screen.getByLabelText(/due date/i)
    await user.selectOptions(dueDateFilter, 'overdue')
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: 'overdue' })
    )
  })

  it('resets all filters', async () => {
    const user = userEvent.setup()
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    // Set some filters first
    await user.selectOptions(screen.getByLabelText(/status/i), 'completed')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'High')
    
    const resetButton = screen.getByRole('button', { name: /reset/i })
    await user.click(resetButton)
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      status: 'all',
      priority: 'all',
      area: '',
      dueDate: 'all'
    })
  })

  it('shows active filter count', async () => {
    const user = userEvent.setup()
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    await user.selectOptions(screen.getByLabelText(/status/i), 'completed')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'High')
    
    expect(screen.getByText('2 filters active')).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<Filters onFilterChange={mockOnFilterChange} />)
    
    await user.tab()
    expect(screen.getByLabelText(/status/i)).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText(/priority/i)).toHaveFocus()
  })
})


describe('Goals', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('renders goals sections', async () => {
    const mockGoals = {
      '1y': ['Learn Python', 'Get promoted'],
      '5y': ['Start a business', 'Buy a house'],
      'life': ['Travel the world', 'Make a difference'],
      'semester': ['Complete coursework', 'Find internship']
    }
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGoals,
    })
    
    render(<Goals />)
    
    await waitFor(() => {
      expect(screen.getByText('1 Year Goals')).toBeInTheDocument()
      expect(screen.getByText('5 Year Goals')).toBeInTheDocument()
      expect(screen.getByText('Life Goals')).toBeInTheDocument()
      expect(screen.getByText('Semester Goals')).toBeInTheDocument()
    })
  })

  it('displays goals from each timeframe', async () => {
    const mockGoals = {
      '1y': ['Learn Python', 'Get promoted'],
      '5y': ['Start a business'],
      'life': ['Travel the world'],
      'semester': ['Complete coursework']
    }
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGoals,
    })
    
    render(<Goals />)
    
    await waitFor(() => {
      expect(screen.getByText('Learn Python')).toBeInTheDocument()
      expect(screen.getByText('Get promoted')).toBeInTheDocument()
      expect(screen.getByText('Start a business')).toBeInTheDocument()
      expect(screen.getByText('Travel the world')).toBeInTheDocument()
      expect(screen.getByText('Complete coursework')).toBeInTheDocument()
    })
  })

  it('handles empty goals', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    
    render(<Goals />)
    
    await waitFor(() => {
      expect(screen.getByText(/no goals/i)).toBeInTheDocument()
    })
  })

  it('handles API errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('API Error'))
    
    render(<Goals />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading goals/i)).toBeInTheDocument()
    })
  })

  it('allows adding new goals', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ '1y': [] }),
    })
    
    render(<Goals />)
    
    await waitFor(() => {
      expect(screen.getByText('1 Year Goals')).toBeInTheDocument()
    })
    
    const addButton = screen.getByRole('button', { name: /add goal/i })
    await user.click(addButton)
    
    expect(screen.getByPlaceholderText(/enter new goal/i)).toBeInTheDocument()
  })

  it('allows editing existing goals', async () => {
    const user = userEvent.setup()
    const mockGoals = { '1y': ['Learn Python'] }
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGoals,
    })
    
    render(<Goals />)
    
    await waitFor(() => {
      expect(screen.getByText('Learn Python')).toBeInTheDocument()
    })
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    
    expect(screen.getByDisplayValue('Learn Python')).toBeInTheDocument()
  })
})


describe('Lists', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('renders list categories', async () => {
    const mockLists = {
      grocery: ['Milk', 'Bread', 'Eggs'],
      packing: ['Clothes', 'Toiletries', 'Documents'],
      home_maintenance: ['Fix sink', 'Paint walls']
    }
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLists,
    })
    
    render(<Lists />)
    
    await waitFor(() => {
      expect(screen.getByText('Grocery List')).toBeInTheDocument()
      expect(screen.getByText('Packing List')).toBeInTheDocument()
      expect(screen.getByText('Home Maintenance')).toBeInTheDocument()
    })
  })

  it('displays list items', async () => {
    const mockLists = {
      grocery: ['Milk', 'Bread', 'Eggs']
    }
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLists,
    })
    
    render(<Lists />)
    
    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
      expect(screen.getByText('Bread')).toBeInTheDocument()
      expect(screen.getByText('Eggs')).toBeInTheDocument()
    })
  })

  it('allows adding items to lists', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ grocery: [] }),
    })
    
    render(<Lists />)
    
    await waitFor(() => {
      expect(screen.getByText('Grocery List')).toBeInTheDocument()
    })
    
    const addInput = screen.getByPlaceholderText(/add item/i)
    await user.type(addInput, 'Apples')
    await user.keyboard('{Enter}')
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/lists'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Apples'),
      })
    )
  })

  it('allows removing items from lists', async () => {
    const user = userEvent.setup()
    const mockLists = { grocery: ['Milk'] }
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLists,
    })
    
    render(<Lists />)
    
    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })
    
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/lists'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('handles empty lists', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    
    render(<Lists />)
    
    await waitFor(() => {
      expect(screen.getByText(/no lists available/i)).toBeInTheDocument()
    })
  })
})

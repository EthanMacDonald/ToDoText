import { describe, it, expect } from 'vitest'

// Utility functions tests
describe('Date Utilities', () => {
  // Mock date utility functions
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString()
  }
  
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }
  
  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
  
  const isThisWeek = (date: string) => {
    const taskDate = new Date(date)
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const weekEnd = new Date(now.setDate(weekStart.getDate() + 7))
    return taskDate >= weekStart && taskDate <= weekEnd
  }

  it('formats dates correctly', () => {
    expect(formatDate('2024-12-31')).toBe('12/31/2024')
    expect(formatDate('2024-01-01')).toBe('1/1/2024')
  })

  it('detects overdue tasks', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    expect(isOverdue(yesterday.toISOString().split('T')[0])).toBe(true)
    expect(isOverdue(tomorrow.toISOString().split('T')[0])).toBe(false)
    expect(isOverdue(null)).toBe(false)
  })

  it('calculates days until due correctly', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    expect(getDaysUntilDue(tomorrow.toISOString().split('T')[0])).toBe(1)
    expect(getDaysUntilDue(nextWeek.toISOString().split('T')[0])).toBe(7)
  })

  it('identifies tasks due this week', () => {
    const today = new Date().toISOString().split('T')[0]
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    expect(isThisWeek(today)).toBe(true)
    expect(isThisWeek(nextMonth.toISOString().split('T')[0])).toBe(false)
  })

  it('handles invalid dates gracefully', () => {
    expect(() => formatDate('invalid-date')).not.toThrow()
    expect(isOverdue('invalid-date')).toBe(false)
  })
})

describe('Task Utilities', () => {
  const getPriorityValue = (priority: string) => {
    const values = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
    return values[priority] || 0
  }
  
  const sortTasksByPriority = (tasks: Array<{priority: string}>) => {
    return tasks.sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority))
  }
  
  const filterTasksByStatus = (tasks: Array<{status: string}>, status: string) => {
    return tasks.filter(task => task.status === status)
  }
  
  const searchTasks = (tasks: Array<{description: string}>, query: string) => {
    return tasks.filter(task => 
      task.description.toLowerCase().includes(query.toLowerCase())
    )
  }

  const mockTasks = [
    { id: 1, description: 'High priority task', priority: 'High', status: 'active' },
    { id: 2, description: 'Low priority task', priority: 'Low', status: 'completed' },
    { id: 3, description: 'Critical task', priority: 'Critical', status: 'active' },
    { id: 4, description: 'Medium priority task', priority: 'Medium', status: 'active' }
  ]

  it('gets correct priority values', () => {
    expect(getPriorityValue('Critical')).toBe(4)
    expect(getPriorityValue('High')).toBe(3)
    expect(getPriorityValue('Medium')).toBe(2)
    expect(getPriorityValue('Low')).toBe(1)
    expect(getPriorityValue('Unknown')).toBe(0)
  })

  it('sorts tasks by priority correctly', () => {
    const sorted = sortTasksByPriority([...mockTasks])
    expect(sorted[0].priority).toBe('Critical')
    expect(sorted[1].priority).toBe('High')
    expect(sorted[2].priority).toBe('Medium')
    expect(sorted[3].priority).toBe('Low')
  })

  it('filters tasks by status', () => {
    const activeTasks = filterTasksByStatus(mockTasks, 'active')
    const completedTasks = filterTasksByStatus(mockTasks, 'completed')
    
    expect(activeTasks).toHaveLength(3)
    expect(completedTasks).toHaveLength(1)
    expect(completedTasks[0].id).toBe(2)
  })

  it('searches tasks by description', () => {
    const results = searchTasks(mockTasks, 'high')
    expect(results).toHaveLength(1)
    expect(results[0].description).toBe('High priority task')
    
    const noResults = searchTasks(mockTasks, 'nonexistent')
    expect(noResults).toHaveLength(0)
  })

  it('search is case insensitive', () => {
    const results = searchTasks(mockTasks, 'HIGH')
    expect(results).toHaveLength(1)
    expect(results[0].description).toBe('High priority task')
  })

  it('handles empty arrays', () => {
    expect(sortTasksByPriority([])).toEqual([])
    expect(filterTasksByStatus([], 'active')).toEqual([])
    expect(searchTasks([], 'query')).toEqual([])
  })
})

describe('Validation Utilities', () => {
  const validateTask = (task: any) => {
    const errors: string[] = []
    
    if (!task.description || task.description.trim() === '') {
      errors.push('Task description is required')
    }
    
    if (task.description && task.description.length > 500) {
      errors.push('Task description too long')
    }
    
    if (task.due_date && !isValidDate(task.due_date)) {
      errors.push('Invalid due date format')
    }
    
    if (task.priority && !['Critical', 'High', 'Medium', 'Low'].includes(task.priority)) {
      errors.push('Invalid priority level')
    }
    
    return errors
  }
  
  const isValidDate = (dateString: string) => {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }
  
  const sanitizeInput = (input: string) => {
    return input.trim().replace(/[<>]/g, '')
  }

  it('validates task description', () => {
    const validTask = { description: 'Valid task', priority: 'Medium' }
    const emptyTask = { description: '', priority: 'Medium' }
    const longTask = { description: 'A'.repeat(501), priority: 'Medium' }
    
    expect(validateTask(validTask)).toEqual([])
    expect(validateTask(emptyTask)).toContain('Task description is required')
    expect(validateTask(longTask)).toContain('Task description too long')
  })

  it('validates due dates', () => {
    const validDateTask = { description: 'Task', due_date: '2024-12-31' }
    const invalidDateTask = { description: 'Task', due_date: 'invalid-date' }
    
    expect(validateTask(validDateTask)).toEqual([])
    expect(validateTask(invalidDateTask)).toContain('Invalid due date format')
  })

  it('validates priority levels', () => {
    const validPriorityTask = { description: 'Task', priority: 'High' }
    const invalidPriorityTask = { description: 'Task', priority: 'Invalid' }
    
    expect(validateTask(validPriorityTask)).toEqual([])
    expect(validateTask(invalidPriorityTask)).toContain('Invalid priority level')
  })

  it('identifies valid dates', () => {
    expect(isValidDate('2024-12-31')).toBe(true)
    expect(isValidDate('2024-02-29')).toBe(true) // leap year
    expect(isValidDate('invalid-date')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })

  it('sanitizes user input', () => {
    expect(sanitizeInput('  normal text  ')).toBe('normal text')
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
    expect(sanitizeInput('text with > and < chars')).toBe('text with  and  chars')
  })

  it('handles multiple validation errors', () => {
    const invalidTask = {
      description: '',
      due_date: 'invalid',
      priority: 'InvalidPriority'
    }
    
    const errors = validateTask(invalidTask)
    expect(errors).toHaveLength(3)
    expect(errors).toContain('Task description is required')
    expect(errors).toContain('Invalid due date format')
    expect(errors).toContain('Invalid priority level')
  })
})

describe('API Utilities', () => {
  const buildApiUrl = (endpoint: string, params?: Record<string, any>) => {
    const baseUrl = 'http://localhost:8000'
    let url = `${baseUrl}${endpoint}`
    
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
    
    return url
  }
  
  const handleApiError = (error: any) => {
    if (error.name === 'NetworkError') {
      return 'Network connection failed'
    }
    if (error.status === 404) {
      return 'Resource not found'
    }
    if (error.status === 500) {
      return 'Server error occurred'
    }
    return 'An unexpected error occurred'
  }

  it('builds API URLs correctly', () => {
    expect(buildApiUrl('/tasks')).toBe('http://localhost:8000/tasks')
    expect(buildApiUrl('/tasks', { page: 1, limit: 10 }))
      .toBe('http://localhost:8000/tasks?page=1&limit=10')
  })

  it('handles null and undefined parameters', () => {
    const url = buildApiUrl('/tasks', { page: 1, filter: null, search: undefined })
    expect(url).toBe('http://localhost:8000/tasks?page=1')
  })

  it('handles API errors appropriately', () => {
    expect(handleApiError({ name: 'NetworkError' }))
      .toBe('Network connection failed')
    expect(handleApiError({ status: 404 }))
      .toBe('Resource not found')
    expect(handleApiError({ status: 500 }))
      .toBe('Server error occurred')
    expect(handleApiError({ status: 400 }))
      .toBe('An unexpected error occurred')
  })

  it('encodes URL parameters correctly', () => {
    const url = buildApiUrl('/search', { q: 'hello world', special: 'a&b=c' })
    expect(url).toContain('q=hello+world')
    expect(url).toContain('special=a%26b%3Dc')
  })
})

describe('Chart Utilities', () => {
  const generateChartColors = (count: number) => {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ]
    return Array.from({ length: count }, (_, i) => colors[i % colors.length])
  }
  
  const formatChartData = (data: Array<{date: string, value: number}>) => {
    return {
      labels: data.map(d => d.date),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: generateChartColors(data.length)
      }]
    }
  }
  
  const calculateMovingAverage = (data: number[], window: number) => {
    return data.map((_, index) => {
      if (index < window - 1) return null
      const slice = data.slice(index - window + 1, index + 1)
      return slice.reduce((sum, val) => sum + val, 0) / window
    })
  }

  it('generates correct number of colors', () => {
    expect(generateChartColors(3)).toHaveLength(3)
    expect(generateChartColors(10)).toHaveLength(10)
  })

  it('reuses colors when needed', () => {
    const colors = generateChartColors(10)
    expect(colors[0]).toBe(colors[8]) // Should wrap around
  })

  it('formats chart data correctly', () => {
    const data = [
      { date: '2024-01-01', value: 10 },
      { date: '2024-01-02', value: 20 }
    ]
    
    const formatted = formatChartData(data)
    expect(formatted.labels).toEqual(['2024-01-01', '2024-01-02'])
    expect(formatted.datasets[0].data).toEqual([10, 20])
  })

  it('calculates moving average correctly', () => {
    const data = [1, 2, 3, 4, 5]
    const movingAvg = calculateMovingAverage(data, 3)
    
    expect(movingAvg[0]).toBe(null)
    expect(movingAvg[1]).toBe(null)
    expect(movingAvg[2]).toBe(2) // (1+2+3)/3
    expect(movingAvg[3]).toBe(3) // (2+3+4)/3
    expect(movingAvg[4]).toBe(4) // (3+4+5)/3
  })

  it('handles empty data arrays', () => {
    expect(formatChartData([])).toEqual({
      labels: [],
      datasets: [{ data: [], backgroundColor: [] }]
    })
    expect(calculateMovingAverage([], 3)).toEqual([])
  })
})

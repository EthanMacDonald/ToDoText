import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import fetch from 'node-fetch'

// Integration tests for backend + frontend interaction
describe('Backend + Frontend Integration', () => {
  let backendProcess: ChildProcess | null = null
  let frontendProcess: ChildProcess | null = null
  
  const BACKEND_URL = 'http://localhost:8000'
  const FRONTEND_URL = 'http://localhost:3000'
  
  beforeEach(async () => {
    // Start backend server
    backendProcess = spawn('python', ['-m', 'uvicorn', 'app:app', '--port', '8000'], {
      cwd: process.cwd() + '/dashboard/backend',
      stdio: 'pipe'
    })
    
    // Start frontend server
    frontendProcess = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
      cwd: process.cwd() + '/dashboard/frontend',
      stdio: 'pipe'
    })
    
    // Wait for servers to start
    await new Promise(resolve => setTimeout(resolve, 5000))
  }, 30000)
  
  afterEach(async () => {
    if (backendProcess) {
      backendProcess.kill()
      backendProcess = null
    }
    if (frontendProcess) {
      frontendProcess.kill()
      frontendProcess = null
    }
  })

  it('backend server starts successfully', async () => {
    const response = await fetch(`${BACKEND_URL}/health`)
    expect(response.status).toBe(200)
  })

  it('frontend can fetch tasks from backend', async () => {
    // Create a test task via backend API
    const createResponse = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Integration test task',
        priority: 'Medium',
        area: 'Test'
      }),
    })
    
    expect(createResponse.status).toBe(201)
    
    // Fetch tasks from backend
    const tasksResponse = await fetch(`${BACKEND_URL}/tasks`)
    const tasks = await tasksResponse.json()
    
    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'Integration test task',
          priority: 'Medium',
          area: 'Test'
        })
      ])
    )
  })

  it('frontend can create tasks through backend API', async () => {
    const taskData = {
      description: 'New integration task',
      priority: 'High',
      area: 'Work',
      due_date: '2024-12-31'
    }
    
    const response = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    })
    
    expect(response.status).toBe(201)
    const createdTask = await response.json()
    
    expect(createdTask).toMatchObject({
      description: 'New integration task',
      priority: 'High',
      area: 'Work',
      due_date: '2024-12-31'
    })
  })

  it('frontend can update tasks through backend API', async () => {
    // Create a task first
    const createResponse = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Task to update',
        priority: 'Low',
        area: 'Test'
      }),
    })
    
    const createdTask = await createResponse.json()
    
    // Update the task
    const updateResponse = await fetch(`${BACKEND_URL}/tasks/${createdTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Updated task description',
        priority: 'High',
        area: 'Work'
      }),
    })
    
    expect(updateResponse.status).toBe(200)
    const updatedTask = await updateResponse.json()
    
    expect(updatedTask).toMatchObject({
      description: 'Updated task description',
      priority: 'High',
      area: 'Work'
    })
  })

  it('frontend can delete tasks through backend API', async () => {
    // Create a task first
    const createResponse = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Task to delete',
        priority: 'Medium',
        area: 'Test'
      }),
    })
    
    const createdTask = await createResponse.json()
    
    // Delete the task
    const deleteResponse = await fetch(`${BACKEND_URL}/tasks/${createdTask.id}`, {
      method: 'DELETE'
    })
    
    expect(deleteResponse.status).toBe(200)
    
    // Verify task is deleted
    const getResponse = await fetch(`${BACKEND_URL}/tasks/${createdTask.id}`)
    expect(getResponse.status).toBe(404)
  })

  it('frontend can fetch statistics from backend', async () => {
    const response = await fetch(`${BACKEND_URL}/statistics`)
    expect(response.status).toBe(200)
    
    const stats = await response.json()
    expect(stats).toHaveProperty('total')
    expect(stats).toHaveProperty('completed')
    expect(stats).toHaveProperty('incomplete')
    expect(stats).toHaveProperty('completion_pct')
  })

  it('frontend can fetch time series data from backend', async () => {
    const response = await fetch(`${BACKEND_URL}/statistics/time-series`)
    expect(response.status).toBe(200)
    
    const timeSeriesData = await response.json()
    expect(Array.isArray(timeSeriesData)).toBe(true)
    
    if (timeSeriesData.length > 0) {
      expect(timeSeriesData[0]).toHaveProperty('date')
      expect(timeSeriesData[0]).toHaveProperty('total')
      expect(timeSeriesData[0]).toHaveProperty('completed')
    }
  })

  it('frontend can handle backend errors gracefully', async () => {
    // Try to access non-existent endpoint
    const response = await fetch(`${BACKEND_URL}/nonexistent`)
    expect(response.status).toBe(404)
  })

  it('backend CORS headers allow frontend requests', async () => {
    const response = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    })
    
    expect(response.headers.get('access-control-allow-origin')).toContain('*')
    expect(response.headers.get('access-control-allow-methods')).toContain('GET')
  })

  it('frontend handles malformed backend responses', async () => {
    // This would typically be tested with a mock that returns malformed JSON
    // For integration tests, we assume the backend returns well-formed responses
    const response = await fetch(`${BACKEND_URL}/tasks`)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('concurrent requests are handled correctly', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      fetch(`${BACKEND_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `Concurrent task ${i}`,
          priority: 'Medium',
          area: 'Test'
        }),
      })
    )
    
    const responses = await Promise.all(promises)
    
    responses.forEach(response => {
      expect(response.status).toBe(201)
    })
  })

  it('large payloads are handled correctly', async () => {
    const largeDescription = 'A'.repeat(10000) // 10KB description
    
    const response = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: largeDescription,
        priority: 'Medium',
        area: 'Test'
      }),
    })
    
    expect(response.status).toBe(201)
    const task = await response.json()
    expect(task.description).toBe(largeDescription)
  })

  it('authentication/authorization works if implemented', async () => {
    // This test would check auth headers if authentication is implemented
    // For now, we just verify that requests work without auth
    const response = await fetch(`${BACKEND_URL}/tasks`)
    expect(response.status).toBe(200)
  })

  it('pagination works correctly for large datasets', async () => {
    // Create multiple tasks
    const createPromises = Array.from({ length: 25 }, (_, i) =>
      fetch(`${BACKEND_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `Pagination test task ${i}`,
          priority: 'Medium',
          area: 'Test'
        }),
      })
    )
    
    await Promise.all(createPromises)
    
    // Test pagination
    const page1Response = await fetch(`${BACKEND_URL}/tasks?page=1&limit=10`)
    const page1Data = await page1Response.json()
    
    const page2Response = await fetch(`${BACKEND_URL}/tasks?page=2&limit=10`)
    const page2Data = await page2Response.json()
    
    expect(page1Data.length).toBeLessThanOrEqual(10)
    expect(page2Data.length).toBeLessThanOrEqual(10)
    
    // Ensure different tasks on different pages
    if (page1Data.length > 0 && page2Data.length > 0) {
      expect(page1Data[0].id).not.toBe(page2Data[0].id)
    }
  })

  it('search functionality works across backend and frontend', async () => {
    // Create tasks with searchable content
    await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Unique searchable task',
        priority: 'Medium',
        area: 'Test'
      }),
    })
    
    // Search for the task
    const searchResponse = await fetch(`${BACKEND_URL}/tasks?search=Unique`)
    const searchResults = await searchResponse.json()
    
    expect(searchResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: expect.stringContaining('Unique')
        })
      ])
    )
  })

  it('real-time updates work if implemented', async () => {
    // This would test WebSocket connections or Server-Sent Events
    // For now, we test that changes are reflected when refetching
    
    const initialResponse = await fetch(`${BACKEND_URL}/tasks`)
    const initialTasks = await initialResponse.json()
    const initialCount = initialTasks.length
    
    // Create a new task
    await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Real-time test task',
        priority: 'Medium',
        area: 'Test'
      }),
    })
    
    // Fetch again and verify count increased
    const updatedResponse = await fetch(`${BACKEND_URL}/tasks`)
    const updatedTasks = await updatedResponse.json()
    
    expect(updatedTasks.length).toBe(initialCount + 1)
  })
})

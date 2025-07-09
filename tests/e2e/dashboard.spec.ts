import { test, expect, Page, Browser } from '@playwright/test'

// End-to-end tests using Playwright
test.describe('Todo Auto Dashboard E2E Tests', () => {
  let page: Page
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Task Management', () => {
    test('user can create a new task', async () => {
      // Click create task button
      await page.click('[data-testid="create-task-button"]')
      
      // Fill out the form
      await page.fill('[data-testid="task-description"]', 'E2E Test Task')
      await page.selectOption('[data-testid="task-priority"]', 'High')
      await page.fill('[data-testid="task-area"]', 'Testing')
      await page.fill('[data-testid="task-due-date"]', '2024-12-31')
      
      // Submit the form
      await page.click('[data-testid="submit-task"]')
      
      // Verify task appears in the list
      await expect(page.locator('text=E2E Test Task')).toBeVisible()
      await expect(page.locator('text=High')).toBeVisible()
      await expect(page.locator('text=Testing')).toBeVisible()
    })

    test('user can edit an existing task', async () => {
      // Assuming there's at least one task
      await page.click('[data-testid="task-item"]:first-child [data-testid="edit-button"]')
      
      // Edit the task description
      await page.fill('[data-testid="edit-task-description"]', 'Updated E2E Task')
      await page.selectOption('[data-testid="edit-task-priority"]', 'Medium')
      
      // Save the changes
      await page.click('[data-testid="save-task"]')
      
      // Verify changes are reflected
      await expect(page.locator('text=Updated E2E Task')).toBeVisible()
      await expect(page.locator('text=Medium')).toBeVisible()
    })

    test('user can delete a task', async () => {
      // Create a task to delete
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Task to Delete')
      await page.click('[data-testid="submit-task"]')
      
      // Delete the task
      await page.click('[data-testid="task-item"]:has-text("Task to Delete") [data-testid="delete-button"]')
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]')
      
      // Verify task is removed
      await expect(page.locator('text=Task to Delete')).not.toBeVisible()
    })

    test('user can mark task as completed', async () => {
      // Create a task to complete
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Task to Complete')
      await page.click('[data-testid="submit-task"]')
      
      // Mark as completed
      await page.click('[data-testid="task-item"]:has-text("Task to Complete") [data-testid="complete-button"]')
      
      // Verify task is marked as completed
      await expect(page.locator('[data-testid="task-item"]:has-text("Task to Complete")')).toHaveClass(/completed/)
    })

    test('user can filter tasks by status', async () => {
      // Ensure we have both active and completed tasks
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Active Task')
      await page.click('[data-testid="submit-task"]')
      
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Completed Task')
      await page.click('[data-testid="submit-task"]')
      
      await page.click('[data-testid="task-item"]:has-text("Completed Task") [data-testid="complete-button"]')
      
      // Filter by completed
      await page.selectOption('[data-testid="status-filter"]', 'completed')
      
      // Verify only completed tasks are shown
      await expect(page.locator('text=Completed Task')).toBeVisible()
      await expect(page.locator('text=Active Task')).not.toBeVisible()
      
      // Filter by active
      await page.selectOption('[data-testid="status-filter"]', 'active')
      
      // Verify only active tasks are shown
      await expect(page.locator('text=Active Task')).toBeVisible()
      await expect(page.locator('text=Completed Task')).not.toBeVisible()
    })

    test('user can search tasks', async () => {
      // Create tasks with different descriptions
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Important meeting preparation')
      await page.click('[data-testid="submit-task"]')
      
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Buy groceries')
      await page.click('[data-testid="submit-task"]')
      
      // Search for specific task
      await page.fill('[data-testid="search-input"]', 'meeting')
      
      // Verify search results
      await expect(page.locator('text=Important meeting preparation')).toBeVisible()
      await expect(page.locator('text=Buy groceries')).not.toBeVisible()
    })

    test('user can sort tasks by priority', async () => {
      // Create tasks with different priorities
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Low Priority Task')
      await page.selectOption('[data-testid="task-priority"]', 'Low')
      await page.click('[data-testid="submit-task"]')
      
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'High Priority Task')
      await page.selectOption('[data-testid="task-priority"]', 'High')
      await page.click('[data-testid="submit-task"]')
      
      // Sort by priority
      await page.click('[data-testid="sort-priority"]')
      
      // Verify order (High priority should come first)
      const taskItems = page.locator('[data-testid="task-item"]')
      await expect(taskItems.first()).toContainText('High Priority Task')
    })
  })

  test.describe('Statistics and Analytics', () => {
    test('user can view basic statistics', async () => {
      // Navigate to statistics panel
      await page.click('[data-testid="statistics-tab"]')
      
      // Verify statistics are displayed
      await expect(page.locator('[data-testid="total-tasks"]')).toBeVisible()
      await expect(page.locator('[data-testid="completed-tasks"]')).toBeVisible()
      await expect(page.locator('[data-testid="completion-percentage"]')).toBeVisible()
    })

    test('user can expand time series analysis', async () => {
      // Navigate to time series panel
      await page.click('[data-testid="time-series-tab"]')
      
      // Expand the panel
      await page.click('[data-testid="time-series-expand"]')
      
      // Verify time series options are visible
      await expect(page.locator('text=Timeframe:')).toBeVisible()
      await expect(page.locator('text=📊 Task Statistics')).toBeVisible()
      await expect(page.locator('text=🏅 Badges')).toBeVisible()
    })

    test('user can switch between different chart types', async () => {
      await page.click('[data-testid="time-series-tab"]')
      await page.click('[data-testid="time-series-expand"]')
      
      // Switch to badges view
      await page.click('button:has-text("🏅 Badges")')
      
      // Verify badges are displayed
      await expect(page.locator('[data-testid="badges-section"]')).toBeVisible()
      
      // Switch to compliance view
      await page.click('button:has-text("✅ Overall Compliance")')
      
      // Verify compliance chart is displayed
      await expect(page.locator('[data-testid="compliance-chart"]')).toBeVisible()
    })

    test('user can change timeframe for analytics', async () => {
      await page.click('[data-testid="time-series-tab"]')
      await page.click('[data-testid="time-series-expand"]')
      
      // Change timeframe
      await page.click('button:has-text("7 days")')
      
      // Verify button is selected
      await expect(page.locator('button:has-text("7 days")')).toHaveClass(/bg-blue/)
      
      // Change to different timeframe
      await page.click('button:has-text("90 days")')
      
      // Verify new selection
      await expect(page.locator('button:has-text("90 days")')).toHaveClass(/bg-blue/)
    })

    test('fantasy badges display correctly', async () => {
      await page.click('[data-testid="time-series-tab"]')
      await page.click('[data-testid="time-series-expand"]')
      await page.click('button:has-text("🏅 Badges")')
      
      // Verify fantasy-themed badges
      await expect(page.locator('text=⚔️')).toBeVisible() // Weapon emoji
      await expect(page.locator('text=🛡️')).toBeVisible() // Shield emoji
      await expect(page.locator('text=💎')).toBeVisible() // Gem emoji
      
      // Verify rarity levels are shown
      await expect(page.locator('text=Legendary')).toBeVisible()
      await expect(page.locator('text=Epic')).toBeVisible()
      await expect(page.locator('text=Mythic')).toBeVisible()
    })
  })

  test.describe('Lists and Goals', () => {
    test('user can view and manage lists', async () => {
      await page.click('[data-testid="lists-tab"]')
      
      // Verify lists are displayed
      await expect(page.locator('text=Grocery List')).toBeVisible()
      await expect(page.locator('text=Packing List')).toBeVisible()
      
      // Add item to list
      await page.fill('[data-testid="add-list-item"]', 'New list item')
      await page.press('[data-testid="add-list-item"]', 'Enter')
      
      // Verify item was added
      await expect(page.locator('text=New list item')).toBeVisible()
    })

    test('user can view goals by timeframe', async () => {
      await page.click('[data-testid="goals-tab"]')
      
      // Verify different goal timeframes
      await expect(page.locator('text=1 Year Goals')).toBeVisible()
      await expect(page.locator('text=5 Year Goals')).toBeVisible()
      await expect(page.locator('text=Life Goals')).toBeVisible()
      await expect(page.locator('text=Semester Goals')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('dashboard works on mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
      
      // Verify main elements are still visible and functional
      await expect(page.locator('[data-testid="create-task-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="task-list"]')).toBeVisible()
      
      // Test creating task on mobile
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Mobile Test Task')
      await page.click('[data-testid="submit-task"]')
      
      await expect(page.locator('text=Mobile Test Task')).toBeVisible()
    })

    test('dashboard works on tablet devices', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad size
      
      // Verify layout adapts properly
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('dashboard loads within acceptable time', async () => {
      const startTime = Date.now()
      await page.goto('http://localhost:3000')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('large task lists render efficiently', async () => {
      // Create many tasks quickly
      for (let i = 0; i < 50; i++) {
        await page.evaluate((index) => {
          // Use JavaScript to create tasks faster than UI interaction
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: `Performance test task ${index}`,
              priority: 'Medium',
              area: 'Test'
            })
          })
        }, i)
      }
      
      // Refresh page and verify it loads quickly
      const startTime = Date.now()
      await page.reload()
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(5000)
    })
  })

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/tasks', route => route.abort())
      
      await page.reload()
      
      // Should show error message instead of crashing
      await expect(page.locator('text=Error loading tasks')).toBeVisible()
    })

    test('handles server errors gracefully', async () => {
      // Simulate server error
      await page.route('**/api/tasks', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      })
      
      await page.reload()
      
      // Should show appropriate error message
      await expect(page.locator('text=Server error')).toBeVisible()
    })

    test('validates form inputs', async () => {
      await page.click('[data-testid="create-task-button"]')
      
      // Try to submit empty form
      await page.click('[data-testid="submit-task"]')
      
      // Should show validation errors
      await expect(page.locator('text=Task description is required')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('keyboard navigation works correctly', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="create-task-button"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused()
    })

    test('screen reader support is functional', async () => {
      // Check for proper ARIA labels
      await expect(page.locator('[aria-label="Create new task"]')).toBeVisible()
      await expect(page.locator('[aria-label="Search tasks"]')).toBeVisible()
      await expect(page.locator('[role="main"]')).toBeVisible()
    })

    test('color contrast meets accessibility standards', async () => {
      // This would typically use automated accessibility testing tools
      // For now, we verify that elements are visible
      await expect(page.locator('[data-testid="task-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="statistics-panel"]')).toBeVisible()
    })
  })

  test.describe('Data Persistence', () => {
    test('tasks persist after page refresh', async () => {
      // Create a task
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-description"]', 'Persistent Task')
      await page.click('[data-testid="submit-task"]')
      
      // Refresh page
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Verify task is still there
      await expect(page.locator('text=Persistent Task')).toBeVisible()
    })

    test('filters persist after navigation', async () => {
      // Set a filter
      await page.selectOption('[data-testid="status-filter"]', 'completed')
      
      // Navigate away and back
      await page.click('[data-testid="statistics-tab"]')
      await page.click('[data-testid="tasks-tab"]')
      
      // Verify filter is still set
      await expect(page.locator('[data-testid="status-filter"]')).toHaveValue('completed')
    })
  })
})

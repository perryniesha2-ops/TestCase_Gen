// lib/test-execution.ts
// Client-side functions for updating test execution status

export interface TestExecutionUpdate {
  testCaseId: string
  testTable: 'test_cases' | 'platform_test_cases'
  status: 'not_run' | 'pass' | 'fail' | 'skip' | 'blocked'
  notes?: string
  executionTime?: number
}

export interface TestExecutionResponse {
  success: boolean
  message?: string
  error?: string
  data?: {
    testCaseId: string
    status: string
    executedAt: string
    executedBy: string
  }
}

/**
 * Update test case execution status
 */
export async function updateTestExecution(params: TestExecutionUpdate): Promise<TestExecutionResponse> {
  try {
    const response = await fetch('/api/test-execution', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update test execution')
    }

    return result
  } catch (error) {
    console.error('Error updating test execution:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get test case execution details
 */
export async function getTestExecutionDetails(testCaseId: string, testTable: 'test_cases' | 'platform_test_cases') {
  try {
    const response = await fetch(`/api/test-execution?testCaseId=${testCaseId}&testTable=${testTable}`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch test execution details')
    }

    return result.data
  } catch (error) {
    console.error('Error fetching test execution details:', error)
    return null
  }
}

/**
 * Get user execution statistics
 */
export async function getUserExecutionStats() {
  try {
    const response = await fetch('/api/test-execution')
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch execution statistics')
    }

    return result.data
  } catch (error) {
    console.error('Error fetching execution statistics:', error)
    return null
  }
}

/**
 * Batch update multiple test cases
 */
export async function batchUpdateTestExecution(updates: TestExecutionUpdate[]): Promise<TestExecutionResponse[]> {
  const results = await Promise.all(
    updates.map(update => updateTestExecution(update))
  )
  
  return results
}
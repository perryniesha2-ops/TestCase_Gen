// app/api/test-execution/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testCaseId, testTable, status, notes, executionTime } = body

    // Validate inputs
    if (!testCaseId || !testTable || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: testCaseId, testTable, status' },
        { status: 400 }
      )
    }

    if (!['test_cases', 'platform_test_cases'].includes(testTable)) {
      return NextResponse.json(
        { error: 'Invalid testTable. Must be "test_cases" or "platform_test_cases"' },
        { status: 400 }
      )
    }

    if (!['not_run', 'pass', 'fail', 'skip', 'blocked'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: not_run, pass, fail, skip, blocked' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use the database function to update execution status
    const { data, error } = await supabase.rpc('update_test_execution', {
      test_table: testTable,
      test_id: testCaseId,
      new_status: status,
      notes: notes || null,
      exec_time: executionTime || null
    })

    if (error) {
      console.error('Error updating test execution:', error)
      return NextResponse.json(
        { error: 'Failed to update test execution status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test execution status updated successfully',
      data: {
        testCaseId,
        status,
        executedAt: new Date().toISOString(),
        executedBy: user.id
      }
    })

  } catch (error) {
    console.error('Test execution update error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update test execution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET route to fetch test execution history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const testTable = searchParams.get('testTable')
    const testCaseId = searchParams.get('testCaseId')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (testCaseId && testTable) {
      // Get specific test case execution details
      if (testTable === 'test_cases') {
        const { data, error } = await supabase
          .from('test_cases')
          .select('id, execution_status, executed_at, executed_by, execution_notes, execution_time_minutes')
          .eq('id', testCaseId)
          .eq('user_id', user.id)
          .single()

        if (error) {
          return NextResponse.json(
            { error: 'Test case not found or unauthorized' },
            { status: 404 }
          )
        }

        return NextResponse.json({ success: true, data })

      } else if (testTable === 'platform_test_cases') {
        // For platform test cases, first check if user owns the suite
        const { data: suiteCheck, error: suiteError } = await supabase
          .from('platform_test_cases')
          .select(`
            id,
            suite_id,
            cross_platform_test_suites!inner(user_id)
          `)
          .eq('id', testCaseId)
          .eq('cross_platform_test_suites.user_id', user.id)
          .single()

        if (suiteError || !suiteCheck) {
          return NextResponse.json(
            { error: 'Test case not found or unauthorized' },
            { status: 404 }
          )
        }

        // Now get the execution details
        const { data, error } = await supabase
          .from('platform_test_cases')
          .select('id, execution_status, executed_at, executed_by, execution_notes, execution_time_minutes')
          .eq('id', testCaseId)
          .single()

        if (error) {
          return NextResponse.json(
            { error: 'Failed to fetch test case execution details' },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, data })
      
      } else {
        return NextResponse.json(
          { error: 'Invalid test table specified' },
          { status: 400 }
        )
      }

    } else {
      // Get execution statistics using the view
      const { data: stats, error } = await supabase
        .from('comprehensive_execution_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching execution stats:', error)
        return NextResponse.json(
          { error: 'Failed to fetch execution statistics' },
          { status: 500 }
        )
      }

      // Return empty stats if no data
      const userStats = stats || {
        total_test_cases: 0,
        total_passed: 0,
        total_failed: 0,
        total_skipped: 0,
        total_not_run: 0,
        success_rate: 0
      }

      return NextResponse.json({ success: true, data: userStats })
    }

  } catch (error) {
    console.error('Error fetching test execution data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test execution data' },
      { status: 500 }
    )
  }
}
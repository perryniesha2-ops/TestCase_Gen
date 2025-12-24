// app/api/execute-script/[id]/route.ts - FIXED for Next.js 15
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/execute-script/[id]
 * Get execution status and results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ params is now a Promise
) {
  try {
    // ✅ Await params in Next.js 15
    const { id } = await params
    
    const supabase = await createClient()
    
    // Get execution with all related data
    const { data: execution, error: execError } = await supabase
      .from('script_executions')
      .select(`
        *,
        automation_scripts (
          id,
          script_name,
          framework
        )
      `)
      .eq('id', id)
      .single()
    
    if (execError) {
      console.error('Error fetching execution:', execError)
      throw new Error('Execution not found')
    }
    
    // Get execution steps
    const { data: steps, error: stepsError } = await supabase
      .from('script_execution_steps')
      .select('*')
      .eq('execution_id', id)
      .order('step_number', { ascending: true })
    
    if (stepsError) {
      console.error('Error fetching steps:', stepsError)
    }
    
    // Calculate progress
    const totalSteps = steps?.length || 0
    const completedSteps = steps?.filter(s => s.status === 'passed' || s.status === 'failed').length || 0
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
    
    return NextResponse.json({
      success: true,
      execution: {
        ...execution,
        steps: steps || [],
        progress,
        totalSteps,
        completedSteps,
        passedSteps: steps?.filter(s => s.status === 'passed').length || 0,
        failedSteps: steps?.filter(s => s.status === 'failed').length || 0
      }
    })
    
  } catch (error) {
    console.error('Get execution error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get execution' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/execute-script/[id]
 * Cancel a running execution or delete an execution record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ params is now a Promise
) {
  try {
    // ✅ Await params
    const { id } = await params
    
    const supabase = await createClient()
    
    // Get execution
    const { data: execution, error: fetchError } = await supabase
      .from('script_executions')
      .select('execution_status')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      throw new Error('Execution not found')
    }
    
    // If running, mark as cancelled
    if (execution.execution_status === 'running') {
      const { error: updateError } = await supabase
        .from('script_executions')
        .update({
          execution_status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Cancelled by user'
        })
        .eq('id', id)
      
      if (updateError) throw updateError
      
      return NextResponse.json({
        success: true,
        message: 'Execution cancelled'
      })
    }
    
    // Otherwise, delete the execution and its steps
    const { error: deleteStepsError } = await supabase
      .from('script_execution_steps')
      .delete()
      .eq('execution_id', id)
    
    if (deleteStepsError) {
      console.error('Error deleting steps:', deleteStepsError)
    }
    
    const { error: deleteError } = await supabase
      .from('script_executions')
      .delete()
      .eq('id', id)
    
    if (deleteError) throw deleteError
    
    return NextResponse.json({
      success: true,
      message: 'Execution deleted'
    })
    
  } catch (error) {
    console.error('Delete execution error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete execution' 
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/execute-script/[id]
 * Update execution status (for manual updates or retries)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ params is now a Promise
) {
  try {
    // ✅ Await params
    const { id } = await params
    
    const body = await request.json()
    const { status, error_message } = body
    
    const supabase = await createClient()
    
    const updates: any = {
      execution_status: status,
      updated_at: new Date().toISOString()
    }
    
    if (error_message) {
      updates.error_message = error_message
    }
    
    if (status === 'passed' || status === 'failed' || status === 'cancelled') {
      updates.completed_at = new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('script_executions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      execution: data
    })
    
  } catch (error) {
    console.error('Update execution error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update execution' 
      },
      { status: 500 }
    )
  }
}
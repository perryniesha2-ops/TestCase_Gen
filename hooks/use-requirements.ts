// hooks/use-requirements.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Requirement } from "@/types/requirements"

export function useRequirements(projectFilter?: string) {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequirements = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        toast.error('Authentication error')
        return
      }

      if (!user) {
        console.error('No user found')
        toast.error('Please log in to view requirements')
        return
      }

  

      // ✅ Build query WITH project join
      let query = supabase
        .from('requirements')
        .select(`
          *,
          projects:project_id(id, name, color, icon)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Apply project filter if provided
      if (projectFilter) {
        query = query.eq('project_id', projectFilter)
      }

      const { data: reqData, error: reqError } = await query

      if (reqError) {
        console.error('Requirements query error:', reqError)
        console.error('Error details:', reqError.message, reqError.details, reqError.hint)
        toast.error(`Failed to load requirements: ${reqError.message}`)
        return
      }


      // Calculate coverage for each requirement
      const requirementsWithCoverage = await Promise.all(
        (reqData || []).map(async (req) => {
          const coverage = await calculateCoverage(req.id)
          return {
            ...req,
            test_case_count: coverage.testCaseCount,
            coverage_percentage: coverage.percentage
          }
        })
      )

      setRequirements(requirementsWithCoverage)
    } catch (error) {
      console.error('Error fetching requirements:', error)
      toast.error('Failed to load requirements')
    } finally {
      setLoading(false)
    }
  }, [projectFilter])

  useEffect(() => {
    fetchRequirements()
  }, [fetchRequirements])

  async function calculateCoverage(requirementId: string) {
    try {
      const supabase = createClient()

      // Get linked test cases
      const { data: linkData, error: linkError } = await supabase
        .from('requirement_test_cases')
        .select('test_case_id')
        .eq('requirement_id', requirementId)

      if (linkError) {
        console.error('Coverage link error:', linkError)
        return { testCaseCount: 0, percentage: 0 }
      }

      const testCaseIds = linkData?.map(link => link.test_case_id) || []
      
      if (testCaseIds.length === 0) {
        return { testCaseCount: 0, percentage: 0 }
      }

      // Get latest execution status for each test case
      const { data: execData, error: execError } = await supabase
        .from('test_executions')
        .select('test_case_id, execution_status')
        .in('test_case_id', testCaseIds)
        .order('created_at', { ascending: false })

      if (execError) {
        console.error('Coverage execution error:', execError)
        return { testCaseCount: testCaseIds.length, percentage: 0 }
      }

      // Get latest execution per test case
      const latestExecutions = execData?.reduce((acc: Record<string, string>, exec) => {
        if (!acc[exec.test_case_id]) {
          acc[exec.test_case_id] = exec.execution_status
        }
        return acc
      }, {}) || {}

      const passedCount = Object.values(latestExecutions).filter(
        status => status === 'passed'
      ).length

      const percentage = Math.round((passedCount / testCaseIds.length) * 100)

      return {
        testCaseCount: testCaseIds.length,
        percentage
      }
    } catch (error) {
      console.error('Error calculating coverage:', error)
      return { testCaseCount: 0, percentage: 0 }
    }
  }

  async function deleteRequirement(id: string): Promise<boolean> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('requirements')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }
      return true
    } catch (error) {
      console.error('Error deleting requirement:', error)
      toast.error('Failed to delete requirement')
      return false
    }
  }

  return {
    requirements,
    loading,
    fetchRequirements,
    deleteRequirement
  }
}

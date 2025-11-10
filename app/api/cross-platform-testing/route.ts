// app/api/cross-platform-testing/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requirement, platforms, model } = body

    // Validate inputs
    if (!requirement?.trim()) {
      return NextResponse.json(
        { error: 'Requirement is required' },
        { status: 400 }
      )
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'At least one platform is required' },
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

    // Create test suite record
    const { data: suite, error: suiteError } = await supabase
      .from('cross_platform_test_suites')
      .insert({
        requirement: requirement.trim(),
        platforms: platforms.map(p => p.platform),
        user_id: user.id,
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (suiteError) {
      console.error('Error creating test suite:', suiteError)
      return NextResponse.json(
        { error: 'Failed to create test suite' },
        { status: 500 }
      )
    }

    // Generate test cases for each platform
    let totalTestCases = 0
    const generationPromises = platforms.map(async (platformData: { platform: string; framework: string }) => {
      try {
        // Here you would call your AI service to generate test cases
        // For now, we'll create placeholder test cases
        const testCases = [
          {
            suite_id: suite.id,
            platform: platformData.platform,
            framework: platformData.framework,
            title: `${requirement} - ${platformData.platform} Test`,
            description: `Test case for ${platformData.platform} platform using ${platformData.framework}`,
            preconditions: [`${platformData.framework} environment is set up`],
            steps: [
              `Navigate to the application on ${platformData.platform}`,
              `Execute the requirement: ${requirement}`,
              `Verify the functionality works as expected`
            ],
            expected_results: [
              'Application loads successfully',
              'Functionality works correctly',
              'No errors are displayed'
            ],
            priority: 'medium' as const,
            execution_status: 'not_run' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]

        const { data: insertedCases, error: insertError } = await supabase
          .from('platform_test_cases')
          .insert(testCases)
          .select()

        if (insertError) {
          console.error(`Error inserting test cases for ${platformData.platform}:`, insertError)
          return 0
        }

        return insertedCases?.length || 0
      } catch (error) {
        console.error(`Error generating test cases for ${platformData.platform}:`, error)
        return 0
      }
    })

    const results = await Promise.all(generationPromises)
    totalTestCases = results.reduce((sum, count) => sum + count, 0)

    // Update suite with total test case count
    await supabase
      .from('cross_platform_test_suites')
      .update({ total_test_cases: totalTestCases })
      .eq('id', suite.id)

    return NextResponse.json({
      success: true,
      suite_id: suite.id,
      total_test_cases: totalTestCases,
      platforms: platforms.map(p => p.platform),
      message: 'Cross-platform test cases generated successfully'
    })

  } catch (error) {
    console.error('Cross-platform generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate cross-platform tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
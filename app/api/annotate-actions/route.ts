// app/api/ai/analyze-recording/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from "openai";


const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });


export async function POST(req: NextRequest) {
  try {
    const { actions, startUrl, testCaseTitle } = await req.json()

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: 'Invalid actions data' },
        { status: 400 }
      )
    }

    // Create a detailed summary of the recording for Claude
    const actionSummary = actions.map((action, index) => {
      const details: string[] = []
      
      if (action.type === 'click') {
        details.push(`Click on element: ${action.metadata?.elementText || action.selector}`)
      } else if (action.type === 'type') {
        details.push(`Type "${action.value}" into ${action.selector}`)
      } else if (action.type === 'navigate') {
        details.push(`Navigate to: ${action.url}`)
      } else if (action.type === 'select') {
        details.push(`Select option in: ${action.selector}`)
      } else if (action.type === 'scroll') {
        details.push(`Scroll to position: ${action.metadata?.scrollPosition?.y || 0}`)
      } else {
        details.push(`${action.type} action on ${action.selector}`)
      }

      return `${index + 1}. ${details.join(', ')}`
    }).join('\n')

    const prompt = `You are analyzing a browser test recording. Based on the following user actions, provide a comprehensive analysis.

Test Case: ${testCaseTitle}
Starting URL: ${startUrl}
Total Actions: ${actions.length}

Actions performed:
${actionSummary}

Please provide a JSON response with the following structure:
{
  "description": "A clear, concise 1-2 sentence description of what this test does",
  "summary": "A brief summary highlighting the key actions (e.g., '5 clicks, 3 form inputs, 1 navigation')",
  "userJourney": "A natural language description of the user's journey through the application",
  "suggestedAssertions": ["Array of 3-5 specific assertions that should be validated in this test"],
  "criticalSteps": [Array of step indices (0-based) that are critical to test success, like form submissions, navigations],
  "estimatedComplexity": "simple|moderate|complex (based on number of actions and their types)",
  "tags": ["Array of relevant tags like 'login', 'form-submission', 'navigation', 'checkout', etc."]
}

Focus on being specific and actionable. The assertions should be things that can actually be verified during test execution.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse the JSON response
    let analysis
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) || 
                       content.text.match(/```\n([\s\S]*?)\n```/)
      const jsonText = jsonMatch ? jsonMatch[1] : content.text
      analysis = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text)
      throw new Error('Failed to parse AI response')
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
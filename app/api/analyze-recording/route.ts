// app/api/ai/annotate-actions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { actions } = await req.json()

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: 'Invalid actions data' },
        { status: 400 }
      )
    }

    // Batch actions for more efficient API usage
    const actionDescriptions = actions.map((action, index) => {
      let description = ''
      
      switch (action.type) {
        case 'click':
          description = `Click on ${action.metadata?.elementText || action.metadata?.tagName || 'element'} (${action.selector})`
          break
        case 'type':
          description = `Type "${action.value}" into input field (${action.selector})`
          break
        case 'navigate':
          description = `Navigate to ${action.url}`
          break
        case 'select':
          description = `Select "${action.value}" from dropdown (${action.selector})`
          break
        case 'scroll':
          description = `Scroll page to position ${action.metadata?.scrollPosition?.y || 0}`
          break
        case 'submit':
          description = `Submit form (${action.selector})`
          break
        default:
          description = `Perform ${action.type} on ${action.selector}`
      }

      return {
        index,
        type: action.type,
        rawDescription: description,
        elementText: action.metadata?.elementText,
        selector: action.selector,
        value: action.value,
      }
    })

    const prompt = `You are analyzing browser test actions to provide intelligent, human-readable annotations. For each action, provide:
1. A clear, natural language annotation explaining what the user is doing
2. An importance level (critical/important/standard)
3. A category (navigation/input/interaction/validation)

Actions to annotate:
${JSON.stringify(actionDescriptions, null, 2)}

Respond with a JSON array where each element has:
{
  "index": <original index>,
  "ai_annotation": "Clear, user-friendly description of what this action does (e.g., 'Click the Login button to submit credentials')",
  "ai_importance": "critical|important|standard",
  "ai_category": "navigation|input|interaction|validation",
  "reasoning": "Brief explanation of why this is categorized this way (optional, for critical steps)"
}

Guidelines:
- Critical: Form submissions, final checkout steps, critical navigation, destructive actions
- Important: Form inputs, significant interactions, verification steps
- Standard: Simple clicks, basic navigation, UI interactions
- Be specific and actionable in annotations
- Focus on user intent, not just technical action`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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

    // Parse the response
    let annotations
    try {
      const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) || 
                       content.text.match(/```\n([\s\S]*?)\n```/)
      const jsonText = jsonMatch ? jsonMatch[1] : content.text
      annotations = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse annotations:', content.text)
      throw new Error('Failed to parse AI annotations')
    }

    // Merge annotations back into original actions
    const annotatedActions = actions.map((action, index) => {
      const annotation = annotations.find((a: any) => a.index === index)
      
      return {
        ...action,
        ai_annotation: annotation?.ai_annotation || `Perform ${action.type} action`,
        ai_importance: annotation?.ai_importance || 'standard',
        ai_category: annotation?.ai_category || 'interaction',
      }
    })

    return NextResponse.json({ annotatedActions })
  } catch (error) {
    console.error('AI annotation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to annotate actions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { recording_id, test_case_id } = await request.json()
  
  const supabase = await createClient()
  
  // Fetch recording
  const { data: recording } = await supabase
    .from('browser_recordings')
    .select('*')
    .eq('id', recording_id)
    .single()
  
  if (!recording) {
    return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
  }
  
  // Convert browser actions to Playwright code
  const playwrightCode = convertToPlaywright(recording)
  
  return NextResponse.json({ code: playwrightCode })
}

function convertToPlaywright(recording: any): string {
  const { actions, url } = recording
  
  let code = `import { test, expect } from '@playwright/test';

test('${recording.test_case_id}', async ({ page }) => {
  // Navigate to starting URL
  await page.goto('${url}');
  
`
  
  // Convert each action
  actions.forEach((action: any) => {
    switch (action.type) {
      case 'click':
        code += `  await page.click('${action.selector.primary.value}');\n`
        break
      case 'type':
        code += `  await page.fill('${action.selector.primary.value}', '${action.value}');\n`
        break
      case 'navigate':
        code += `  await page.goto('${action.url}');\n`
        break
      // Add more action types
    }
  })
  
  code += `});`
  
  return code
}
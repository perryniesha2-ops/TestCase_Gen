// app/api/execute-script/route.ts - PRODUCTION READY with Browserless
import { NextRequest, NextResponse } from 'next/server'
import { chromium, firefox, webkit, Browser, Page } from 'playwright-core'
import { createClient } from '@/lib/supabase/server'
import { uploadScreenshot, uploadVideo } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const { scriptId, browser = 'chromium', headless = true } = await request.json()
    
    const supabase = await createClient()
    
    const { data: script, error: scriptError } = await supabase
      .from('automation_scripts')
      .select('*, user_id')
      .eq('id', scriptId)
      .single()
    
    if (scriptError || !script) {
      throw new Error('Script not found')
    }
    
    const { data: execution, error: execError } = await supabase
      .from('script_executions')
      .insert({
        script_id: scriptId,
        user_id: script.user_id,
        execution_status: 'running',
        browser,
        started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (execError) {
      console.error('Execution insert error:', execError)
      throw execError
    }
    
    // Execute in background
    executeScript(execution.id, script, browser, headless).catch(err => {
      console.error('Background execution error:', err)
    })
    
    return NextResponse.json({
      success: true,
      executionId: execution.id,
      status: 'running'
    })
    
  } catch (error) {
    console.error('Execute script error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function executeScript(
  executionId: string,
  script: any,
  browserType: string,
  headless: boolean
) {
  const supabase = await createClient()
  let browser: Browser | null = null
  const startTime = Date.now()
  
  try {
    console.log(`[${executionId}] Starting execution`)
    
    // ✅ CLOUD EXECUTION - Works for all users concurrently
    const browserEngine = browserType === 'firefox' ? firefox :
                         browserType === 'webkit' ? webkit : chromium
    
    // Check if Browserless API key is configured
    const browserlessToken = process.env.BROWSERLESS_API_KEY
    
    if (browserlessToken) {
      // ✅ PRODUCTION: Cloud execution via Browserless
      console.log(`[${executionId}] Connecting to Browserless cloud...`)
      
      const wsEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}&--window-size=1920,1080`
      
      browser = await chromium.connect({
        wsEndpoint,
        timeout: 60000 // 60 second connection timeout
      })
      
      console.log(`[${executionId}] Connected to Browserless`)
      
    } else {
      // ⚠️ DEVELOPMENT ONLY: Local execution (fallback)
      console.log(`[${executionId}] Using local browser (dev mode)`)
      
      browser = await browserEngine.launch({ 
        headless,
        timeout: 30000
      })
    }
    
    const context = await browser.newContext({
      recordVideo: { 
        dir: './videos', 
        size: { width: 1280, height: 720 } 
      },
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    const page = await context.newPage()
    
    console.log(`[${executionId}] Browser ready, parsing script...`)
    
    // Parse and execute steps
    const steps = parsePlaywrightScript(script.script_content)
    console.log(`[${executionId}] Parsed ${steps.length} steps`)
    
    if (steps.length === 0) {
      throw new Error('No executable steps found in script')
    }
    
    // Execute each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const stepStartTime = Date.now()
      
      console.log(`[${executionId}] Step ${i + 1}/${steps.length}: ${step.description}`)
      
      try {
        // Execute the step
        await executePlaywrightStep(page, step)
        
        // Wait a bit for page to settle
        await page.waitForTimeout(500)
        
        // Take screenshot
        const screenshot = await page.screenshot({ 
          fullPage: false,
          type: 'png'
        })
        
        const screenshotUrl = await uploadScreenshot(
          screenshot,
          `execution-${executionId}/step-${i + 1}.png`
        )
        
        console.log(`[${executionId}] Step ${i + 1} PASSED (${Date.now() - stepStartTime}ms)`)
        
        // Save step result
        await supabase.from('script_execution_steps').insert({
          execution_id: executionId,
          step_number: i + 1,
          step_description: step.description,
          status: 'passed',
          duration_ms: Date.now() - stepStartTime,
          screenshot_url: screenshotUrl
        })
        
      } catch (stepError) {
        console.error(`[${executionId}] Step ${i + 1} FAILED:`, stepError)
        
        // Take error screenshot
        try {
          const screenshot = await page.screenshot({ 
            fullPage: false,
            type: 'png'
          })
          
          const screenshotUrl = await uploadScreenshot(
            screenshot,
            `execution-${executionId}/step-${i + 1}-error.png`
          )
          
          // Save failed step
          await supabase.from('script_execution_steps').insert({
            execution_id: executionId,
            step_number: i + 1,
            step_description: step.description,
            status: 'failed',
            duration_ms: Date.now() - stepStartTime,
            screenshot_url: screenshotUrl,
            error_message: stepError instanceof Error ? stepError.message : 'Unknown error'
          })
        } catch (screenshotError) {
          console.error(`[${executionId}] Failed to capture error screenshot:`, screenshotError)
        }
        
        // Stop execution on first failure
        throw stepError
      }
    }
    
    // Close context to finalize video
    await context.close()
    
    // Handle video upload
    let videoUrl = null
    try {
      const videoPath = await page.video()?.path()
      
      if (videoPath) {
        console.log(`[${executionId}] Uploading video...`)
        videoUrl = await uploadVideo(
          videoPath, 
          `execution-${executionId}/recording.webm`
        )
        console.log(`[${executionId}] Video uploaded`)
      }
    } catch (videoError) {
      console.error(`[${executionId}] Video upload failed:`, videoError)
      // Don't fail execution if video upload fails
    }
    
    // Mark execution as passed
    const duration = Date.now() - startTime
    console.log(`[${executionId}] ✅ EXECUTION PASSED (${duration}ms)`)
    
    await supabase
      .from('script_executions')
      .update({
        execution_status: 'passed',
        duration_ms: duration,
        video_url: videoUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[${executionId}] ❌ EXECUTION FAILED (${duration}ms):`, error)
    
    await supabase
      .from('script_executions')
      .update({
        execution_status: 'failed',
        duration_ms: duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)
    
  } finally {
    if (browser) {
      try {
        await browser.close()
        console.log(`[${executionId}] Browser closed`)
      } catch (closeError) {
        console.error(`[${executionId}] Error closing browser:`, closeError)
      }
    }
  }
}

function parsePlaywrightScript(scriptContent: string): Array<{
  description: string
  command: string
  selector?: string
  value?: string
  action: string
}> {
  const steps: Array<any> = []
  const lines = scriptContent.split('\n')
  
  let currentDescription = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines and test structure
    if (!line || 
        line.startsWith('import ') || 
        line.startsWith('test.describe') ||
        line.startsWith('test(') ||
        line.includes('async ({ page })') ||
        line === '});' ||
        line === '}') {
      continue
    }
    
    // Extract step description from comments
    if (line.startsWith('// Step')) {
      currentDescription = line.replace(/\/\/\s*Step\s*\d+:\s*/, '').trim()
      continue
    }
    
    // Parse Playwright commands
    if (line.includes('await page.')) {
      const step = parsePlaywrightCommand(line, currentDescription)
      if (step) {
        steps.push(step)
        currentDescription = ''
      }
    }
    
    // Parse expect statements
    if (line.includes('await expect(')) {
      steps.push({
        description: currentDescription || 'Verify expectation',
        command: line,
        action: 'expect'
      })
      currentDescription = ''
    }
  }
  
  return steps
}

function parsePlaywrightCommand(line: string, description: string): any {
  const cleaned = line.replace('await page.', '').replace(/;$/, '').trim()
  
  if (cleaned.startsWith('goto(')) {
    const url = extractString(cleaned)
    return {
      description: description || `Navigate to ${url}`,
      command: line,
      action: 'goto',
      value: url
    }
  }
  
  if (cleaned.startsWith('click(')) {
    const selector = extractString(cleaned)
    return {
      description: description || `Click ${selector}`,
      command: line,
      action: 'click',
      selector
    }
  }
  
  if (cleaned.startsWith('fill(')) {
    const parts = extractMultipleStrings(cleaned)
    return {
      description: description || `Fill ${parts[0]}`,
      command: line,
      action: 'fill',
      selector: parts[0],
      value: parts[1]
    }
  }
  
  if (cleaned.startsWith('type(')) {
    const parts = extractMultipleStrings(cleaned)
    return {
      description: description || `Type into ${parts[0]}`,
      command: line,
      action: 'type',
      selector: parts[0],
      value: parts[1]
    }
  }
  
  if (cleaned.startsWith('check(')) {
    const selector = extractString(cleaned)
    return {
      description: description || `Check ${selector}`,
      command: line,
      action: 'check',
      selector
    }
  }
  
  if (cleaned.startsWith('uncheck(')) {
    const selector = extractString(cleaned)
    return {
      description: description || `Uncheck ${selector}`,
      command: line,
      action: 'uncheck',
      selector
    }
  }
  
  if (cleaned.startsWith('selectOption(')) {
    const parts = extractMultipleStrings(cleaned)
    return {
      description: description || `Select option in ${parts[0]}`,
      command: line,
      action: 'select',
      selector: parts[0],
      value: parts[1]
    }
  }
  
  if (cleaned.startsWith('waitForSelector(')) {
    const selector = extractString(cleaned)
    return {
      description: description || `Wait for ${selector}`,
      command: line,
      action: 'wait',
      selector
    }
  }
  
  if (cleaned.startsWith('screenshot(')) {
    return {
      description: description || 'Take screenshot',
      command: line,
      action: 'screenshot'
    }
  }
  
  return {
    description: description || 'Execute command',
    command: line,
    action: 'custom'
  }
}

async function executePlaywrightStep(page: Page, step: any) {
  const timeout = 30000
  
  switch (step.action) {
    case 'goto':
      await page.goto(step.value, { timeout, waitUntil: 'domcontentloaded' })
      break
      
    case 'click':
      await page.click(step.selector, { timeout })
      break
      
    case 'fill':
      await page.fill(step.selector, step.value, { timeout })
      break
      
    case 'type':
      await page.type(step.selector, step.value, { timeout })
      break
      
    case 'check':
      await page.check(step.selector, { timeout })
      break
      
    case 'uncheck':
      await page.uncheck(step.selector, { timeout })
      break
      
    case 'select':
      await page.selectOption(step.selector, step.value, { timeout })
      break
      
    case 'wait':
      await page.waitForSelector(step.selector, { timeout })
      break
      
    case 'screenshot':
      await page.screenshot()
      break
      
    case 'expect':
      await executeExpectStatement(page, step.command)
      break
      
    case 'custom':
      throw new Error(`Unsupported command: ${step.command}`)
      
    default:
      throw new Error(`Unknown action: ${step.action}`)
  }
}

async function executeExpectStatement(page: Page, command: string) {
  if (command.includes('toHaveURL')) {
    const expectedUrl = extractString(command)
    const actualUrl = page.url()
    if (!actualUrl.includes(expectedUrl)) {
      throw new Error(`Expected URL to contain "${expectedUrl}" but got "${actualUrl}"`)
    }
  } else if (command.includes('toBeVisible')) {
    const selector = extractSelectorFromExpect(command)
    const isVisible = await page.isVisible(selector)
    if (!isVisible) {
      throw new Error(`Expected "${selector}" to be visible`)
    }
  } else if (command.includes('toHaveText')) {
    const selector = extractSelectorFromExpect(command)
    const expectedText = extractString(command)
    const actualText = await page.textContent(selector)
    if (actualText !== expectedText) {
      throw new Error(`Expected text "${expectedText}" but got "${actualText}"`)
    }
  } else if (command.includes('toContainText')) {
    const selector = extractSelectorFromExpect(command)
    const expectedText = extractString(command)
    const actualText = await page.textContent(selector)
    if (!actualText?.includes(expectedText)) {
      throw new Error(`Expected text to contain "${expectedText}" but got "${actualText}"`)
    }
  }
}

function extractString(input: string): string {
  const match = input.match(/['"]([^'"]+)['"]/)
  return match ? match[1] : ''
}

function extractMultipleStrings(input: string): string[] {
  const matches = input.match(/['"]([^'"]+)['"]/g)
  return matches ? matches.map(m => m.replace(/['"]/g, '')) : []
}

function extractSelectorFromExpect(command: string): string {
  const match = command.match(/page\.locator\(['"]([^'"]+)['"]\)/)
  return match ? match[1] : ''
}
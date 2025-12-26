export type BrowserActionType =
  | 'click'
  | 'type'
  | 'navigate'
  | 'select'
  | 'hover'
  | 'scroll'
  | 'upload'
  | 'drag'
  | 'wait'
  | 'assertion';


export type SelectorStrategy = 
  | 'css'
  | 'xpath'
  | 'text'
  | 'testId'
  | 'aria';


export interface ElementSelector {
  primary: {
    strategy: SelectorStrategy;
    value: string;
  };
  fallbacks?: Array<{
    strategy: SelectorStrategy;
    value: string;
  }>;

  elementInfo?: {
    tagName: string;
    textContent?: string;
    attributes?: Record<string, string>;
  };
}

export interface BrowserAction {
  id: string;
  type: BrowserActionType;
  timestamp: number;
  
 
  selector?: ElementSelector;
  

  value?: string; 
  url?: string; 
  coordinates?: { x: number; y: number }; 
  scrollPosition?: { x: number; y: number }; 
  
  // Validation
  assertion?: {
    type: 'text' | 'visibility' | 'attribute' | 'count';
    expected: string | number | boolean;
    actual?: string | number | boolean;
  };
  

  screenshot?: string; 
  description?: string; 
}


export interface BrowserRecording {
  id: string;
  user_id: string;
  test_case_id?: string;
  
  actions: BrowserAction[];
  url: string; 
  viewport: {
    width: number;
    height: number;
  };
  
  duration_ms: number;
  recorded_at: string;
  browser_info: {
    type: 'chrome' | 'firefox' | 'edge' | 'safari';
    version: string;
    userAgent: string;
  };
  
  created_at: string;
  updated_at: string;
}


export interface BrowserExecutionResult {
  id: string;
  execution_id: string;
  
  browser_type: string;
  browser_version: string;
  extension_version: string;
  
  screenshots: Array<{
    step: number;
    url: string;
    timestamp: number;
  }>;
  
  console_logs: Array<{
    level: 'log' | 'warn' | 'error' | 'info';
    message: string;
    timestamp: number;
  }>;
  
  network_logs?: Array<{
    url: string;
    method: string;
    status: number;
    duration_ms: number;
    timestamp: number;
  }>;
  
  performance_metrics: {
    total_duration_ms: number;
    dom_content_loaded_ms?: number;
    page_load_ms?: number;
    memory_usage_mb?: number;
  };
  
  error_steps: Array<{
    step_number: number;
    error_message: string;
    screenshot?: string;
  }>;
  
  created_at: string;
}


export interface ExtensionSession {
  id: string;
  user_id: string;
  session_token: string;
  status: 'active' | 'paused' | 'completed' | 'expired';
  
  current_url?: string;
  actions_count: number;
  
  expires_at: string;
  created_at: string;
  updated_at: string;
}


export interface ExtensionMessage {
  type: 'START_RECORDING' | 'RECORD_ACTION' | 'STOP_RECORDING' | 'EXECUTE_TEST' | 'EXECUTION_RESULT';
  payload: any;
  session_token: string;
}


export interface ExecutionRequest {
  test_case_id: string;
  recording_id: string;
  options: {
    speed: 'slow' | 'normal' | 'fast'; 
    screenshots: boolean;
    video: boolean;
    network_logs: boolean;
  };
}

export interface AutomationScript {
  id: string;
  test_case_id: string;
  user_id: string;
  
  execution_type: 'extension' | 'playwright' | 'manual';
  
  selectors?: Record<string, ElementSelector>;
  

  playwright_code?: string;
  framework?: string;
  

  status: 'draft' | 'ready' | 'running' | 'failed';
  metadata?: {
    last_run?: string;
    success_rate?: number;
    avg_duration_ms?: number;
  };
  
  created_at: string;
  updated_at: string;
}


export interface CodeExport {
  format: 'playwright' | 'cypress' | 'selenium' | 'puppeteer';
  code: string;
  dependencies: string[];
  setup_instructions: string;
}


export interface CloudExecutionOptions {
  browser: 'chrome' | 'firefox' | 'edge';
  device?: 'desktop' | 'mobile' | 'tablet';
  viewport?: {
    width: number;
    height: number;
  };
  parallel: boolean;
  retry_on_failure: boolean;
  max_retries?: number;
}

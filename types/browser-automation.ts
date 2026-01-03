// types/browser-automation.ts

export type RecordingActionType = 
  | 'click' 
  | 'type' 
  | 'navigate' 
  | 'scroll' 
  | 'select' 
  | 'hover' 
  | 'wait'
  | 'keypress'
  | 'focus'
  | 'blur'
  | 'submit' // Added for form submissions

export interface RecordingAction {
  type: RecordingActionType
  timestamp: number
  selector: string
  xpath?: string
  value?: string
  url?: string
  screenshot?: string
  metadata: {
    elementText?: string
    tagName?: string
    className?: string
    id?: string
    coordinates?: { x: number; y: number }
    scrollPosition?: { x: number; y: number }
    key?: string // for keypress
  }
}

export interface BrowserRecording {
  id: string
  test_case_id: string
  user_id: string
  title: string
  description?: string
  status: 'draft' | 'ready' | 'running' | 'completed' | 'failed'
  actions: RecordingAction[]
  start_url: string
  viewport?: { width: number; height: number }
  duration_ms?: number
  last_execution_at?: string
  last_execution_status?: 'passed' | 'failed' | 'error'
  last_execution_result?: BrowserExecutionResult
  execution_count: number
  created_at: string
  updated_at: string
}

export interface BrowserExecutionResult {
  status: 'passed' | 'failed' | 'error'
  steps_completed: number
  steps_total: number
  failed_step_index?: number
  error_message?: string
  duration_ms: number
  screenshots: Array<{ stepIndex: number; url: string }>
  console_logs: Array<{ level: string; message: string; timestamp: number }>
  network_logs?: Array<{ url: string; method: string; status: number; timestamp: number }>
}

export interface RecordingExecution {
  id: string
  recording_id: string
  user_id: string
  status: 'running' | 'passed' | 'failed' | 'error'
  started_at: string
  completed_at?: string
  duration_ms?: number
  steps_completed: number
  steps_total: number
  failed_step_index?: number
  error_message?: string
  screenshots: Array<{ stepIndex: number; url: string }>
  console_logs: Array<{ level: string; message: string; timestamp: number }>
  network_logs: Array<{ url: string; method: string; status: number; timestamp: number }>
  browser_info?: {
    name: string
    version: string
    userAgent: string
  }
  created_at: string
}

export interface RecorderState {
  isRecording: boolean
  isPaused: boolean
  actions: RecordingAction[]
  startTime: number | null
  currentUrl: string
}

export interface ExtensionMessage {
  type: 'RECORDER_ACTION' | 'RECORDER_START' | 'RECORDER_STOP' | 'RECORDER_PAUSE' | 'RECORDER_RESUME'
  payload?: any
}

export interface PlaybackOptions {
  speed: number // 0.5 = half speed, 1 = normal, 2 = double speed
  pauseOnError: boolean
  takeScreenshots: boolean
  captureConsoleLogs: boolean
  captureNetworkLogs: boolean
}
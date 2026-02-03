#!/usr/bin/env bun

/**
 * Arkadian Beads Bridge Module
 *
 * Centralized wrapper around beads CLI with Arkadian-specific operations.
 *
 * Core Responsibilities:
 * - Execute beads CLI commands with timeout and retry handling
 * - Create session and feature epics
 * - Parse tasks.md and convert to beads issues
 * - Build dependency graphs based on phase structure
 * - Non-blocking error handling (never throws)
 *
 * Usage:
 * - Import functions from this module
 * - All functions return nulls/booleans on error (never throw)
 * - All operations logged to session log
 */

import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import { appendFileSync, existsSync } from 'fs';
import { join } from 'path';

// ========================================
// TYPES AND INTERFACES
// ========================================

export type IssueType = 'epic' | 'feature' | 'task' | 'bug' | 'chore';
export type BeadsStatus = 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed';

export interface BeadsIssue {
  id: string;  // bd-a1b2c3
  title: string;
  description: string;
  type: IssueType;
  status: BeadsStatus;
  priority: number;
  labels: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ArkadianMetadata {
  session_id: string;
  feature_id: string;
  project_id: string;
  task_id: string;  // T001, T002, etc.
  file_paths: string[];
  story_id: string | null;  // US1, US2, etc.
  phase: string;
  parallel: boolean;
}

export interface ConversionResult {
  success: boolean;
  created: number;
  issues: Record<string, string>;  // task_id -> beads_id
  errors: string[];
}

export interface BeadsConfig {
  beads_cli_path: string;
  retry_policy: {
    max_attempts: number;
    backoff_ms: number[];
  };
  timeouts: {
    create_issue: number;
    update_issue: number;
    sync: number;
    query: number;
  };
  logging: {
    session_log: boolean;
    console_error: boolean;
    throw_errors: boolean;
  };
}

interface TaskParsed {
  task_id: string;
  parallel: boolean;
  story_id: string | null;
  description: string;
  file_paths: string[];
  raw_line: string;
}

interface PhaseParsed {
  title: string;
  priority: string | null;
  user_story_id: string | null;  // US1, US2, etc.
  tasks: TaskParsed[];
}

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

// ========================================
// CONFIGURATION
// ========================================

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

export const DEFAULT_CONFIG: BeadsConfig = {
  beads_cli_path: 'bd',
  retry_policy: {
    max_attempts: 3,
    backoff_ms: [100, 500, 2000]
  },
  timeouts: {
    create_issue: 5000,
    update_issue: 3000,
    sync: 10000,
    query: 5000
  },
  logging: {
    session_log: true,
    console_error: true,
    throw_errors: false
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Log beads operation to session log
 */
export function logBeadsOperation(sessionId: string, operation: string, details: any): void {
  const timestamp = new Date().toISOString();
  const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);

  let output = `[${timestamp}] [beads-bridge] ${operation}: `;
  if (typeof details === 'object') {
    output += JSON.stringify(details);
  } else {
    output += details;
  }
  output += '\n';

  try {
    appendFileSync(logFile, output);
  } catch (e) {
    // Ignore logging errors
  }
}

/**
 * Check if beads is available and initialized
 */
export function isBeadsAvailable(): boolean {
  // Check if .beads directory exists
  const beadsDir = join(ARKADIAN_DIR, '.beads');
  if (!existsSync(beadsDir)) {
    return false;
  }

  // TODO: Could also check if bd command is in PATH
  return true;
}

/**
 * Execute beads CLI command with timeout and error handling
 */
async function executeBeadsCommand(
  command: string,
  args: string[],
  options?: { json?: boolean; timeout?: number }
): Promise<CommandResult> {
  const timeout = options?.timeout || DEFAULT_CONFIG.timeouts.query;

  return new Promise((resolve) => {
    const proc = spawn(DEFAULT_CONFIG.beads_cli_path, [command, ...args], {
      cwd: ARKADIAN_DIR
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        stdout: '',
        stderr: 'Command timed out',
        exitCode: null
      });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code
      });
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: null
      });
    });
  });
}

/**
 * Execute command with retry logic and exponential backoff
 */
async function executeWithRetry(
  command: string,
  args: string[],
  options?: { json?: boolean; timeout?: number }
): Promise<CommandResult> {
  const maxAttempts = DEFAULT_CONFIG.retry_policy.max_attempts;
  const backoffMs = DEFAULT_CONFIG.retry_policy.backoff_ms;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await executeBeadsCommand(command, args, options);

    if (result.success) {
      return result;
    }

    // Don't retry if it's the last attempt
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
    }
  }

  // Return last failed result
  return await executeBeadsCommand(command, args, options);
}

/**
 * Parse JSON output from beads command
 */
export function parseBeadsJson<T>(stdout: string): T | null {
  try {
    return JSON.parse(stdout.trim()) as T;
  } catch (e) {
    return null;
  }
}

// ========================================
// CORE BEADS OPERATIONS
// ========================================

/**
 * Create a beads issue
 */
export async function createIssue(
  title: string,
  options: {
    type?: IssueType;
    description?: string;
    priority?: number;
    labels?: string[];
    parent?: string;
    metadata?: Record<string, any>;
  }
): Promise<string | null> {
  const args = [
    title,
    '-t', options.type || 'task'
  ];

  if (options.priority !== undefined) {
    args.push('-p', options.priority.toString());
  }

  if (options.description) {
    args.push('-d', options.description);
  }

  if (options.labels && options.labels.length > 0) {
    for (const label of options.labels) {
      args.push('-l', label);
    }
  }

  args.push('--json');

  const result = await executeWithRetry('create', args, {
    json: true,
    timeout: DEFAULT_CONFIG.timeouts.create_issue
  });

  if (!result.success) {
    return null;
  }

  const issue = parseBeadsJson<BeadsIssue>(result.stdout);
  if (!issue || !issue.id) {
    return null;
  }

  const issueId = issue.id;

  // Add parent relationship if specified
  if (options.parent) {
    await addDependency(issueId, options.parent);
  }

  // Add metadata if specified
  if (options.metadata) {
    const metadataJson = JSON.stringify(options.metadata);
    await executeWithRetry('update', [issueId, '--metadata', metadataJson], {
      timeout: DEFAULT_CONFIG.timeouts.update_issue
    });
  }

  return issueId;
}

/**
 * Update issue status
 */
export async function updateIssueStatus(
  issueId: string,
  status: BeadsStatus
): Promise<boolean> {
  const result = await executeWithRetry('update', [issueId, '--status', status], {
    timeout: DEFAULT_CONFIG.timeouts.update_issue
  });

  return result.success;
}

/**
 * Add dependency (parent blocks child)
 */
export async function addDependency(
  childId: string,
  parentId: string
): Promise<boolean> {
  const result = await executeWithRetry('dep', ['add', childId, parentId], {
    timeout: DEFAULT_CONFIG.timeouts.update_issue
  });

  return result.success;
}

/**
 * Get ready tasks (no blockers)
 */
export async function getReadyTasks(
  filters?: { project?: string; labels?: string[] }
): Promise<BeadsIssue[]> {
  const result = await executeWithRetry('ready', ['--json'], {
    json: true,
    timeout: DEFAULT_CONFIG.timeouts.query
  });

  if (!result.success) {
    return [];
  }

  const issues = parseBeadsJson<BeadsIssue[]>(result.stdout);
  if (!issues) {
    return [];
  }

  // Apply filters if provided
  let filtered = issues;

  if (filters?.project) {
    filtered = filtered.filter((issue) =>
      issue.labels.includes(`project:${filters.project}`)
    );
  }

  if (filters?.labels) {
    filtered = filtered.filter((issue) =>
      filters.labels!.every((label) => issue.labels.includes(label))
    );
  }

  return filtered;
}

/**
 * Sync beads repository
 */
export async function sync(): Promise<boolean> {
  const result = await executeWithRetry('sync', [], {
    timeout: DEFAULT_CONFIG.timeouts.sync
  });

  return result.success;
}

// ========================================
// ARKADIAN-SPECIFIC OPERATIONS
// ========================================

/**
 * Create session epic
 */
export async function createSessionEpic(
  sessionId: string,
  userRequest?: string
): Promise<string | null> {
  logBeadsOperation(sessionId, 'create-session-epic', { sessionId, userRequest });

  const title = `Arkadian Session: ${sessionId}`;
  const description = userRequest || 'Session started';

  const epicId = await createIssue(title, {
    type: 'epic',
    description,
    priority: 1,
    labels: ['arkadian', 'session'],
    metadata: {
      session_id: sessionId,
      created_by: 'arkadian'
    }
  });

  if (epicId) {
    logBeadsOperation(sessionId, 'session-epic-created', { epicId });
  } else {
    logBeadsOperation(sessionId, 'session-epic-failed', { reason: 'createIssue returned null' });
  }

  return epicId;
}

/**
 * Create feature epic
 */
export async function createFeatureEpic(
  sessionId: string,
  projectId: string,
  featureId: string,
  featureName: string,
  sessionEpicId: string
): Promise<string | null> {
  logBeadsOperation(sessionId, 'create-feature-epic', {
    projectId,
    featureId,
    featureName,
    sessionEpicId
  });

  const title = `${projectId}: ${featureName}`;

  const epicId = await createIssue(title, {
    type: 'epic',
    priority: 1,
    labels: ['arkadian', 'feature', `project:${projectId}`],
    parent: sessionEpicId,
    metadata: {
      session_id: sessionId,
      feature_id: featureId,
      project_id: projectId
    }
  });

  if (epicId) {
    logBeadsOperation(sessionId, 'feature-epic-created', { epicId });
  } else {
    logBeadsOperation(sessionId, 'feature-epic-failed', { reason: 'createIssue returned null' });
  }

  return epicId;
}

// ========================================
// TASKS.MD PARSING
// ========================================

/**
 * Extract feature name from tasks.md title
 * Reads first line: "# Tasks: Feature Name" -> "Feature Name"
 */
function extractFeatureName(tasksMdPath: string): string {
  try {
    const content = readFileSync(tasksMdPath, 'utf-8');
    const match = content.match(/^#\s*Tasks:\s*(.+)$/m);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    // Ignore
  }
  return 'Unnamed Feature';
}

/**
 * Parse a single task line
 * Format: - [ ] T### [P?] [US#?] Description with file paths
 */
function parseTaskLine(line: string): TaskParsed | null {
  // Match task line pattern
  const taskMatch = line.match(/^-\s*\[\s*\]\s+(T\d{3,4})/);
  if (!taskMatch) {
    return null;
  }

  const taskId = taskMatch[1];

  // Check for parallel marker [P]
  const parallel = line.includes('[P]');

  // Check for story marker [US#]
  const storyMatch = line.match(/\[US(\d+)\]/);
  const storyId = storyMatch ? `US${storyMatch[1]}` : null;

  // Extract description (remove task ID and markers)
  let description = line.replace(/^-\s*\[\s*\]\s+T\d{3,4}/, '').trim();
  description = description.replace(/\[P\]/g, '').trim();
  description = description.replace(/\[US\d+\]/g, '').trim();

  // Extract file paths (look for paths in description)
  const filePaths: string[] = [];
  const pathRegex = /(?:^|\s)((?:\/[\w\-/.]+)|(?:[\w\-/.]+\/[\w\-/.]+))/g;
  let pathMatch;
  while ((pathMatch = pathRegex.exec(description)) !== null) {
    filePaths.push(pathMatch[1]);
  }

  return {
    task_id: taskId,
    parallel,
    story_id: storyId,
    description,
    file_paths: filePaths,
    raw_line: line
  };
}

/**
 * Parse tasks.md into structured data
 */
export function parseTasksMd(tasksMdPath: string): {
  featureName: string;
  phases: Record<string, PhaseParsed>;
} {
  const content = readFileSync(tasksMdPath, 'utf-8');
  const lines = content.split('\n');

  const featureName = extractFeatureName(tasksMdPath);
  const phases: Record<string, PhaseParsed> = {};

  let currentPhase: string | null = null;
  let currentPhaseData: PhaseParsed | null = null;

  for (const line of lines) {
    // Check for phase heading: ## Phase N: Title (Priority: P1)?
    const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s+(.+?)(?:\s+\(Priority:\s+(P\d+)\))?$/);
    if (phaseMatch) {
      // Save previous phase
      if (currentPhase && currentPhaseData) {
        phases[currentPhase] = currentPhaseData;
      }

      const phaseNum = phaseMatch[1];
      const phaseTitle = phaseMatch[2];
      const priority = phaseMatch[3] || null;

      // Check if this is a user story phase
      const userStoryMatch = phaseTitle.match(/User Story (\d+)/);
      const userStoryId = userStoryMatch ? `US${userStoryMatch[1]}` : null;

      currentPhase = `phase_${phaseNum}`;
      currentPhaseData = {
        title: phaseTitle,
        priority,
        user_story_id: userStoryId,
        tasks: []
      };
      continue;
    }

    // Check for task line
    if (currentPhaseData) {
      const task = parseTaskLine(line);
      if (task) {
        currentPhaseData.tasks.push(task);
      }
    }
  }

  // Save last phase
  if (currentPhase && currentPhaseData) {
    phases[currentPhase] = currentPhaseData;
  }

  return { featureName, phases };
}

// ========================================
// TASKS.MD TO BEADS CONVERSION
// ========================================

/**
 * Convert tasks.md to beads issues
 */
export async function convertTasksMdToBeads(
  tasksMdPath: string,
  featureEpicId: string,
  sessionId: string,
  projectId: string,
  featureId: string
): Promise<ConversionResult> {
  logBeadsOperation(sessionId, 'convert-tasks-md', {
    tasksMdPath,
    featureEpicId,
    projectId,
    featureId
  });

  const errors: string[] = [];
  const issues: Record<string, string> = {};
  let created = 0;

  try {
    const parsed = parseTasksMd(tasksMdPath);
    logBeadsOperation(sessionId, 'parsed-tasks-md', {
      featureName: parsed.featureName,
      phaseCount: Object.keys(parsed.phases).length
    });

    // Create user story feature issues first
    const userStoryIssues: Record<string, string> = {};

    for (const [phaseKey, phase] of Object.entries(parsed.phases)) {
      if (phase.user_story_id) {
        const storyTitle = `User Story ${phase.user_story_id.replace('US', '')}: ${phase.title}`;
        const storyId = await createIssue(storyTitle, {
          type: 'feature',
          priority: 2,
          labels: ['arkadian', 'user-story', `story:${phase.user_story_id}`],
          parent: featureEpicId,
          metadata: {
            session_id: sessionId,
            feature_id: featureId,
            project_id: projectId,
            story_id: phase.user_story_id
          }
        });

        if (storyId) {
          userStoryIssues[phase.user_story_id] = storyId;
          created++;
          logBeadsOperation(sessionId, 'user-story-created', {
            story_id: phase.user_story_id,
            beads_id: storyId
          });
        } else {
          errors.push(`Failed to create user story: ${phase.user_story_id}`);
        }
      }
    }

    // Create task issues
    const phaseOrder = Object.keys(parsed.phases).sort();
    let priority = 1;

    for (const phaseKey of phaseOrder) {
      const phase = parsed.phases[phaseKey];

      for (const task of phase.tasks) {
        const taskTitle = `${task.task_id}: ${task.description}`;

        // Determine parent (user story feature or feature epic)
        let parent = featureEpicId;
        if (task.story_id && userStoryIssues[task.story_id]) {
          parent = userStoryIssues[task.story_id];
        }

        // Build labels
        const labels = ['arkadian', 'implementation', `project:${projectId}`];
        if (task.parallel) {
          labels.push('parallel');
        }
        if (task.story_id) {
          labels.push(`story:${task.story_id}`);
        }

        // Create issue
        const issueId = await createIssue(taskTitle, {
          type: 'task',
          priority,
          labels,
          parent,
          metadata: {
            arkadian: {
              session_id: sessionId,
              feature_id: featureId,
              project_id: projectId,
              task_id: task.task_id,
              file_paths: task.file_paths,
              story_id: task.story_id,
              phase: phaseKey,
              parallel: task.parallel
            }
          }
        });

        if (issueId) {
          issues[task.task_id] = issueId;
          created++;
          logBeadsOperation(sessionId, 'task-created', {
            task_id: task.task_id,
            beads_id: issueId
          });
        } else {
          errors.push(`Failed to create task: ${task.task_id}`);
        }
      }

      priority++;
    }

    // Build dependency graph
    // For now, simple phase-based dependencies
    // TODO: Add more sophisticated dependency logic based on task relationships

    logBeadsOperation(sessionId, 'conversion-complete', {
      created,
      errors: errors.length
    });

    return {
      success: created > 0,
      created,
      issues,
      errors
    };
  } catch (error: any) {
    logBeadsOperation(sessionId, 'conversion-error', {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      created,
      issues,
      errors: [...errors, error.message]
    };
  }
}

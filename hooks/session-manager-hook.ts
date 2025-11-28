#!/usr/bin/env bun

/**
 * Arkadian Session Manager Hook
 *
 * Captures session metadata and generates human-readable conversation summaries.
 *
 * Events handled:
 * - SessionStart: Create session folder structure
 * - SessionEnd: Use Claude to summarize transcript into session.md
 *
 * Session structure:
 * sessions/
 *   <timestamp>-<title>/
 *     session.md      - Claude-generated summary of conversation
 *     artifacts/      - All agent outputs
 *     specs/          - Specs if ark-project-manager invoked
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  cwd?: string;
}

interface SessionMeta {
  session_id: string;
  timestamp: string;
  title: string;
  folder_name: string;
  cwd: string;
  started_at: string;
  transcript_path?: string;
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function getReadableTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function generateTitle(prompt: string): string {
  // Extract meaningful title from first prompt (2-5 words)
  const words = prompt
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 5);

  if (words.length === 0) return 'new-session';
  return words.join('-').toLowerCase();
}

function getSessionMetaPath(sessionId: string): string {
  return join(SESSIONS_DIR, `.session-${sessionId}.json`);
}

function loadSessionMeta(sessionId: string): SessionMeta | null {
  const metaPath = getSessionMetaPath(sessionId);
  if (existsSync(metaPath)) {
    try {
      return JSON.parse(readFileSync(metaPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function saveSessionMeta(meta: SessionMeta): void {
  const metaPath = getSessionMetaPath(meta.session_id);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

function extractFirstPrompt(transcriptPath: string): string | null {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'user' && entry.message?.content) {
          const content = entry.message.content;
          if (typeof content === 'string') {
            return content;
          } else if (Array.isArray(content)) {
            return content.map((c: any) => c.text || '').join('');
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function handleSessionStart(input: HookInput): void {
  const sessionId = input.session_id;

  // Check if session already exists
  let meta = loadSessionMeta(sessionId);
  if (meta) {
    // Session already created
    return;
  }

  // Skip session creation if this is a headless summarization session
  // (Check if first prompt contains our summary prompt)
  if (input.transcript_path && existsSync(input.transcript_path)) {
    const firstPrompt = extractFirstPrompt(input.transcript_path);
    if (firstPrompt && firstPrompt.includes('Please analyze this conversation transcript')) {
      // This is a summarization session, don't create a new session folder
      return;
    }
  }

  // Create new session
  const timestamp = getTimestamp();
  const title = 'new-session'; // Will be updated on Stop
  const folderName = `${timestamp}-${title}`;
  const sessionDir = join(SESSIONS_DIR, folderName);

  // Create directories
  mkdirSync(sessionDir, { recursive: true });
  mkdirSync(join(sessionDir, 'artifacts'), { recursive: true });
  mkdirSync(join(sessionDir, 'specs'), { recursive: true });

  // Save metadata
  meta = {
    session_id: sessionId,
    timestamp,
    title,
    folder_name: folderName,
    cwd: input.cwd || process.cwd(),
    started_at: getReadableTimestamp(),
    transcript_path: input.transcript_path,
  };
  saveSessionMeta(meta);

  // Export SESSION_DIR for other processes
  console.log(`SESSION_DIR=${sessionDir}`);
}

function handleStop(input: HookInput): void {
  const meta = loadSessionMeta(input.session_id);
  if (!meta) {
    console.error('No session metadata found');
    return;
  }

  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !existsSync(transcriptPath)) {
    console.error('Transcript not found:', transcriptPath);
    return;
  }

  // Update title if still default
  if (meta.title === 'new-session') {
    const firstPrompt = extractFirstPrompt(transcriptPath);
    if (firstPrompt) {
      const newTitle = generateTitle(firstPrompt);
      const newFolderName = `${meta.timestamp}-${newTitle}`;

      // Rename session folder
      const oldPath = join(SESSIONS_DIR, meta.folder_name);
      const newPath = join(SESSIONS_DIR, newFolderName);

      if (existsSync(oldPath) && !existsSync(newPath)) {
        const { renameSync } = require('fs');
        renameSync(oldPath, newPath);

        meta.title = newTitle;
        meta.folder_name = newFolderName;
        meta.transcript_path = transcriptPath;
        saveSessionMeta(meta);
      }
    }
  }

  const sessionDir = join(SESSIONS_DIR, meta.folder_name);
  const sessionMdPath = join(sessionDir, 'session.md');

  // Build the prompt for Claude to summarize the conversation
  const summaryPrompt = `Please analyze this conversation transcript and create a structured summary in markdown format.

The summary should include:
1. Session metadata (title, started time, session ID, working directory)
2. A brief overview of what was accomplished
3. User prompts (numbered list with timestamps)
4. Key actions taken by the agent (tool calls, decisions, implementations)
5. Important outcomes or artifacts created
6. Any issues or errors encountered

Format the summary as clean, readable markdown with proper headings and structure.
Make it easy to scan and understand what happened in this session.

Include a link to the full transcript at the end: file://${transcriptPath}

Here's the transcript:
---
${readFileSync(transcriptPath, 'utf-8')}
---

Write the summary now:`;

  console.error(`Generating session summary using Claude...`);

  // Run Claude in headless mode to generate summary
  // Note: The SessionStart hook will detect this is a summarization session and skip session folder creation
  const result = spawnSync('claude', ['-p', summaryPrompt], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.error) {
    console.error('Failed to run Claude:', result.error.message);
    // Fallback: create basic session.md
    const fallback = `# Session: ${meta.title}

**Started:** ${meta.started_at}
**Session ID:** ${meta.session_id}
**Working Directory:** ${meta.cwd}

---

## Summary

Session completed. Full transcript available at:
[View Transcript](file://${transcriptPath})

**Note:** Automatic summary generation failed. View the transcript for full details.
`;
    writeFileSync(sessionMdPath, fallback);
    console.error(`Session logged (fallback mode): ${sessionMdPath}`);
    return;
  }

  if (result.status !== 0) {
    console.error('Claude exited with error:', result.stderr);
    // Fallback
    const fallback = `# Session: ${meta.title}

**Started:** ${meta.started_at}
**Session ID:** ${meta.session_id}
**Working Directory:** ${meta.cwd}

---

## Summary

Session completed. Full transcript available at:
[View Transcript](file://${transcriptPath})

**Note:** Summary generation failed with exit code ${result.status}. View the transcript for full details.

Error output:
\`\`\`
${result.stderr}
\`\`\`
`;
    writeFileSync(sessionMdPath, fallback);
    console.error(`Session logged (fallback mode): ${sessionMdPath}`);
    return;
  }

  // Write Claude's summary to session.md
  let summary = result.stdout.trim();

  // Resolve environment variables in the summary
  // Replace ${VAR_NAME} with actual values from process.env
  summary = summary.replace(/\$\{([A-Z_]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });

  writeFileSync(sessionMdPath, summary);

  console.error(`Session logged: ${sessionMdPath}`);
}

// Main execution
try {
  const stdinData = readFileSync(0, 'utf-8');
  const input: HookInput = JSON.parse(stdinData);

  // Create sessions directory if it doesn't exist
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  // Route based on event
  if (input.hook_event_name === 'SessionStart') {
    handleSessionStart(input);
  } else if (input.hook_event_name === 'SessionEnd') {
    handleStop(input);
  }

  process.exit(0);
} catch (error: any) {
  console.error('Session hook error:', error.message);
  process.exit(0); // Non-blocking error
}

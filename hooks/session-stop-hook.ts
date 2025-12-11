#!/usr/bin/env bun

/**
 * Arkadian Session Stop Hook
 *
 * Triggered on SessionEnd event. Handles:
 * 1. Cleanup of session state file ({session_id}_state.txt)
 * 2. Preserves log file ({session_id}_log.txt) for debugging
 * 3. Spawns background worker for session summarization
 *
 * State Management:
 * - State file ({session_id}_state.txt) - DELETED on session end
 * - Log file ({session_id}_log.txt) - KEPT for debugging/audit
 *
 * Folder naming: YYYY-MM-DD-<meaningful-title>
 */

import { existsSync, readFileSync, writeFileSync, renameSync, appendFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { spawn, spawnSync } from 'child_process';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
// macOS: ~/Library/Application Support/Arkadian
// Linux: ~/.arkadian
// Falls back to ARKADIAN_DIR/log for backward compatibility
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    hook_event_name: string;
}

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
    if (!existsSync(ARKADIAN_DATA_DIR)) {
        mkdirSync(ARKADIAN_DATA_DIR, { recursive: true });
    }
}

/**
 * Log to per-session log file
 */
function log(sessionId: string, label: string, data: any) {
    const timestamp = new Date().toISOString();
    const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);

    let output = `[${timestamp}] [session-stop] ${label}: `;
    if (typeof data === 'object') {
        output += JSON.stringify(data);
    } else {
        output += data;
    }
    output += '\n';

    try {
        ensureDataDir();
        appendFileSync(logFile, output);
    } catch (e) {
        // Ignore logging errors
    }
}

function getDatePrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Clean up session state file.
 * State file is deleted on session end to allow cleanup.
 * Log file is KEPT for debugging/audit purposes.
 */
function cleanupSessionState(sessionId: string): void {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.txt`);

    try {
        if (existsSync(stateFile)) {
            // Read state before deletion for logging
            const stateContent = readFileSync(stateFile, 'utf-8');
            log(sessionId, 'state-before-cleanup', stateContent.trim());

            // Delete state file
            unlinkSync(stateFile);
            log(sessionId, 'state-cleanup', 'Deleted state file');
        } else {
            log(sessionId, 'state-cleanup', 'No state file found (sub-agent or already cleaned)');
        }

        // Log file is intentionally kept
        const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);
        if (existsSync(logFile)) {
            log(sessionId, 'log-preserved', `Log file kept at: ${logFile}`);
        }
    } catch (e: any) {
        log(sessionId, 'cleanup-error', e.message);
    }
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)
        .replace(/-$/, '');
}

function summarizeWithClaude(sessionId: string, transcriptPath: string, sessionDir: string): { title: string; summary: string } | null {
    log(sessionId, 'summarizeWithClaude', { transcriptPath, sessionDir });

    const transcript = readFileSync(transcriptPath, 'utf-8');
    log(sessionId, 'transcript-size', `${transcript.length} characters`);

    // Limit transcript size to avoid token limits
    const maxChars = 100000;
    const truncatedTranscript = transcript.length > maxChars
        ? transcript.substring(0, maxChars) + '\n\n[... transcript truncated for summarization ...]'
        : transcript;

    log(sessionId, 'truncated-size', `${truncatedTranscript.length} characters`);

    const prompt = `Analyze this Claude Code conversation transcript and provide:

1. A SHORT TITLE (6-9 words, lowercase with hyphens, describing the main task - e.g., "add-grpc-endpoint-arkd" or "fix-vtxo-expiry-bug")
2. A DETAILED SUMMARY in markdown format including:
   - What the user requested
   - Key actions taken
   - Files created/modified
   - Outcomes and results
   - Any issues encountered

Respond in this EXACT format:
TITLE: <short-hyphenated-title>
SUMMARY:
<markdown summary content>

Transcript:
---
${truncatedTranscript}
---`;

    log(sessionId, 'invoking-claude', 'Starting summarization with hooks disabled');

    // Run Claude with hooks disabled to avoid recursion
    const result = spawnSync('claude', [
        '-p', prompt,
        '--settings', '{"disableAllHooks": true}'
    ], {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000, // 2 minute timeout
    });

    if (result.error) {
        log(sessionId, 'claude-spawn-error', result.error.message);
        console.error('Claude summarization failed:', result.error);
        return null;
    }

    if (result.status !== 0) {
        log(sessionId, 'claude-non-zero-exit', { status: result.status, stderr: result.stderr });
        console.error('Claude summarization failed:', result.stderr);
        return null;
    }

    const output = result.stdout.trim();
    log(sessionId, 'response-length', `${output.length} characters`);
    log(sessionId, 'response-preview', output.substring(0, 500));

    // Parse the response
    const titleMatch = output.match(/TITLE:\s*(.+)/i);
    const summaryMatch = output.match(/SUMMARY:\s*([\s\S]+)/i);

    if (!titleMatch || !summaryMatch) {
        log(sessionId, 'parse-failed', { hasTitleMatch: !!titleMatch, hasSummaryMatch: !!summaryMatch });
        log(sessionId, 'full-response', output);
        console.error('Failed to parse Claude response');
        return null;
    }

    const parsedTitle = slugify(titleMatch[1].trim());
    log(sessionId, 'parsed-title', parsedTitle);
    log(sessionId, 'summary-length', `${summaryMatch[1].trim().length} characters`);

    return {
        title: parsedTitle,
        summary: summaryMatch[1].trim()
    };
}

function updateSessionMd(sessionId: string, sessionDir: string, summary: string): void {
    const sessionMdPath = join(sessionDir, 'session.md');
    log(sessionId, 'updateSessionMd', { sessionMdPath });

    if (!existsSync(sessionMdPath)) {
        log(sessionId, 'session.md-not-found', sessionMdPath);
        console.error('session.md not found:', sessionMdPath);
        return;
    }

    const existingContent = readFileSync(sessionMdPath, 'utf-8');
    const endTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const updatedContent = `${existingContent}

---

## Session Summary (Auto-Generated)

**Ended:** ${endTime}

${summary}
`;

    writeFileSync(sessionMdPath, updatedContent);
    log(sessionId, 'session.md-updated', 'Success');
}

function renameSessionFolder(sessionId: string, title: string): string | null {
    const oldPath = join(SESSIONS_DIR, sessionId);
    log(sessionId, 'renameSessionFolder', { title, oldPath });

    if (!existsSync(oldPath)) {
        log(sessionId, 'folder-not-found', oldPath);
        console.error('Session folder not found:', oldPath);
        return null;
    }

    const datePrefix = getDatePrefix();
    let newFolderName = `${datePrefix}-${title}`;
    let newPath = join(SESSIONS_DIR, newFolderName);

    // Handle duplicates by adding a suffix
    let counter = 1;
    while (existsSync(newPath)) {
        newFolderName = `${datePrefix}-${title}-${counter}`;
        newPath = join(SESSIONS_DIR, newFolderName);
        counter++;
    }

    log(sessionId, 'renaming-folder', { from: oldPath, to: newPath });

    try {
        renameSync(oldPath, newPath);
        log(sessionId, 'rename-success', newPath);
        return newPath;
    } catch (error: any) {
        log(sessionId, 'rename-failed', error.message);
        console.error('Failed to rename session folder:', error);
        return null;
    }
}

async function runSummarizationInBackground(sessionId: string, transcriptPath: string, sessionDir: string) {
    // Spawn a detached process that will survive parent termination
    const scriptPath = join(ARKADIAN_DIR, 'hooks/session-summarize-worker.ts');

    const child = spawn('bun', [scriptPath, sessionId, transcriptPath, sessionDir], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ARKADIAN_DIR, ARKADIAN_DATA_DIR }
    });

    // Unref allows parent to exit independently
    child.unref();

    log(sessionId, 'spawned-worker', { pid: child.pid });
}

async function main() {
    let sessionId = 'unknown';

    try {
        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);
        sessionId = hookInput.session_id;

        log(sessionId, 'hook-started', new Date().toISOString());
        log(sessionId, 'input', hookInput);

        // Only handle SessionEnd events
        if (hookInput.hook_event_name !== 'SessionEnd') {
            log(sessionId, 'skipping', `Not SessionEnd: ${hookInput.hook_event_name}`);
            process.exit(0);
        }

        const transcriptPath = hookInput.transcript_path;
        const sessionDir = join(SESSIONS_DIR, sessionId);

        log(sessionId, 'session-info', { transcriptPath, sessionDir });

        // Clean up session state file (but keep log file)
        cleanupSessionState(sessionId);

        // Check if session folder exists
        if (!existsSync(sessionDir)) {
            log(sessionId, 'session-folder-not-found', sessionDir);
            console.error('Session folder not found, skipping summarization');
            process.exit(0);
        }

        // Check if transcript exists
        if (!transcriptPath || !existsSync(transcriptPath)) {
            log(sessionId, 'transcript-not-found', transcriptPath);
            console.error('Transcript not found:', transcriptPath);
            process.exit(0);
        }

        // Spawn background worker for summarization (survives parent exit)
        await runSummarizationInBackground(sessionId, transcriptPath, sessionDir);

        console.error(`Session summarization started in background for ${sessionId}`);
        log(sessionId, 'hook-completed', 'Worker spawned');
        process.exit(0);
    } catch (error: any) {
        log(sessionId, 'fatal-error', { message: error.message, stack: error.stack });
        console.error('Session stop hook error:', error.message);
        process.exit(0); // Non-blocking error
    }
}

main();

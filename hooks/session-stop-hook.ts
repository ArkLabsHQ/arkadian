#!/usr/bin/env bun

/**
 * Arkadian Session Stop Hook
 *
 * Triggered on SessionEnd event. Reads the transcript, uses Claude (with hooks disabled)
 * to generate a summary, updates session.md, and renames the folder with a meaningful title.
 *
 * Folder naming: YYYY-MM-DD-<meaningful-title>
 */

import { existsSync, readFileSync, writeFileSync, renameSync, appendFileSync } from 'fs';
import { join, basename } from 'path';
import { spawn, spawnSync } from 'child_process';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');
const LOG_FILE = join(ARKADIAN_DIR, 'log/test.txt');

// Helper function for logging
function log(label: string, data: any) {
    const timestamp = new Date().toISOString();
    let output = `\n[${timestamp}] [session-stop] ${label}:\n`;

    if (typeof data === 'object') {
        output += JSON.stringify(data, null, 2);
    } else {
        output += data;
    }
    output += '\n';

    try {
        appendFileSync(LOG_FILE, output);
    } catch (e) {
        // Ignore logging errors
    }
}

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    hook_event_name: string;
}

function getDatePrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

function summarizeWithClaude(transcriptPath: string, sessionDir: string): { title: string; summary: string } | null {
    log('summarizeWithClaude', { transcriptPath, sessionDir });

    const transcript = readFileSync(transcriptPath, 'utf-8');
    log('Transcript size', `${transcript.length} characters`);

    // Limit transcript size to avoid token limits
    const maxChars = 100000;
    const truncatedTranscript = transcript.length > maxChars
        ? transcript.substring(0, maxChars) + '\n\n[... transcript truncated for summarization ...]'
        : transcript;

    log('Truncated transcript size', `${truncatedTranscript.length} characters`);

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

    log('Invoking Claude', 'Starting summarization with hooks disabled');

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
        log('Claude spawn error', result.error.message);
        console.error('Claude summarization failed:', result.error);
        return null;
    }

    if (result.status !== 0) {
        log('Claude non-zero exit', { status: result.status, stderr: result.stderr });
        console.error('Claude summarization failed:', result.stderr);
        return null;
    }

    const output = result.stdout.trim();
    log('Claude response length', `${output.length} characters`);
    log('Claude response preview', output.substring(0, 500));

    // Parse the response
    const titleMatch = output.match(/TITLE:\s*(.+)/i);
    const summaryMatch = output.match(/SUMMARY:\s*([\s\S]+)/i);

    if (!titleMatch || !summaryMatch) {
        log('Parse failed', { hasTitleMatch: !!titleMatch, hasSummaryMatch: !!summaryMatch });
        log('Full response', output);
        console.error('Failed to parse Claude response');
        return null;
    }

    const parsedTitle = slugify(titleMatch[1].trim());
    log('Parsed title', parsedTitle);
    log('Summary length', `${summaryMatch[1].trim().length} characters`);

    return {
        title: parsedTitle,
        summary: summaryMatch[1].trim()
    };
}

function updateSessionMd(sessionDir: string, summary: string): void {
    const sessionMdPath = join(sessionDir, 'session.md');
    log('updateSessionMd', { sessionMdPath });

    if (!existsSync(sessionMdPath)) {
        log('session.md not found', sessionMdPath);
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
    log('session.md updated', 'Success');
}

function renameSessionFolder(sessionId: string, title: string): string | null {
    const oldPath = join(SESSIONS_DIR, sessionId);
    log('renameSessionFolder', { sessionId, title, oldPath });

    if (!existsSync(oldPath)) {
        log('Session folder not found', oldPath);
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

    log('Renaming folder', { from: oldPath, to: newPath });

    try {
        renameSync(oldPath, newPath);
        log('Folder renamed successfully', newPath);
        return newPath;
    } catch (error: any) {
        log('Rename failed', error.message);
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
        env: { ...process.env, ARKADIAN_DIR }
    });

    // Unref allows parent to exit independently
    child.unref();

    log('Spawned background worker', { pid: child.pid, sessionId });
}

async function main() {
    try {
        log('=== Session Stop Hook Started ===', new Date().toISOString());

        const input = await Bun.stdin.text();
        log('Raw input', input);

        const hookInput: HookInput = JSON.parse(input);
        log('Parsed hookInput', hookInput);

        // Only handle SessionEnd events
        if (hookInput.hook_event_name !== 'SessionEnd') {
            log('Skipping - not SessionEnd', hookInput.hook_event_name);
            process.exit(0);
        }

        const sessionId = hookInput.session_id;
        const transcriptPath = hookInput.transcript_path;
        const sessionDir = join(SESSIONS_DIR, sessionId);

        log('Session info', { sessionId, transcriptPath, sessionDir });

        // Check if session folder exists
        if (!existsSync(sessionDir)) {
            log('Session folder not found', sessionDir);
            console.error('Session folder not found, skipping summarization');
            process.exit(0);
        }

        // Check if transcript exists
        if (!transcriptPath || !existsSync(transcriptPath)) {
            log('Transcript not found', transcriptPath);
            console.error('Transcript not found:', transcriptPath);
            process.exit(0);
        }

        // Spawn background worker for summarization (survives parent exit)
        await runSummarizationInBackground(sessionId, transcriptPath, sessionDir);

        console.error(`Session summarization started in background for ${sessionId}`);
        log('=== Session Stop Hook Completed (worker spawned) ===', new Date().toISOString());
        process.exit(0);
    } catch (error: any) {
        log('FATAL ERROR', { message: error.message, stack: error.stack });
        console.error('Session stop hook error:', error.message);
        process.exit(0); // Non-blocking error
    }
}

main();

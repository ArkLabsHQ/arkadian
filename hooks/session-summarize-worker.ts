#!/usr/bin/env bun

/**
 * Arkadian Session Summarize Worker
 *
 * Background worker that summarizes a session transcript using Claude.
 * This runs as a detached process so it survives the parent hook termination.
 *
 * Logs to per-session log file: {ARKADIAN_DATA_DIR}/{session_id}_log.txt
 *
 * Usage: bun session-summarize-worker.ts <sessionId> <transcriptPath> <sessionDir>
 */

import { existsSync, readFileSync, writeFileSync, renameSync, appendFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { spawnSync } from 'child_process';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
// macOS: ~/Library/Application Support/Arkadian
// Linux: ~/.arkadian
// Falls back to ARKADIAN_DIR/log for backward compatibility
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

// Global session ID - set in main()
let CURRENT_SESSION_ID = 'unknown';

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
function log(label: string, data: any) {
    const timestamp = new Date().toISOString();
    const logFile = join(ARKADIAN_DATA_DIR, `${CURRENT_SESSION_ID}_log.txt`);

    let output = `[${timestamp}] [summarize-worker] ${label}: `;
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

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)
        .replace(/-$/, '');
}

function summarizeWithClaude(transcriptPath: string): { title: string; summary: string } | null {
    log('Reading transcript', transcriptPath);

    const transcript = readFileSync(transcriptPath, 'utf-8');
    log('Transcript size', `${transcript.length} characters`);

    // Limit transcript size to avoid token limits
    const maxChars = 100000;
    const truncatedTranscript = transcript.length > maxChars
        ? transcript.substring(0, maxChars) + '\n\n[... transcript truncated for summarization ...]'
        : transcript;

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
        timeout: 180000, // 3 minute timeout
    });

    if (result.error) {
        log('Claude spawn error', result.error.message);
        return null;
    }

    if (result.status !== 0) {
        log('Claude non-zero exit', { status: result.status, stderr: result.stderr });
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
        return null;
    }

    const parsedTitle = slugify(titleMatch[1].trim());
    log('Parsed title', parsedTitle);

    return {
        title: parsedTitle,
        summary: summaryMatch[1].trim()
    };
}

function updateSessionMd(sessionDir: string, summary: string): void {
    const sessionMdPath = join(sessionDir, 'session.md');
    log('Updating session.md', sessionMdPath);

    if (!existsSync(sessionMdPath)) {
        log('session.md not found', sessionMdPath);
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
    log('Renaming folder', { sessionId, title, oldPath });

    if (!existsSync(oldPath)) {
        log('Session folder not found', oldPath);
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

    try {
        renameSync(oldPath, newPath);
        log('Folder renamed successfully', newPath);
        return newPath;
    } catch (error: any) {
        log('Rename failed', error.message);
        return null;
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.error('Invalid arguments:', args);
        process.exit(1);
    }

    const [sessionId, transcriptPath, sessionDir] = args;

    // Set global session ID for logging
    CURRENT_SESSION_ID = sessionId;

    log('worker-started', { transcriptPath, sessionDir });

    try {
        // Verify paths exist
        if (!existsSync(sessionDir)) {
            log('session-folder-not-found', sessionDir);
            process.exit(1);
        }

        if (!existsSync(transcriptPath)) {
            log('transcript-not-found', transcriptPath);
            process.exit(1);
        }

        // Get summary from Claude
        const result = summarizeWithClaude(transcriptPath);

        if (result) {
            log('summarization-successful', { title: result.title });

            // Update session.md with summary
            updateSessionMd(sessionDir, result.summary);

            // Rename folder with meaningful title
            const newPath = renameSessionFolder(sessionId, result.title);

            if (newPath) {
                log('session-complete', basename(newPath));
            }
        } else {
            log('summarization-failed', 'Using fallback');

            // Fallback: just add end time to session.md
            const sessionMdPath = join(sessionDir, 'session.md');
            if (existsSync(sessionMdPath)) {
                const existingContent = readFileSync(sessionMdPath, 'utf-8');
                const endTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
                writeFileSync(sessionMdPath, `${existingContent}\n\n---\n\n**Ended:** ${endTime}\n\n_Automatic summary generation failed. View transcript for details._\n`);
                log('fallback-session.md-updated', sessionMdPath);
            }

            // Rename with generic title
            renameSessionFolder(sessionId, 'session');
        }

        log('worker-completed', new Date().toISOString());
        process.exit(0);
    } catch (error: any) {
        log('fatal-error', { message: error.message, stack: error.stack });
        process.exit(1);
    }
}

main();

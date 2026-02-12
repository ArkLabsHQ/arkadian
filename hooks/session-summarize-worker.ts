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

import { existsSync, readFileSync, writeFileSync, renameSync, appendFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename, relative } from 'path';
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

function summarizeWithClaude(transcriptPath: string): { project: string; title: string; summary: string } | null {
    log('Reading transcript', transcriptPath);

    const transcript = readFileSync(transcriptPath, 'utf-8');
    log('Transcript size', `${transcript.length} characters`);

    // Limit transcript size to avoid token limits
    const maxChars = 100000;
    const truncatedTranscript = transcript.length > maxChars
        ? transcript.substring(0, maxChars) + '\n\n[... transcript truncated for summarization ...]'
        : transcript;

    const prompt = `Analyze this Claude Code conversation transcript and provide:

1. PRIMARY_PROJECT: The main Ark project this session worked on. Must be one of:
   arkd, go-sdk, wallet, ark-faucet, ark-simulator, ark-telemetry,
   ark-infra, kms-unlocker, fulmine, boltz-backend, ark-docs, arkade-escrow, arkadian
   If multiple projects, choose the PRIMARY one. If unclear or general, use "misc".

2. A SHORT TITLE (6-9 words, lowercase with hyphens, describing the main task - e.g., "add-grpc-endpoint-arkd" or "fix-vtxo-expiry-bug")

3. A DETAILED SUMMARY in markdown format including:
   - What the user requested
   - Key actions taken
   - Files created/modified
   - Outcomes and results
   - Any issues encountered

Respond in this EXACT format:
PROJECT: <project-id>
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
    const projectMatch = output.match(/PROJECT:\s*(.+)/i);
    const titleMatch = output.match(/TITLE:\s*(.+)/i);
    const summaryMatch = output.match(/SUMMARY:\s*([\s\S]+)/i);

    if (!titleMatch || !summaryMatch) {
        log('Parse failed', { hasProjectMatch: !!projectMatch, hasTitleMatch: !!titleMatch, hasSummaryMatch: !!summaryMatch });
        log('Full response', output);
        return null;
    }

    // Validate and normalize project ID
    const validProjects = [
        'arkd', 'go-sdk', 'wallet', 'ark-faucet', 'ark-simulator', 'ark-telemetry',
        'ark-infra', 'kms-unlocker', 'fulmine', 'boltz-backend', 'ark-docs', 'arkade-escrow', 'arkadian'
    ];
    let project = projectMatch ? projectMatch[1].trim().toLowerCase() : 'misc';
    if (!validProjects.includes(project)) {
        project = 'misc';
    }

    const parsedTitle = slugify(titleMatch[1].trim());
    log('Parsed', { project, title: parsedTitle });

    return {
        project,
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

function renameSessionFolder(sessionId: string, title: string, project: string): string | null {
    const oldPath = join(SESSIONS_DIR, sessionId);
    log('Renaming folder', { sessionId, title, project, oldPath });

    if (!existsSync(oldPath)) {
        log('Session folder not found', oldPath);
        return null;
    }

    // Ensure project directory exists
    const projectDir = join(SESSIONS_DIR, project);
    if (!existsSync(projectDir)) {
        mkdirSync(projectDir, { recursive: true });
        log('Created project directory', projectDir);
    }

    const datePrefix = getDatePrefix();
    let newFolderName = `${datePrefix}-${title}`;
    let newPath = join(projectDir, newFolderName);

    // Handle duplicates by adding a suffix
    let counter = 1;
    while (existsSync(newPath)) {
        newFolderName = `${datePrefix}-${title}-${counter}`;
        newPath = join(projectDir, newFolderName);
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

/**
 * Session index entry for fast searching by ark-scout
 */
interface SessionIndexEntry {
    session_id: string;
    session_dir: string;
    project: string;
    title: string;
    intent: string | null;
    keywords: string[];
    outcome: 'success' | 'failed' | 'partial' | 'unknown';
    artifacts: string[];
    created_at: string;
}

/**
 * Extract keywords from text (workflow description, assessment, etc.)
 */
function extractKeywords(text: string): string[] {
    // Common Ark-related terms to look for
    const arkTerms = [
        'vtxo', 'utxo', 'round', 'sweep', 'settlement', 'expiry', 'connector',
        'forfeit', 'redeem', 'claim', 'asp', 'vhtlc', 'htlc', 'swap', 'bolt',
        'grpc', 'api', 'endpoint', 'client', 'server', 'wallet', 'transaction',
        'signing', 'cosign', 'musig', 'taproot', 'script', 'witness',
        'database', 'migration', 'test', 'bug', 'fix', 'feature', 'refactor'
    ];

    const foundTerms: Set<string> = new Set();
    const lowerText = text.toLowerCase();

    for (const term of arkTerms) {
        if (lowerText.includes(term)) {
            foundTerms.add(term);
        }
    }

    // Also extract capitalized words that might be important (class names, etc.)
    const capitalizedWords = text.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
    for (const word of capitalizedWords) {
        if (word.length > 3 && word.length < 30) {
            foundTerms.add(word.toLowerCase());
        }
    }

    return Array.from(foundTerms).slice(0, 20); // Limit to 20 keywords
}

/**
 * Determine session outcome from test reports
 */
function determineOutcome(sessionDir: string): 'success' | 'failed' | 'partial' | 'unknown' {
    const testReportPaths = [
        'artifacts/test/report.yaml',
        'artifacts/S4/test_report.yaml',
        'artifacts/S4/report.yaml'
    ];

    for (const reportPath of testReportPaths) {
        const fullPath = join(sessionDir, reportPath);
        if (existsSync(fullPath)) {
            try {
                const content = readFileSync(fullPath, 'utf-8');
                const statusMatch = content.match(/^status:\s*["']?(\w+)/m);
                if (statusMatch) {
                    const status = statusMatch[1].toLowerCase();
                    if (status === 'passed' || status === 'success') return 'success';
                    if (status === 'failed' || status === 'failure') return 'failed';
                    if (status === 'partial') return 'partial';
                }
            } catch (e) {
                // Ignore read errors
            }
        }
    }
    return 'unknown';
}

/**
 * List artifact files in session
 */
function listArtifacts(sessionDir: string): string[] {
    const artifacts: string[] = [];
    const artifactsDir = join(sessionDir, 'artifacts');

    if (!existsSync(artifactsDir)) return artifacts;

    function scanDir(dir: string, prefix: string = '') {
        try {
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    scanDir(join(dir, entry.name), relPath);
                } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
                    artifacts.push(relPath);
                }
            }
        } catch (e) {
            // Ignore scan errors
        }
    }

    scanDir(artifactsDir);
    return artifacts;
}

/**
 * Update the session index with this session's metadata.
 * Creates sessions/.index/manifest.json if it doesn't exist.
 */
function updateSessionIndex(
    sessionDir: string,
    project: string,
    title: string,
    summary: string
): void {
    const indexDir = join(SESSIONS_DIR, '.index');
    const manifestPath = join(indexDir, 'manifest.json');

    log('Updating session index', { sessionDir, project, title });

    // Ensure index directory exists
    if (!existsSync(indexDir)) {
        mkdirSync(indexDir, { recursive: true });
        log('Created index directory', indexDir);
    }

    // Extract intent from workflow.yaml if exists
    let intent: string | null = null;
    const workflowPath = join(sessionDir, 'workflow.yaml');
    if (existsSync(workflowPath)) {
        try {
            const workflowContent = readFileSync(workflowPath, 'utf-8');
            const intentMatch = workflowContent.match(/primary_intent:\s*["']?([^"'\n]+)/);
            if (intentMatch) {
                intent = intentMatch[1].trim();
            }
        } catch (e) {
            // Ignore read errors
        }
    }

    // Extract keywords from summary and workflow description
    let keywordSource = summary;
    if (existsSync(workflowPath)) {
        try {
            keywordSource += ' ' + readFileSync(workflowPath, 'utf-8');
        } catch (e) {
            // Ignore
        }
    }
    // Also check assessment if exists
    const assessmentPath = join(sessionDir, 'artifacts/explore/assessment.yaml');
    if (existsSync(assessmentPath)) {
        try {
            keywordSource += ' ' + readFileSync(assessmentPath, 'utf-8');
        } catch (e) {
            // Ignore
        }
    }

    const keywords = extractKeywords(keywordSource);
    const outcome = determineOutcome(sessionDir);
    const artifacts = listArtifacts(sessionDir);

    // Create index entry
    const entry: SessionIndexEntry = {
        session_id: basename(sessionDir),
        session_dir: sessionDir,
        project,
        title,
        intent,
        keywords,
        outcome,
        artifacts,
        created_at: new Date().toISOString()
    };

    // Load existing manifest or create new
    let manifest: SessionIndexEntry[] = [];
    if (existsSync(manifestPath)) {
        try {
            manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        } catch (e) {
            log('Failed to parse existing manifest, starting fresh', e);
            manifest = [];
        }
    }

    // Remove existing entry for this session (by session_dir) if exists
    manifest = manifest.filter(e => e.session_dir !== sessionDir);

    // Add new entry
    manifest.push(entry);

    // Sort by created_at descending (newest first)
    manifest.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Write manifest
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log('Session index updated', { entries: manifest.length, sessionId: entry.session_id });

    // Also update by_project.json for fast lookup
    const byProjectPath = join(indexDir, 'by_project.json');
    const byProject: Record<string, string[]> = {};

    for (const e of manifest) {
        if (!byProject[e.project]) {
            byProject[e.project] = [];
        }
        byProject[e.project].push(e.session_id);
    }

    writeFileSync(byProjectPath, JSON.stringify(byProject, null, 2));
    log('by_project.json updated', Object.keys(byProject));
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
            log('summarization-successful', { project: result.project, title: result.title });

            // Update session.md with summary
            updateSessionMd(sessionDir, result.summary);

            // Rename folder with meaningful title under project directory
            const newPath = renameSessionFolder(sessionId, result.title, result.project);

            if (newPath) {
                log('session-complete', basename(newPath));

                // Update session index for ark-scout searching
                updateSessionIndex(newPath, result.project, result.title, result.summary);
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

            // Rename with generic title under misc
            renameSessionFolder(sessionId, 'session', 'misc');
        }

        log('worker-completed', new Date().toISOString());
        process.exit(0);
    } catch (error: any) {
        log('fatal-error', { message: error.message, stack: error.stack });
        process.exit(1);
    }
}

main();

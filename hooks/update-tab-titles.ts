#!/usr/bin/env bun
/**
 * Tab Title Update Hook for Arkadian
 *
 * Updates terminal tab title based on user prompt to provide context about
 * what the orchestrator is working on.
 *
 * Triggered: UserPromptSubmit (before processing request)
 *
 * Flow:
 * 1. User submits prompt
 * 2. This hook runs and sets tab title to "♻️ <summary>..."
 * 3. Orchestrator processes request
 * 4. (Future: Stop hook updates to completion message)
 */

import { execSync } from 'child_process';

interface HookInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
  hook_event_name: string;
}

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => {
      reject(new Error('Timeout reading from stdin'));
    }, timeout);

    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
    });

    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });

    process.stdin.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Generate a concise tab title from user prompt
 * Filters stop words and extracts 3-4 meaningful words
 */
function generateTabTitle(prompt: string): string {
  // Clean the prompt
  const cleanPrompt = prompt.replace(/[^\w\s]/g, ' ').trim();

  // Stop words to filter out
  const stopWords = new Set([
    'the', 'and', 'but', 'for', 'are', 'with', 'you', 'can',
    'will', 'have', 'been', 'your', 'from', 'they', 'were',
    'said', 'what', 'them', 'just', 'told', 'how', 'does',
    'into', 'about', 'this', 'that', 'his', 'her'
  ]);

  // Extract meaningful words
  const words = cleanPrompt
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
    .slice(0, 4);

  if (words.length === 0) {
    return 'Processing request...';
  }

  // Capitalize first word, lowercase rest
  const title = words
    .map((word, idx) =>
      idx === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase()
    )
    .join(' ');

  return title + '...';
}

/**
 * Set terminal tab title
 * Works with Kitty, iTerm2, Ghostty, and other modern terminals
 */
function setTerminalTabTitle(title: string): void {
  try {
    const escapedTitle = title.replace(/'/g, "'\\''");

    // OSC 0 - Icon and window title
    execSync(`printf '\\033]0;${escapedTitle}\\007' >&2`, { stdio: 'ignore' });

    // OSC 2 - Window title
    execSync(`printf '\\033]2;${escapedTitle}\\007' >&2`, { stdio: 'ignore' });

    // OSC 30 - Kitty-specific tab title
    execSync(`printf '\\033]30;${escapedTitle}\\007' >&2`, { stdio: 'ignore' });
  } catch (e) {
    // Silently fail if terminal doesn't support title sequences
  }
}

async function main() {
  try {
    // Read hook input from stdin
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);

    const prompt = data.prompt || '';

    // Generate and set tab title
    if (prompt.length > 3) {
      const tabTitle = '♻️ ' + generateTabTitle(prompt);
      setTerminalTabTitle(tabTitle);
      console.error(`📍 Tab title set: "${tabTitle}"`);
    }

    process.exit(0);
  } catch (error) {
    // Silently fail to not interrupt orchestrator flow
    console.error('Tab title update error:', error);
    process.exit(0);
  }
}

main();

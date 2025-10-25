#!/usr/bin/env bun
/**
 * Context Compression Hook for Arkadian
 *
 * Triggered before Claude Code compresses context to warn the user that
 * the context window is nearly full (approaching 200K token limit).
 *
 * Triggered: PreCompact (before context compression)
 *
 * Purpose:
 * - Notify user that context limit is being reached
 * - Provide stats about current session (message count, token usage)
 * - Suggest actions (start new session, focus queries)
 *
 * Context Budget Strategy (from CLAUDE.md):
 * - 200K total tokens
 * - Tier 1 (Master Index): 5K
 * - Tier 2 (Project Indexes): 10K
 * - Tier 3 (Deep Docs): 50K
 * - Tier 4 (Code): 100K
 * - Agent Scratch: 15K
 * - Response Buffer: 20K
 */

import { readFileSync, existsSync } from 'fs';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  compact_type?: string;
}

interface TranscriptEntry {
  type: string;
  message?: {
    role?: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  };
  timestamp?: string;
}

/**
 * Count messages in transcript to provide context stats
 */
function getTranscriptStats(transcriptPath: string): { messageCount: number; userMessages: number; assistantMessages: number } {
  try {
    if (!existsSync(transcriptPath)) {
      return { messageCount: 0, userMessages: 0, assistantMessages: 0 };
    }

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let userMessages = 0;
    let assistantMessages = 0;

    for (const line of lines) {
      if (line.trim()) {
        try {
          const entry: TranscriptEntry = JSON.parse(line);
          if (entry.type === 'user') userMessages++;
          if (entry.type === 'assistant') assistantMessages++;
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    return {
      messageCount: userMessages + assistantMessages,
      userMessages,
      assistantMessages
    };
  } catch {
    return { messageCount: 0, userMessages: 0, assistantMessages: 0 };
  }
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

async function main() {
  try {
    // Read hook input from stdin
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);

    const transcriptPath = data.transcript_path;
    const compactType = data.compact_type || 'unknown';

    console.error('\n⚠️  CONTEXT COMPRESSION TRIGGERED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get transcript stats
    const stats = getTranscriptStats(transcriptPath);

    console.error(`📊 Session Statistics:`);
    console.error(`   • Total messages: ${stats.messageCount}`);
    console.error(`   • User prompts: ${stats.userMessages}`);
    console.error(`   • Assistant responses: ${stats.assistantMessages}`);
    console.error(`   • Compression type: ${compactType}`);

    console.error('\n💡 Context Budget Status:');
    console.error('   • Approaching 200K token limit');
    console.error('   • Claude Code will compress context to free space');
    console.error('   • Earlier messages may be summarized or removed');

    console.error('\n📋 Recommended Actions:');
    console.error('   1. Complete current task if close to finishing');
    console.error('   2. Start a new session for complex new tasks');
    console.error('   3. Focus queries on specific projects to reduce context');
    console.error('   4. Avoid loading Tier 4 (code) unless necessary');

    console.error('\n🔄 Continuing session with compressed context...');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Output a system reminder for Claude to see
    const reminder = `<system-reminder>
Context compression triggered. Session has ${stats.messageCount} messages (${stats.userMessages} user, ${stats.assistantMessages} assistant).

Approaching 200K token limit. To maintain quality:
- Prioritize essential context loading
- Avoid loading Tier 4 (code files) unless critical
- Consider suggesting user start new session for complex new tasks
- Focus on Tier 1-3 documentation when possible
</system-reminder>`;

    console.log(reminder);

    process.exit(0);
  } catch (error) {
    // Silently fail to not interrupt orchestrator flow
    console.error('Context compression hook error:', error);
    process.exit(0);
  }
}

main();

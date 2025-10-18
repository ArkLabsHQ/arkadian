#!/usr/bin/env node
/**
 * Arkadian Environment Validation and Freshness Check Hook
 *
 * Triggered on SessionStart to:
 * 1. Validate all required Arkadian environment variables are set
 * 2. Check documentation freshness (commits behind upstream)
 *
 * This ensures documentation paths work correctly and warns about stale documentation.
 *
 * Hook Type: SessionStart
 * Behavior: Non-blocking (warnings only, never blocks Claude Code)
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Required Arkadian environment variables with project mapping
 */
const REQUIRED_VARS = [
  { name: "ARKADIAN_DOCS", description: "Arkadian documentation root", project: null },
  { name: "ARKD_REPO", description: "arkd server repository", project: "arkd" },
  { name: "GO_SDK_REPO", description: "Go SDK repository", project: "go-sdk" },
  { name: "WALLET_REPO", description: "Wallet (React PWA) repository", project: "wallet" },
  { name: "ARK_FAUCET_REPO", description: "Ark Faucet repository", project: "ark-faucet" },
  { name: "ARK_SIMULATOR_REPO", description: "Ark Simulator repository", project: "ark-simulator" },
  { name: "ARK_TELEMETRY_REPO", description: "Ark Telemetry repository", project: "ark-telemetry" },
  { name: "ARK_INFRA_REPO", description: "Ark Infrastructure repository", project: "ark-infra" },
  { name: "KMS_UNLOCKER_REPO", description: "KMS Unlocker repository", project: "kms-unlocker" },
  { name: "FULMINE_REPO", description: "Fulmine (Lightning) repository", project: "fulmine" },
  { name: "ARK_DOCS_REPO", description: "Ark Documentation repository", project: "ark-docs" },
  { name: "ARKADE_ESCROW_REPO", description: "Arkade Escrow repository", project: "arkade-escrow" },
];

/**
 * Read stdin with timeout
 */
function readStdinWithTimeout(timeout = 5000) {
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
 * Check if a directory exists
 */
function directoryExists(path) {
  try {
    const stat = fs.statSync(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Validate Arkadian environment variables
 */
function validateEnvironment() {
  const missing = [];
  const invalid = [];
  let valid = 0;

  for (const varInfo of REQUIRED_VARS) {
    const value = process.env[varInfo.name];

    if (!value) {
      missing.push(varInfo);
    } else if (!directoryExists(value)) {
      invalid.push({ ...varInfo, value });
    } else {
      valid++;
    }
  }

  return { missing, invalid, valid };
}

/**
 * Execute git command safely
 */
function gitCommand(repoPath, command) {
  try {
    const output = execSync(`git -C "${repoPath}" ${command}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Read last sync commit from change-log/last-sync.txt
 */
function getLastSyncCommit(projectId) {
  const arkadianDocs = process.env.ARKADIAN_DOCS;
  if (!arkadianDocs) return null;

  const lastSyncFile = path.join(arkadianDocs, 'docs', 'projects', projectId, 'change-log', 'last-sync.txt');

  try {
    if (fs.existsSync(lastSyncFile)) {
      return fs.readFileSync(lastSyncFile, 'utf8').trim();
    }
  } catch (error) {
    // Silently fail
  }

  return null;
}

/**
 * Check documentation freshness for a project
 */
function checkProjectFreshness(projectId, repoPath) {
  // Get last sync commit
  const lastSyncCommit = getLastSyncCommit(projectId);
  if (!lastSyncCommit) {
    return { project: projectId, status: 'unknown', reason: 'No sync marker found' };
  }

  // Get current commit
  const currentCommit = gitCommand(repoPath, 'rev-parse HEAD');
  if (!currentCommit) {
    return { project: projectId, status: 'error', reason: 'Not a git repository' };
  }

  // Check if commits are the same
  if (currentCommit === lastSyncCommit) {
    // Check for uncommitted changes
    const status = gitCommand(repoPath, 'status --porcelain');
    if (status && status.length > 0) {
      return {
        project: projectId,
        status: 'dirty',
        currentCommit: currentCommit.substring(0, 7),
        lastSyncCommit: lastSyncCommit.substring(0, 7)
      };
    }

    return {
      project: projectId,
      status: 'fresh',
      currentCommit: currentCommit.substring(0, 7)
    };
  }

  // Count commits ahead
  const commitCount = gitCommand(repoPath, `rev-list ${lastSyncCommit}..HEAD --count`);

  if (commitCount === null || commitCount === '0') {
    // lastSyncCommit might be ahead (different branch or history rewrite)
    return {
      project: projectId,
      status: 'diverged',
      currentCommit: currentCommit.substring(0, 7),
      lastSyncCommit: lastSyncCommit.substring(0, 7)
    };
  }

  return {
    project: projectId,
    status: 'behind',
    commitsBehind: parseInt(commitCount, 10),
    currentCommit: currentCommit.substring(0, 7),
    lastSyncCommit: lastSyncCommit.substring(0, 7)
  };
}

/**
 * Check documentation freshness for all projects
 */
function checkDocumentationFreshness() {
  const results = [];

  for (const varInfo of REQUIRED_VARS) {
    // Skip ARKADIAN_DOCS (not a project repo)
    if (!varInfo.project) continue;

    const repoPath = process.env[varInfo.name];
    if (!repoPath || !directoryExists(repoPath)) {
      continue; // Skip if env var not set or invalid
    }

    const freshnessInfo = checkProjectFreshness(varInfo.project, repoPath);
    results.push(freshnessInfo);
  }

  return results;
}

/**
 * Display validation results
 */
function displayResults(missing, invalid, valid) {
  const total = REQUIRED_VARS.length;

  // If everything is OK, stay silent
  if (missing.length === 0 && invalid.length === 0) {
    console.error(`✅ Arkadian environment: ${valid}/${total} variables configured`);
    return;
  }

  // Show warning header
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('⚠️  ARKADIAN ENVIRONMENT CHECK');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Show statistics
  console.error(`\n📊 Status: ${valid}/${total} variables configured correctly\n`);

  // Show missing variables
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables (${missing.length}):\n`);
    for (const varInfo of missing) {
      console.error(`   - ${varInfo.name}`);
      console.error(`     ${varInfo.description}`);
    }
    console.error('');
  }

  // Show invalid variables (set but directory doesn't exist)
  if (invalid.length > 0) {
    console.error(`⚠️  Invalid paths (directory doesn't exist) (${invalid.length}):\n`);
    for (const varInfo of invalid) {
      console.error(`   - ${varInfo.name}="${varInfo.value}"`);
      console.error(`     ${varInfo.description}`);
    }
    console.error('');
  }

  // Show setup instructions
  console.error('📋 Setup Instructions:\n');
  console.error('   1. Copy template:');
  console.error('      cp scripts/env-setup-template.sh ~/.arkadian-env.sh\n');
  console.error('   2. Edit with your actual paths:');
  console.error('      vim ~/.arkadian-env.sh\n');
  console.error('   3. Source in your shell RC file:');
  console.error('      echo \'source ~/.arkadian-env.sh\' >> ~/.zshrc\n');
  console.error('   4. Reload your shell:');
  console.error('      source ~/.zshrc\n');
  console.error('   5. Verify setup:');
  console.error('      verify_arkadian_repos\n');

  console.error('💡 Note: These variables enable ${VAR} path resolution in documentation.');
  console.error('   Claude Code will expand them when accessing Arkadian project files.\n');

  console.error('⚠️  Some Arkadian features may not work correctly without these variables.');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Display documentation freshness results
 */
function displayFreshnessResults(results) {
  if (results.length === 0) {
    return; // No projects to check
  }

  // Count status types
  let freshCount = 0;
  let behindCount = 0;
  let dirtyCount = 0;
  let unknownCount = 0;
  let errorCount = 0;
  let divergedCount = 0;

  const staleProjects = [];

  for (const result of results) {
    switch (result.status) {
      case 'fresh':
        freshCount++;
        break;
      case 'behind':
        behindCount++;
        staleProjects.push(result.project);
        break;
      case 'dirty':
        dirtyCount++;
        staleProjects.push(result.project);
        break;
      case 'unknown':
        unknownCount++;
        break;
      case 'error':
        errorCount++;
        break;
      case 'diverged':
        divergedCount++;
        staleProjects.push(result.project);
        break;
    }
  }

  // Only show if there are issues or if at least one project is behind/dirty
  const hasIssues = behindCount > 0 || dirtyCount > 0 || divergedCount > 0 || unknownCount > 0 || errorCount > 0;

  if (!hasIssues && freshCount === results.length) {
    // Everything is fresh, show compact message
    console.error(`✅ Documentation freshness: ${freshCount}/${results.length} projects in sync\n`);
    return;
  }

  // Show detailed freshness status
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('📚 DOCUMENTATION FRESHNESS STATUS');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Display each project status
  for (const result of results) {
    const projectName = result.project.padEnd(18);

    switch (result.status) {
      case 'fresh':
        console.error(`   ✅ ${projectName} FRESH (in sync with ${result.currentCommit})`);
        break;
      case 'behind':
        console.error(`   ⚠️  ${projectName} ${result.commitsBehind} commit${result.commitsBehind > 1 ? 's' : ''} ahead (last sync: ${result.lastSyncCommit})`);
        break;
      case 'dirty':
        console.error(`   ⚠️  ${projectName} DIRTY (uncommitted changes at ${result.currentCommit})`);
        break;
      case 'diverged':
        console.error(`   ⚠️  ${projectName} DIVERGED (current: ${result.currentCommit}, last sync: ${result.lastSyncCommit})`);
        break;
      case 'unknown':
        console.error(`   ℹ️  ${projectName} ${result.reason}`);
        break;
      case 'error':
        console.error(`   ❌ ${projectName} ${result.reason}`);
        break;
    }
  }

  // Summary
  console.error('');
  console.error(`📊 Summary: ${freshCount}/${results.length} fresh`);
  if (behindCount > 0) console.error(`   ${behindCount} behind upstream`);
  if (dirtyCount > 0) console.error(`   ${dirtyCount} with uncommitted changes`);
  if (divergedCount > 0) console.error(`   ${divergedCount} diverged`);
  if (unknownCount > 0) console.error(`   ${unknownCount} unknown status`);
  if (errorCount > 0) console.error(`   ${errorCount} errors`);

  // Show refresh command if there are stale projects
  if (staleProjects.length > 0) {
    console.error('');
    console.error(`💡 To refresh stale docs: arkadian-refresh-docs ${staleProjects.join(' ')}`);
    console.error('   (Coming in Phase 2 - manual refresh command)');
  }

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Main hook execution
 */
async function main() {
  try {
    // Read SessionStart hook input from stdin
    const input = await readStdinWithTimeout();
    const data = JSON.parse(input);

    // Only run validation on actual startup (not on resume/compact)
    if (data.source !== 'startup') {
      process.exit(0);
      return;
    }

    // Validate environment
    const { missing, invalid, valid } = validateEnvironment();

    // Display environment validation results
    displayResults(missing, invalid, valid);

    // Check documentation freshness (only if environment is valid)
    if (missing.length === 0 && invalid.length === 0) {
      const freshnessResults = checkDocumentationFreshness();
      displayFreshnessResults(freshnessResults);
    }

    // Always exit successfully (non-blocking)
    process.exit(0);
  } catch (error) {
    // Silently fail to not interrupt Claude's flow
    // Log to stderr for debugging if needed
    console.error('Arkadian hook error:', error.message);
    process.exit(0); // Exit cleanly even on error (non-blocking)
  }
}

main();

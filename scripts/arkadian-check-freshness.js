#!/usr/bin/env node
/**
 * Arkadian Documentation Freshness Checker
 *
 * Checks documentation staleness across all Arkadian projects.
 * Compares current commit in each repository with last sync commit.
 *
 * Usage:
 *   arkadian-check-freshness                    # Check all projects
 *   arkadian-check-freshness arkd go-sdk        # Check specific projects
 *   arkadian-check-freshness --verbose          # Show recent commit messages
 *   arkadian-check-freshness --json             # Output JSON format
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Project configuration with environment variable mapping
 */
const PROJECTS = [
  { id: 'arkd', envVar: 'ARKD_REPO' },
  { id: 'go-sdk', envVar: 'GO_SDK_REPO' },
  { id: 'wallet', envVar: 'WALLET_REPO' },
  { id: 'ark-faucet', envVar: 'ARK_FAUCET_REPO' },
  { id: 'ark-simulator', envVar: 'ARK_SIMULATOR_REPO' },
  { id: 'ark-telemetry', envVar: 'ARK_TELEMETRY_REPO' },
  { id: 'ark-infra', envVar: 'ARK_INFRA_REPO' },
  { id: 'kms-unlocker', envVar: 'KMS_UNLOCKER_REPO' },
  { id: 'fulmine', envVar: 'FULMINE_REPO' },
  { id: 'fulmine-simulator', envVar: 'FULMINE_SIMULATOR_REPO' },
  { id: 'boltz-backend', envVar: 'BOLTZ_BACKEND_REPO' },
  { id: 'ark-docs', envVar: 'ARK_DOCS_REPO' },
  { id: 'arkade-escrow', envVar: 'ARKADE_ESCROW_REPO' },
  { id: 'arkade-explorer', envVar: 'ARKADE_EXPLORER_REPO' },
];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    projects: [],
    verbose: false,
    json: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      options.projects.push(arg);
    }
  }

  // If no projects specified, check all
  if (options.projects.length === 0) {
    options.projects = PROJECTS.map(p => p.id);
  }

  return options;
}

/**
 * Show usage help
 */
function showHelp() {
  console.log(`
Arkadian Documentation Freshness Checker

Usage:
  arkadian-check-freshness [options] [projects...]

Options:
  --verbose, -v    Show recent commit messages for stale projects
  --json           Output results in JSON format
  --help, -h       Show this help message

Projects:
  ${PROJECTS.map(p => p.id).join(', ')}

Examples:
  arkadian-check-freshness                    # Check all projects
  arkadian-check-freshness arkd go-sdk        # Check specific projects
  arkadian-check-freshness --verbose          # Show commit messages
  arkadian-check-freshness --json             # JSON output

Exit Codes:
  0 - All checked projects are fresh
  1 - One or more projects are stale
  2 - Error (missing env vars, invalid project)
`);
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
 * Check if directory exists
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
 * Get recent commits between two commits
 */
function getRecentCommits(repoPath, fromCommit, toCommit, limit = 10) {
  const format = '--format=%h|%s|%an|%ar';
  const commits = gitCommand(repoPath, `log ${fromCommit}..${toCommit} ${format} -n ${limit}`);

  if (!commits) return [];

  return commits.split('\n').map(line => {
    const [hash, subject, author, date] = line.split('|');
    return { hash, subject, author, date };
  });
}

/**
 * Check documentation freshness for a project
 */
function checkProjectFreshness(projectId, repoPath, options) {
  // Get last sync commit
  const lastSyncCommit = getLastSyncCommit(projectId);
  if (!lastSyncCommit) {
    return {
      project: projectId,
      status: 'unknown',
      reason: 'No sync marker found (run arkadian-init-metadata.sh)',
      repoPath
    };
  }

  // Get current commit
  const currentCommit = gitCommand(repoPath, 'rev-parse HEAD');
  if (!currentCommit) {
    return {
      project: projectId,
      status: 'error',
      reason: 'Not a git repository',
      repoPath
    };
  }

  // Check if commits are the same
  if (currentCommit === lastSyncCommit) {
    // Check for uncommitted changes
    const status = gitCommand(repoPath, 'status --porcelain');
    if (status && status.length > 0) {
      const changedFiles = status.split('\n').length;
      return {
        project: projectId,
        status: 'dirty',
        currentCommit: currentCommit.substring(0, 7),
        lastSyncCommit: lastSyncCommit.substring(0, 7),
        changedFiles,
        repoPath
      };
    }

    return {
      project: projectId,
      status: 'fresh',
      currentCommit: currentCommit.substring(0, 7),
      repoPath
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
      lastSyncCommit: lastSyncCommit.substring(0, 7),
      reason: 'Commit history diverged or last sync commit not reachable',
      repoPath
    };
  }

  const result = {
    project: projectId,
    status: 'behind',
    commitsBehind: parseInt(commitCount, 10),
    currentCommit: currentCommit.substring(0, 7),
    lastSyncCommit: lastSyncCommit.substring(0, 7),
    repoPath
  };

  // Add commit messages if verbose
  if (options.verbose) {
    result.recentCommits = getRecentCommits(repoPath, lastSyncCommit, currentCommit, 10);
  }

  return result;
}

/**
 * Display results in human-readable format
 */
function displayResults(results, options) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📚 DOCUMENTATION FRESHNESS STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Count statuses
  let freshCount = 0;
  let behindCount = 0;
  let dirtyCount = 0;
  let unknownCount = 0;
  let errorCount = 0;
  let divergedCount = 0;

  const staleProjects = [];

  // Display each project
  for (const result of results) {
    const projectName = result.project.padEnd(18);

    switch (result.status) {
      case 'fresh':
        freshCount++;
        console.log(`   ✅ ${projectName} FRESH (in sync with ${result.currentCommit})`);
        break;

      case 'behind':
        behindCount++;
        staleProjects.push(result.project);
        console.log(`   ⚠️  ${projectName} ${result.commitsBehind} commit${result.commitsBehind > 1 ? 's' : ''} ahead (last sync: ${result.lastSyncCommit})`);

        // Show recent commits if verbose
        if (options.verbose && result.recentCommits) {
          console.log(`      Recent commits:`);
          for (const commit of result.recentCommits) {
            console.log(`        ${commit.hash} ${commit.subject}`);
            console.log(`                 by ${commit.author}, ${commit.date}`);
          }
        }
        break;

      case 'dirty':
        dirtyCount++;
        staleProjects.push(result.project);
        console.log(`   ⚠️  ${projectName} DIRTY (${result.changedFiles} uncommitted change${result.changedFiles > 1 ? 's' : ''})`);
        break;

      case 'diverged':
        divergedCount++;
        staleProjects.push(result.project);
        console.log(`   ⚠️  ${projectName} DIVERGED (current: ${result.currentCommit}, last sync: ${result.lastSyncCommit})`);
        console.log(`      ${result.reason}`);
        break;

      case 'unknown':
        unknownCount++;
        console.log(`   ℹ️  ${projectName} ${result.reason}`);
        break;

      case 'error':
        errorCount++;
        console.log(`   ❌ ${projectName} ${result.reason}`);
        console.log(`      Path: ${result.repoPath}`);
        break;
    }
  }

  // Summary
  console.log('');
  console.log(`📊 Summary: ${freshCount}/${results.length} fresh`);
  if (behindCount > 0) console.log(`   ${behindCount} behind upstream`);
  if (dirtyCount > 0) console.log(`   ${dirtyCount} with uncommitted changes`);
  if (divergedCount > 0) console.log(`   ${divergedCount} diverged`);
  if (unknownCount > 0) console.log(`   ${unknownCount} unknown status`);
  if (errorCount > 0) console.log(`   ${errorCount} errors`);

  // Show refresh command
  if (staleProjects.length > 0) {
    console.log('');
    console.log(`💡 To refresh stale docs:`);
    console.log(`   arkadian-refresh-docs ${staleProjects.join(' ')}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Return exit code
  return staleProjects.length > 0 ? 1 : 0;
}

/**
 * Main execution
 */
function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Check ARKADIAN_DOCS is set
  if (!process.env.ARKADIAN_DOCS) {
    console.error('❌ Error: ARKADIAN_DOCS environment variable not set');
    console.error('   Please source ~/.arkadian-env.sh or set up environment variables');
    process.exit(2);
  }

  // Validate requested projects
  const results = [];
  const missingEnvVars = [];

  for (const projectId of options.projects) {
    const projectConfig = PROJECTS.find(p => p.id === projectId);

    if (!projectConfig) {
      console.error(`❌ Error: Unknown project '${projectId}'`);
      console.error(`   Valid projects: ${PROJECTS.map(p => p.id).join(', ')}`);
      process.exit(2);
    }

    const repoPath = process.env[projectConfig.envVar];

    if (!repoPath) {
      missingEnvVars.push(projectConfig.envVar);
      continue;
    }

    if (!directoryExists(repoPath)) {
      results.push({
        project: projectId,
        status: 'error',
        reason: 'Repository directory not found',
        repoPath
      });
      continue;
    }

    const freshnessInfo = checkProjectFreshness(projectId, repoPath, options);
    results.push(freshnessInfo);
  }

  // Show missing env vars
  if (missingEnvVars.length > 0) {
    console.error(`❌ Error: Missing environment variables:`);
    for (const varName of missingEnvVars) {
      console.error(`   - ${varName}`);
    }
    console.error('\n   Please source ~/.arkadian-env.sh or set up environment variables\n');
    process.exit(2);
  }

  // Output results
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    const hasStale = results.some(r => ['behind', 'dirty', 'diverged'].includes(r.status));
    process.exit(hasStale ? 1 : 0);
  } else {
    const exitCode = displayResults(results, options);
    process.exit(exitCode);
  }
}

main();

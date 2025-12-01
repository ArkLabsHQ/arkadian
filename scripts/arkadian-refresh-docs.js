#!/usr/bin/env node
/**
 * Arkadian Documentation Refresh Script
 *
 * Analyzes commits since last sync and updates documentation.
 * This script prepares the data and would call the Ark Documenter agent.
 *
 * Usage:
 *   arkadian-refresh-docs arkd                 # Refresh single project
 *   arkadian-refresh-docs arkd go-sdk          # Refresh multiple projects
 *   arkadian-refresh-docs --all                # Refresh all stale projects
 *   arkadian-refresh-docs --dry-run arkd       # Preview what would be updated
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
 * Commit type categories for documentation analysis
 */
const COMMIT_CATEGORIES = {
  feat: { label: 'Features', docImpact: 'high', emoji: '✨' },
  fix: { label: 'Bug Fixes', docImpact: 'medium', emoji: '🐛' },
  docs: { label: 'Documentation', docImpact: 'low', emoji: '📝' },
  refactor: { label: 'Refactoring', docImpact: 'medium', emoji: '♻️' },
  perf: { label: 'Performance', docImpact: 'medium', emoji: '⚡' },
  test: { label: 'Tests', docImpact: 'low', emoji: '✅' },
  build: { label: 'Build System', docImpact: 'low', emoji: '🔧' },
  ci: { label: 'CI/CD', docImpact: 'low', emoji: '👷' },
  chore: { label: 'Chores', docImpact: 'low', emoji: '🔨' },
  style: { label: 'Code Style', docImpact: 'low', emoji: '💄' },
  revert: { label: 'Reverts', docImpact: 'medium', emoji: '⏪' },
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    projects: [],
    all: false,
    dryRun: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      options.projects.push(arg);
    }
  }

  return options;
}

/**
 * Show usage help
 */
function showHelp() {
  console.log(`
Arkadian Documentation Refresh Script

Usage:
  arkadian-refresh-docs [options] [projects...]

Options:
  --all            Refresh all stale projects (behind or dirty)
  --dry-run        Preview what would be updated without making changes
  --help, -h       Show this help message

Projects:
  ${PROJECTS.map(p => p.id).join(', ')}

Examples:
  arkadian-refresh-docs arkd                 # Refresh arkd documentation
  arkadian-refresh-docs arkd go-sdk          # Refresh multiple projects
  arkadian-refresh-docs --all                # Refresh all stale projects
  arkadian-refresh-docs --dry-run arkd       # Preview changes

Note:
  This script analyzes commits since last sync and updates:
  - Documentation files (system/, testing/, sop/)
  - change-log/SYNC_HISTORY.md
  - change-log/last-sync.txt
  - INDEX.md metadata

  Phase 3 will integrate with Ark Documenter agent for automated updates.
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
 * Read last sync commit
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
    return null;
  }

  return null;
}

/**
 * Parse conventional commit message
 */
function parseCommit(commitLine) {
  const [hash, fullMessage, author, date] = commitLine.split('|');

  // Parse conventional commit: type(scope): subject
  const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?: (.+)$/;
  const match = fullMessage.match(conventionalRegex);

  if (match) {
    const [, type, scope, subject] = match;
    return {
      hash,
      type,
      scope: scope || null,
      subject,
      fullMessage,
      author,
      date,
      category: COMMIT_CATEGORIES[type] || COMMIT_CATEGORIES.chore
    };
  }

  // Non-conventional commit
  return {
    hash,
    type: 'other',
    scope: null,
    subject: fullMessage,
    fullMessage,
    author,
    date,
    category: COMMIT_CATEGORIES.chore
  };
}

/**
 * Get commits between two commits
 */
function getCommitsSinceLastSync(repoPath, lastSyncCommit) {
  const format = '--format=%h|%s|%an|%ar';
  const output = gitCommand(repoPath, `log ${lastSyncCommit}..HEAD ${format}`);

  if (!output) return [];

  return output.split('\n')
    .filter(line => line.trim())
    .map(parseCommit);
}

/**
 * Categorize commits by type
 */
function categorizeCommits(commits) {
  const categories = {};

  for (const commit of commits) {
    const categoryName = commit.category.label;
    if (!categories[categoryName]) {
      categories[categoryName] = {
        emoji: commit.category.emoji,
        docImpact: commit.category.docImpact,
        commits: []
      };
    }
    categories[categoryName].commits.push(commit);
  }

  return categories;
}

/**
 * Analyze documentation impact
 */
function analyzeDocImpact(commits, categories) {
  let highImpact = 0;
  let mediumImpact = 0;
  let lowImpact = 0;

  for (const category of Object.values(categories)) {
    const count = category.commits.length;
    switch (category.docImpact) {
      case 'high':
        highImpact += count;
        break;
      case 'medium':
        mediumImpact += count;
        break;
      case 'low':
        lowImpact += count;
        break;
    }
  }

  return { highImpact, mediumImpact, lowImpact };
}

/**
 * Check project freshness
 */
function checkProjectStatus(projectId, repoPath) {
  const lastSyncCommit = getLastSyncCommit(projectId);
  if (!lastSyncCommit) {
    return { status: 'unknown', reason: 'No sync marker found' };
  }

  const currentCommit = gitCommand(repoPath, 'rev-parse HEAD');
  if (!currentCommit) {
    return { status: 'error', reason: 'Not a git repository' };
  }

  if (currentCommit === lastSyncCommit) {
    const status = gitCommand(repoPath, 'status --porcelain');
    if (status && status.length > 0) {
      return { status: 'dirty', currentCommit, lastSyncCommit };
    }
    return { status: 'fresh', currentCommit };
  }

  const commitCount = gitCommand(repoPath, `rev-list ${lastSyncCommit}..HEAD --count`);
  if (commitCount === null || commitCount === '0') {
    return { status: 'diverged', currentCommit, lastSyncCommit };
  }

  return {
    status: 'behind',
    commitsBehind: parseInt(commitCount, 10),
    currentCommit,
    lastSyncCommit
  };
}

/**
 * Find all stale projects
 */
function findStaleProjects() {
  const staleProjects = [];

  for (const project of PROJECTS) {
    const repoPath = process.env[project.envVar];
    if (!repoPath || !directoryExists(repoPath)) continue;

    const status = checkProjectStatus(project.id, repoPath);
    if (['behind', 'dirty', 'diverged'].includes(status.status)) {
      staleProjects.push(project.id);
    }
  }

  return staleProjects;
}

/**
 * Update last-sync.txt marker
 */
function updateLastSyncMarker(projectId, commitHash) {
  const arkadianDocs = process.env.ARKADIAN_DOCS;
  const lastSyncFile = path.join(arkadianDocs, 'docs', 'projects', projectId, 'change-log', 'last-sync.txt');

  fs.writeFileSync(lastSyncFile, commitHash + '\n', 'utf8');
}

/**
 * Append to SYNC_HISTORY.md
 */
function appendToSyncHistory(projectId, commitHash, commits, categories) {
  const arkadianDocs = process.env.ARKADIAN_DOCS;
  const syncHistoryFile = path.join(arkadianDocs, 'docs', 'projects', projectId, 'change-log', 'SYNC_HISTORY.md');

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const commitShort = commitHash.substring(0, 7);

  let entry = `\n## ${timestamp} - Documentation Refresh\n`;
  entry += `**Commit**: \`${commitShort}\`\n`;
  entry += `**Commits Analyzed**: ${commits.length} commit${commits.length > 1 ? 's' : ''}\n`;
  entry += `**Synced By**: arkadian-refresh-docs script\n\n`;

  entry += `**Changes by Category**:\n`;
  for (const [categoryName, category] of Object.entries(categories)) {
    entry += `\n### ${category.emoji} ${categoryName}\n`;
    for (const commit of category.commits) {
      const scope = commit.scope ? `(${commit.scope})` : '';
      entry += `- \`${commit.hash}\` ${scope} ${commit.subject}\n`;
    }
  }

  entry += `\n**Documentation Updated**:\n`;
  entry += `- This is a placeholder entry\n`;
  entry += `- Phase 3 will integrate Ark Documenter agent\n`;
  entry += `- Agent will list specific files updated\n`;

  fs.appendFileSync(syncHistoryFile, entry, 'utf8');
}

/**
 * Display commit analysis
 */
function displayCommitAnalysis(projectId, commits, categories, impact) {
  const projectName = projectId.padEnd(18);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📦 Project: ${projectName}`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`📊 Analysis:`);
  console.log(`   Total commits: ${commits.length}`);
  console.log(`   Documentation impact:`);
  console.log(`     🔴 High:   ${impact.highImpact} commit${impact.highImpact !== 1 ? 's' : ''}`);
  console.log(`     🟡 Medium: ${impact.mediumImpact} commit${impact.mediumImpact !== 1 ? 's' : ''}`);
  console.log(`     🟢 Low:    ${impact.lowImpact} commit${impact.lowImpact !== 1 ? 's' : ''}`);

  console.log(`\n📝 Commits by Category:\n`);

  for (const [categoryName, category] of Object.entries(categories)) {
    console.log(`   ${category.emoji} ${categoryName} (${category.commits.length}):`);
    for (const commit of category.commits) {
      const scope = commit.scope ? ` (${commit.scope})` : '';
      console.log(`      ${commit.hash} ${commit.subject}${scope}`);
      console.log(`               by ${commit.author}, ${commit.date}`);
    }
    console.log('');
  }
}

/**
 * Refresh documentation for a project
 */
function refreshProject(projectId, repoPath, options) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔄 Refreshing documentation: ${projectId}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Check status
  const status = checkProjectStatus(projectId, repoPath);

  if (status.status === 'fresh') {
    console.log(`\n✅ ${projectId} is already up to date (no commits since last sync)`);
    return { success: false, reason: 'already fresh' };
  }

  if (status.status === 'unknown') {
    console.log(`\n⚠️  Cannot refresh ${projectId}: ${status.reason}`);
    console.log(`   Run: ./scripts/arkadian-init-metadata.sh`);
    return { success: false, reason: status.reason };
  }

  if (status.status === 'error') {
    console.log(`\n❌ Cannot refresh ${projectId}: ${status.reason}`);
    return { success: false, reason: status.reason };
  }

  if (status.status === 'dirty') {
    console.log(`\n⚠️  ${projectId} has uncommitted changes`);
    console.log(`   Commit or stash changes before refreshing documentation`);
    return { success: false, reason: 'uncommitted changes' };
  }

  if (status.status === 'diverged') {
    console.log(`\n⚠️  ${projectId} history has diverged`);
    console.log(`   Current: ${status.currentCommit.substring(0, 7)}`);
    console.log(`   Last sync: ${status.lastSyncCommit.substring(0, 7)}`);
    console.log(`   This may require manual resolution`);
    return { success: false, reason: 'diverged history' };
  }

  // Get commits since last sync
  const commits = getCommitsSinceLastSync(repoPath, status.lastSyncCommit);

  if (commits.length === 0) {
    console.log(`\n⚠️  No commits found between ${status.lastSyncCommit.substring(0, 7)} and HEAD`);
    return { success: false, reason: 'no commits' };
  }

  // Categorize commits
  const categories = categorizeCommits(commits);
  const impact = analyzeDocImpact(commits, categories);

  // Display analysis
  displayCommitAnalysis(projectId, commits, categories, impact);

  // Dry run - stop here
  if (options.dryRun) {
    console.log(`\n💡 Dry run mode - no changes made`);
    console.log(`   Run without --dry-run to update documentation`);
    return { success: true, dryRun: true };
  }

  // Update markers and history
  console.log(`\n✍️  Updating sync markers...`);
  updateLastSyncMarker(projectId, status.currentCommit);
  console.log(`   ✅ Updated last-sync.txt: ${status.currentCommit.substring(0, 7)}`);

  appendToSyncHistory(projectId, status.currentCommit, commits, categories);
  console.log(`   ✅ Appended to SYNC_HISTORY.md`);

  console.log(`\n📝 Next steps (Phase 3):`);
  console.log(`   1. Ark Documenter agent will analyze commits`);
  console.log(`   2. Agent will identify affected documentation files`);
  console.log(`   3. Agent will update relevant sections`);
  console.log(`   4. Agent will update INDEX.md metadata`);

  console.log(`\n✅ Documentation refresh complete for ${projectId}\n`);

  return { success: true, commits: commits.length };
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

  // Check environment
  if (!process.env.ARKADIAN_DOCS) {
    console.error('❌ Error: ARKADIAN_DOCS environment variable not set');
    console.error('   Please source ~/.arkadian-env.sh');
    process.exit(2);
  }

  // Determine which projects to refresh
  let projectsToRefresh = [];

  if (options.all) {
    projectsToRefresh = findStaleProjects();
    if (projectsToRefresh.length === 0) {
      console.log('✅ All projects are up to date - nothing to refresh');
      process.exit(0);
    }
    console.log(`\n📚 Found ${projectsToRefresh.length} stale project${projectsToRefresh.length > 1 ? 's' : ''}: ${projectsToRefresh.join(', ')}\n`);
  } else if (options.projects.length === 0) {
    console.error('❌ Error: No projects specified');
    console.error('   Use: arkadian-refresh-docs <project> or --all');
    console.error('   Run: arkadian-refresh-docs --help for usage');
    process.exit(2);
  } else {
    projectsToRefresh = options.projects;
  }

  // Validate projects
  const missingEnvVars = [];
  const invalidProjects = [];

  for (const projectId of projectsToRefresh) {
    const projectConfig = PROJECTS.find(p => p.id === projectId);

    if (!projectConfig) {
      invalidProjects.push(projectId);
      continue;
    }

    const repoPath = process.env[projectConfig.envVar];
    if (!repoPath) {
      missingEnvVars.push(projectConfig.envVar);
    }
  }

  if (invalidProjects.length > 0) {
    console.error(`❌ Error: Unknown projects: ${invalidProjects.join(', ')}`);
    console.error(`   Valid projects: ${PROJECTS.map(p => p.id).join(', ')}`);
    process.exit(2);
  }

  if (missingEnvVars.length > 0) {
    console.error(`❌ Error: Missing environment variables:`);
    for (const varName of missingEnvVars) {
      console.error(`   - ${varName}`);
    }
    console.error('\n   Please source ~/.arkadian-env.sh\n');
    process.exit(2);
  }

  // Refresh each project
  const results = [];

  for (const projectId of projectsToRefresh) {
    const projectConfig = PROJECTS.find(p => p.id === projectId);
    const repoPath = process.env[projectConfig.envVar];

    const result = refreshProject(projectId, repoPath, options);
    results.push({ projectId, ...result });
  }

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 REFRESH SUMMARY`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const successful = results.filter(r => r.success && !r.dryRun);
  const failed = results.filter(r => !r.success);
  const dryRun = results.filter(r => r.dryRun);

  if (options.dryRun) {
    console.log(`💡 Dry run completed for ${dryRun.length} project${dryRun.length > 1 ? 's' : ''}`);
  } else {
    console.log(`✅ Successfully refreshed: ${successful.length} project${successful.length > 1 ? 's' : ''}`);
    if (failed.length > 0) {
      console.log(`⚠️  Skipped: ${failed.length} project${failed.length > 1 ? 's' : ''}`);
      for (const result of failed) {
        console.log(`   - ${result.projectId}: ${result.reason}`);
      }
    }
  }

  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review changes: git diff docs/projects/`);
  console.log(`   2. Commit updates: git add docs/projects/ && git commit`);
  console.log(`   3. Phase 3 will add Ark Documenter agent integration\n`);

  process.exit(failed.length > 0 ? 1 : 0);
}

main();

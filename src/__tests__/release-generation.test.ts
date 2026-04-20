import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import {
  extractPullRequestNumbers,
  isReleasePullRequest,
  deriveContributorLogins,
  buildReleaseNoteEntriesFromPullRequests,
  categorizeReleaseNoteEntries,
  generateChangelog,
  generateReleaseBody,
  getLatestTag,
} from '../lib/release-generation.js';

describe('release generation', () => {
  it('extracts a deduped PR set from squash and merge subjects', () => {
    const prNumbers = extractPullRequestNumbers([
      'feat(hud): add configurable call count icon format (#2151)',
      'fix(hud): replace misleading CLI error with installation diagnostic (#2129)',
      'Merge pull request #2146 from Yeachan-Heo/issue-2143-omc-launch-followup',
      'Merge pull request #2162 from Yeachan-Heo/release/4.10.2',
      'feat(hud): add configurable call count icon format (#2151)',
    ]);

    expect(prNumbers).toEqual(['2151', '2129', '2146', '2162']);
  });

  it('identifies release PRs by release branch or release title', () => {
    expect(isReleasePullRequest({
      title: 'release: 4.10.2',
      headRefName: 'release/4.10.2',
    })).toBe(true);

    expect(isReleasePullRequest({
      title: 'chore(release): bump version to v4.10.2',
      headRefName: null,
    })).toBe(true);

    expect(isReleasePullRequest({
      title: 'fix(hud): replace misleading CLI error with installation diagnostic',
      headRefName: 'fix/hud-cli-diagnostic',
    })).toBe(false);
  });

  it('derives sorted deduped contributor handles from PR and compare metadata', () => {
    const contributors = deriveContributorLogins(
      [
        { author: 'Yeachan-Heo' },
        { author: 'blue-int' },
        { author: 'EthanJStark' },
        { author: 'blue-int' },
      ],
      ['tjsingleton', 'DdangJin', 'Yeachan-Heo', 'EthanJStark', null],
    );

    expect(contributors).toEqual([
      'blue-int',
      'DdangJin',
      'EthanJStark',
      'tjsingleton',
      'Yeachan-Heo',
    ]);
  });

  it('keeps non-conventional PRs in other changes and renders exact PR counts', () => {
    const pullRequests = [
      { number: '2107', title: 'fix(pre-tool-enforcer): deny subagent_type calls whose agent definition has a bare Anthropic model ID on Bedrock', author: 'EthanJStark', headRefName: 'fix/agent-def-model-routing-bedrock' },
      { number: '2108', title: 'chore: enforce dev base branch and gitignore build artifacts', author: 'EthanJStark', headRefName: 'fix/contributor-guardrails' },
      { number: '2122', title: 'fix(state-tools): add skill-active to STATE_TOOL_MODES so cancel can clear it', author: 'tjsingleton', headRefName: 'fix/cancel-clear-skill-active-state' },
      { number: '2127', title: 'fix(hud): show worktree name instead of volatile main repo HEAD', author: 'blue-int', headRefName: 'fix/hud-worktree-name' },
      { number: '2129', title: 'fix(hud): replace misleading CLI error with installation diagnostic', author: 'DdangJin', headRefName: 'fix/hud-cli-diagnostic' },
      { number: '2137', title: 'Fix team tmux pane geometry collapse and bundled agent path resolution', author: 'Yeachan-Heo', headRefName: 'fix-issue-2135-pane-geometry' },
      { number: '2144', title: 'fix: preserve existing global CLAUDE.md during setup', author: 'Yeachan-Heo', headRefName: 'issue-2143-safe-setup-config' },
      { number: '2146', title: 'fix: follow up #2143 with explicit overwrite choice + omc launch profile', author: 'Yeachan-Heo', headRefName: 'issue-2143-omc-launch-followup' },
      { number: '2149', title: 'fix: resolve global HUD npm package lookup outside Node projects', author: 'Yeachan-Heo', headRefName: 'fix/issue-2148-hud-global-npm' },
      { number: '2151', title: 'feat(hud): make call-count icon rendering configurable', author: 'Yeachan-Heo', headRefName: 'issue-2150-hud-call-count-icons' },
    ];

    const categories = categorizeReleaseNoteEntries(
      buildReleaseNoteEntriesFromPullRequests(pullRequests),
    );
    const changelog = generateChangelog('4.10.2', categories, pullRequests.length);

    expect(changelog).toContain('across **10 merged PRs**.');
    expect(changelog).toContain('### Other Changes');
    expect(changelog).toContain('Fix team tmux pane geometry collapse and bundled agent path resolution');
    expect(changelog).not.toContain('1+ PRs merged');
  });


  it('excludes the current release tag when resolving the previous tag', () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'release-tag-test-'));

    try {
      execSync('git init', { cwd: repoDir, stdio: 'ignore' });
      execSync('git config user.name "Test User"', { cwd: repoDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: repoDir, stdio: 'ignore' });

      writeFileSync(join(repoDir, 'notes.txt'), 'first\n');
      execSync('git add notes.txt', { cwd: repoDir, stdio: 'ignore' });
      execSync('git commit -m "first"', { cwd: repoDir, stdio: 'ignore' });
      execSync('git tag v4.10.2', { cwd: repoDir, stdio: 'ignore' });

      writeFileSync(join(repoDir, 'notes.txt'), 'second\n');
      execSync('git add notes.txt', { cwd: repoDir, stdio: 'ignore' });
      execSync('git commit -m "second"', { cwd: repoDir, stdio: 'ignore' });
      execSync('git tag v4.11.0', { cwd: repoDir, stdio: 'ignore' });

      expect(getLatestTag({ cwd: repoDir })).toBe('v4.11.0');
      expect(getLatestTag({ cwd: repoDir, excludeTag: 'v4.11.0' })).toBe('v4.10.2');
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it('assembles a single custom release body with compare link and contributors', () => {
    const body = generateReleaseBody(
      '4.10.2',
      '# oh-my-claudecode v4.10.2: Bug Fixes',
      ['blue-int', 'DdangJin', 'Yeachan-Heo'],
      'v4.10.1',
    );

    expect(body).toContain('npm install -g oh-my-claude-sisyphus@4.10.2');
    expect(body).toContain('https://github.com/Yeachan-Heo/oh-my-claudecode/compare/v4.10.1...v4.10.2');
    expect(body).toContain('@blue-int @DdangJin @Yeachan-Heo');
    expect(body.match(/## Contributors/g)).toHaveLength(1);
  });

  it('configures the workflow to use one custom release body source with github auth', () => {
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/release.yml'),
      'utf-8',
    );

    expect(workflow).toContain('body_path: release-notes.md');
    expect(workflow).toContain('GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
    expect(workflow).not.toContain('generate_release_notes: true');
  });

  it('categorizes perf type as features', () => {
    const prs = [
      { number: '1', title: 'perf(core): faster startup time', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('features')).toBe(true);
    expect(categories.get('features')![0].type).toBe('perf');
  });

  it('categorizes fix with security scope into security category', () => {
    const prs = [
      { number: '2', title: 'fix(security): patch XSS vulnerability', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('security')).toBe(true);
  });

  it('categorizes chore with deps scope into security category', () => {
    const prs = [
      { number: '3', title: 'chore(deps): bump lodash from 4.17.20 to 4.17.21', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('security')).toBe(true);
  });

  it('categorizes fix with deps scope into security category', () => {
    const prs = [
      { number: '4', title: 'fix(deps): update vulnerable dependency', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('security')).toBe(true);
  });

  it('categorizes plain fix (no security scope) into fixes', () => {
    const prs = [
      { number: '5', title: 'fix(hud): correct icon alignment', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('fixes')).toBe(true);
  });

  it('categorizes refactor type into refactoring', () => {
    const prs = [
      { number: '6', title: 'refactor(cli): simplify argument parsing', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('refactoring')).toBe(true);
  });

  it('categorizes docs type into docs', () => {
    const prs = [
      { number: '7', title: 'docs(readme): update installation steps', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('docs')).toBe(true);
  });

  it('categorizes ci and build types into other', () => {
    const prs = [
      { number: '8', title: 'ci: add matrix build', author: 'dev', headRefName: null },
      { number: '9', title: 'build: update esbuild config', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.has('other')).toBe(true);
  });

  it('skips unknown conventional types', () => {
    const prs = [
      { number: '10', title: 'unknown(scope): something weird', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.size).toBe(0);
  });

  it('generates changelog with security and fixes (no features)', () => {
    const prs = [
      { number: '11', title: 'fix(security): patch CVE', author: 'dev', headRefName: null },
      { number: '12', title: 'fix: minor bug', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    const changelog = generateChangelog('1.0.0', categories, prs.length);
    expect(changelog).toContain('Security Hardening');
    expect(changelog).toContain('Bug Fixes');
  });

  it('generates maintenance release title when no notable categories', () => {
    // 'test' type is not mapped to any category → empty map → maintenance release
    const prs = [
      { number: '13', title: 'test: add unit tests', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    expect(categories.size).toBe(0);
    const changelog = generateChangelog('1.0.0', categories, prs.length);
    expect(changelog).toContain('Maintenance Release');
    expect(changelog).toContain('Maintenance release with internal improvements.');
  });

  it('formats entry without prNumber', () => {
    const prs = [
      { number: null as unknown as string, title: 'feat: add feature', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    const changelog = generateChangelog('1.0.0', categories, 1);
    expect(changelog).not.toContain('(#');
  });

  it('formats entry with scope in conventional subject', () => {
    const prs = [
      { number: '14', title: 'feat(auth): add OAuth2 support', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    const changelog = generateChangelog('1.0.0', categories, 1);
    expect(changelog).toContain('(auth)');
  });

  it('pluralizes single PR correctly', () => {
    const prs = [
      { number: '15', title: 'feat: one thing', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    const changelog = generateChangelog('1.0.0', categories, 1);
    expect(changelog).toContain('1 PR merged');
    expect(changelog).toContain('1 new feature');
  });

  it('generates release body without prevTag', () => {
    const body = generateReleaseBody('4.0.0', '# Release', [], '');
    expect(body).toContain('npm install -g oh-my-claude-sisyphus@4.0.0');
    expect(body).not.toContain('Full Changelog');
  });

  it('generates release body without contributors', () => {
    const body = generateReleaseBody('4.0.0', '# Release', [], 'v3.0.0');
    expect(body).toContain('Full Changelog');
    expect(body).not.toContain('Contributors');
  });

  it('generates title with more than 3 feature parts', () => {
    const prs = [
      { number: '1', title: 'feat: feature one', author: 'dev', headRefName: null },
      { number: '2', title: 'feat: feature two', author: 'dev', headRefName: null },
      { number: '3', title: 'feat: feature three', author: 'dev', headRefName: null },
      { number: '4', title: 'feat: feature four', author: 'dev', headRefName: null },
    ];
    const categories = categorizeReleaseNoteEntries(buildReleaseNoteEntriesFromPullRequests(prs));
    const changelog = generateChangelog('1.0.0', categories, prs.length);
    expect(changelog).toContain('v1.0.0:');
  });
});

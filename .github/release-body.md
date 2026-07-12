# oh-my-claudecode v4.15.4: Bug Fixes

## Release Notes

Release with **7 bug fixes**, **1 other change** across **8 merged PRs**.

### Highlights

- **fix(team): recover confirmed-dead runtime-v2 workers** (#3462)
- **fix(merge-readiness): close red-team proof and authority gaps** (#3467)
- **fix(ultragoal): recover the active /goal from the transcript on Claude Code** (#3468)

### Bug Fixes

- **fix(team): recover confirmed-dead runtime-v2 workers** (#3462)
- **fix(merge-readiness): close red-team proof and authority gaps** (#3467)
- **fix(ultragoal): recover the active /goal from the transcript on Claude Code** (#3468)
- **fix(ci): isolate subagent lock benchmark** (#3459)
- **fix(resolve-node): add windowsHide to node binary resolution execSync** (#3455)
- **fix(installer): remove legacy pre-marker OMC guides** (#3450)
- **fix(windows): hide console window for git execSync calls** (#3445)

### Other Changes

- **Add deterministic capabilities lockfile preflight** (#3440)

### Stats

- **8 PRs merged** | **0 new features** | **7 bug fixes** | **0 security/hardening improvements** | **1 other change**

### Install / Update

The npm CLI and the Claude Code marketplace/plugin are separate install tracks, not either/or replacements. Update whichever track you use; if you have both installed, update both. CLI-dependent skill paths such as `ask`, `ccg`, and CLI-backed `team` require the `omc` CLI from the npm package.

**CLI / runtime:**

```bash
npm install -g oh-my-claude-sisyphus@4.15.4
```

**Claude Code plugin:**

```text
/plugin marketplace update omc
```

**Full Changelog**: https://github.com/Yeachan-Heo/oh-my-claudecode/compare/v4.15.3...v4.15.4

## Contributors

Thank you to all contributors who made this release possible!

@geneccx @LukeTheoJohnson @pangpang778 @pgagarinov @Yeachan-Heo

import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.bench.ts',
      'tests/**/*.{test,spec}.ts',
    ],
    exclude: ['node_modules', 'dist', '.omc'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.{test,spec}.{js,ts}',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/index.ts',
        // Build/tooling scripts — not application code
        'scripts/**',
        // CLI commands that shell out to tmux/daemon/agent processes
        'src/cli/commands/wait.ts',
        'src/cli/commands/ralphthon.ts',
        'src/cli/commands/teleport.ts',
        'src/cli/commands/team.ts',
        'src/cli/commands/doctor-conflicts.ts',
        'src/cli/commands/session-search.ts',
        'src/cli/launch.ts',
        'src/cli/team.ts',
        'src/cli/autoresearch.ts',
        'src/cli/autoresearch-intake.ts',
        'src/cli/ask.ts',
        'src/cli/interop.ts',
        // tmux-dependent team runtime (entire subsystem)
        'src/team/**',
        // MCP server subsystem (requires live MCP server connection)
        'src/mcp/**',
        // External service integrations (WebSocket/network)
        'src/notifications/reply-listener.ts',
        'src/notifications/slack-socket.ts',
        'src/notifications/template-variables.ts',
        'src/features/rate-limit-wait/daemon.ts',
        'src/features/background-agent/manager.ts',
        'src/features/background-agent/concurrency.ts',
        // Runtime state manager (live session state)
        'src/features/state-manager/**',
        // Model routing prompt templates (static string data)
        'src/features/model-routing/prompts/**',
        // Requires live LSP server or tsc binary
        'src/tools/lsp-tools.ts',
        'src/tools/lsp/client.ts',
        'src/tools/lsp/servers.ts',
        'src/tools/diagnostics/**',
        // Requires Python bridge daemon
        'src/tools/python-repl/tool.ts',
        'src/tools/python-repl/session-lock.ts',
        'src/tools/python-repl/bridge-manager.ts',
        'src/tools/python-repl/paths.ts',
        'src/tools/python-repl/socket-client.ts',
        // Tool wrappers that call tmux/IPC/external processes
        'src/tools/shared-memory-tools.ts',
        'src/tools/session-history-tools.ts',
        'src/tools/memory-tools.ts',
        'src/tools/wiki-tools.ts',
        'src/tools/notepad-tools.ts',
        'src/tools/ast-tools.ts',
        'src/tools/skills-tools.ts',
        // Deep integration bridge hook
        'src/hooks/bridge.ts',
        // Process-spawning runtimes
        'src/ralphthon/orchestrator.ts',
        'src/autoresearch/runtime.ts',
        // Session/context recovery hooks (live session dependent)
        'src/hooks/recovery/**',
        // Wiki session lifecycle hooks
        'src/hooks/wiki/session-hooks.ts',
        // PR comment checker (requires GitHub API calls)
        'src/hooks/comment-checker/**',
        // Learner hooks (auto-invoke on tool use events / require live session)
        'src/hooks/learner/auto-invoke.ts',
        'src/hooks/learner/promotion.ts',
        'src/hooks/learner/writer.ts',
        'src/hooks/learner/injection-hook.ts',
        'src/hooks/learner/config.ts',
        'src/hooks/learner/detection-hook.ts',
        'src/hooks/learner/loader.ts',
        // Non-interactive environment detection (tmux/headless checks)
        'src/hooks/non-interactive-env/**',
        // Auto slash command detector (fires on tool use events)
        'src/hooks/auto-slash-command/**',
        // Project memory directive detector (fires during tool use)
        'src/hooks/project-memory/directive-detector.ts',
        // Directory readme injector storage (filesystem paths)
        'src/hooks/directory-readme-injector/storage.ts',
        // Autopilot enforcement & prompt hooks (fire during tool use)
        'src/hooks/autopilot/enforcement.ts',
        'src/hooks/autopilot/prompts.ts',
        // Team worker/canonical/leader hooks (require running team agents)
        'src/hooks/team-worker-hook.ts',
        'src/hooks/team-canonical-state.ts',
        'src/hooks/team-leader-nudge-hook.ts',
        // Ralph PRD hook (requires running ralph agent + prd.json state)
        'src/hooks/ralph/prd.ts',
        // Team state interop (requires running team agents)
        'src/interop/team-state.ts',
        'src/interop/shared-state.ts',
        'src/interop/omx-team-state.ts',
        // Agent interop bridge (spawns agent processes)
        'src/agents/interop.ts',
        // Agent orchestration files (spawn Claude/Codex/Gemini processes)
        'src/agents/ask.ts',
        'src/agents/utils.ts',
        'src/agents/autoresearch-intake.ts',
        'src/agents/types.ts',
        // Usage reminder (background file I/O + tmux)
        'src/hooks/agent-usage-reminder/**',
        // Background task manager (spawns child processes)
        'src/features/background-tasks.ts',
        // Delegation/continuation enforcement hooks (fire during tool use)
        'src/features/continuation-enforcement.ts',
        'src/features/delegation-enforcer.ts',
        // HUD runtime files (require live Claude Code session)
        'src/hud/stdin.ts',
        'src/hud/background-tasks.ts',
        'src/hud/transcript.ts',
        'src/hud/usage-api.ts',
        'src/hud/omc-state.ts',
        // HUD display components (render live session state)
        'src/hud/elements/**',
        'src/hud/render.ts',
        'src/hud/mission-board.ts',
        // Auto-update checker (makes network calls to npm/GitHub)
        'src/features/auto-update.ts',
        // MCP protocol bridge (requires live MCP server connection)
        'src/interop/mcp-bridge.ts',
        // Rules injector (reads/resolves rule files from filesystem paths)
        'src/hooks/rules-injector/**',
        // OMC orchestrator audit (deeply coupled to orchestration runtime)
        'src/hooks/omc-orchestrator/**',
        // Platform process utilities (OS process management)
        'src/platform/process-utils.ts',
        // External contributor data (GitHub API calls)
        'src/lib/featured-contributors.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

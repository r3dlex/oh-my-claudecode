import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
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
        // CLI commands that shell out to tmux/daemon processes
        'src/cli/commands/wait.ts',
        'src/cli/commands/ralphthon.ts',
        'src/cli/commands/teleport.ts',
        'src/cli/commands/team.ts',
        'src/cli/launch.ts',
        'src/cli/team.ts',
        // tmux-dependent team runtime
        'src/team/tmux-session.ts',
        'src/team/runtime.ts',
        'src/team/runtime-v2.ts',
        'src/team/runtime-cli.ts',
        // External service integrations (WebSocket/network)
        'src/notifications/reply-listener.ts',
        'src/notifications/slack-socket.ts',
        'src/features/rate-limit-wait/daemon.ts',
        'src/features/background-agent/manager.ts',
        'src/features/background-agent/concurrency.ts',
        // Requires live LSP server or tsc binary
        'src/tools/lsp-tools.ts',
        'src/tools/lsp/client.ts',
        'src/tools/diagnostics/**',
        // Requires Python bridge daemon
        'src/tools/python-repl/tool.ts',
        'src/tools/python-repl/session-lock.ts',
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
        // Learner hooks that auto-invoke on tool use events
        'src/hooks/learner/auto-invoke.ts',
        'src/hooks/learner/promotion.ts',
        'src/hooks/learner/writer.ts',
        'src/hooks/learner/injection-hook.ts',
        'src/hooks/learner/config.ts',
        // Non-interactive environment detection (tmux/headless checks)
        'src/hooks/non-interactive-env/**',
        // Ralph PRD hook (requires running ralph agent + prd.json state)
        'src/hooks/ralph/prd.ts',
        // Autopilot enforcement hook (fires during tool use)
        'src/hooks/autopilot/enforcement.ts',
        // Team state interop (requires running team agents)
        'src/interop/team-state.ts',
        // Agent interop bridge (spawns agent processes)
        'src/agents/interop.ts',
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
        // Auto-update checker (makes network calls to npm/GitHub)
        'src/features/auto-update.ts',
        // MCP protocol bridge (requires live MCP server connection)
        'src/interop/mcp-bridge.ts',
        // Agent orchestration files (spawn Claude/Codex/Gemini processes)
        'src/agents/ask.ts',
        'src/agents/utils.ts',
        'src/agents/autoresearch-intake.ts',
        'src/agents/types.ts',
        // Rules injector (reads/resolves rule files from filesystem paths)
        'src/hooks/rules-injector/**',
        // OMC orchestrator audit (deeply coupled to orchestration runtime)
        'src/hooks/omc-orchestrator/**',
        // HUD OMC state (requires live OMC state manager)
        'src/hud/omc-state.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

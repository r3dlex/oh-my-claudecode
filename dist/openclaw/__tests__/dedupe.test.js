/**
 * Unit tests for the openclaw dedupe module.
 *
 * Covers the terminal-state freshness suppression added for issue #2553:
 * late session-start / stop (idle) events fired after a session has already
 * reached a terminal state must be silently dropped so already-completed or
 * already-cleaned-up sessions do not emit follow-up lifecycle noise.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { shouldCollapseOpenClawBurst, isObsoleteAfterTerminalState, TERMINAL_STATE_SUPPRESSION_WINDOW_MS, } from "../dedupe.js";
import { buildOpenClawSignal } from "../signal.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ctx(projectPath, extra = {}) {
    return { projectPath, ...extra };
}
function collapse(event, projectPath, tmuxSession, extra = {}) {
    const context = ctx(projectPath, extra);
    const signal = buildOpenClawSignal(event, context);
    return shouldCollapseOpenClawBurst(event, signal, context, tmuxSession);
}
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
let projectDir;
beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "omc-openclaw-dedupe-test-"));
});
afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    vi.useRealTimers();
});
// ---------------------------------------------------------------------------
// isObsoleteAfterTerminalState — unit tests on the helper directly
// ---------------------------------------------------------------------------
describe("isObsoleteAfterTerminalState", () => {
    const tmux = "my-tmux";
    function makeState(terminalEvent, offsetMs) {
        const scope = `${projectDir}::${tmux}`;
        const prefix = terminalEvent === "stop" ? "session.stopped" : "session.finished";
        const lastSeenAt = new Date(Date.now() - offsetMs).toISOString();
        return {
            updatedAt: lastSeenAt,
            records: {
                [`${prefix}::${scope}`]: {
                    event: terminalEvent,
                    routeKey: terminalEvent === "stop" ? "session.idle" : "session.finished",
                    tmuxSession: tmux,
                    lastSeenAt,
                    count: 1,
                },
            },
        };
    }
    it("returns false for events other than session-start and stop", () => {
        const state = makeState("session-end", 100);
        const nowMs = Date.now();
        for (const event of ["keyword-detector", "pre-tool-use", "post-tool-use", "ask-user-question"]) {
            expect(isObsoleteAfterTerminalState(event, state, tmux, projectDir, nowMs)).toBe(false);
        }
    });
    it("returns false when state has no terminal record", () => {
        const emptyState = { updatedAt: new Date().toISOString(), records: {} };
        const nowMs = Date.now();
        expect(isObsoleteAfterTerminalState("session-start", emptyState, tmux, projectDir, nowMs)).toBe(false);
        expect(isObsoleteAfterTerminalState("stop", emptyState, tmux, projectDir, nowMs)).toBe(false);
    });
    it("session-start is obsolete when session.finished is within the suppression window", () => {
        const state = makeState("session-end", 1_000); // 1 second ago
        const nowMs = Date.now();
        expect(isObsoleteAfterTerminalState("session-start", state, tmux, projectDir, nowMs)).toBe(true);
    });
    it("session-start is obsolete when session.stopped is within the suppression window", () => {
        const state = makeState("stop", 1_000); // 1 second ago
        const nowMs = Date.now();
        expect(isObsoleteAfterTerminalState("session-start", state, tmux, projectDir, nowMs)).toBe(true);
    });
    it("stop is obsolete when session.finished is within the suppression window", () => {
        const state = makeState("session-end", 1_000);
        const nowMs = Date.now();
        expect(isObsoleteAfterTerminalState("stop", state, tmux, projectDir, nowMs)).toBe(true);
    });
    it("stop is NOT suppressed by session.stopped alone (only by session.finished)", () => {
        const state = makeState("stop", 1_000);
        const nowMs = Date.now();
        // stop after stop is handled by normal burst dedupe, not terminal-state guard
        expect(isObsoleteAfterTerminalState("stop", state, tmux, projectDir, nowMs)).toBe(false);
    });
    it("returns false when the terminal record is older than the suppression window", () => {
        const state = makeState("session-end", TERMINAL_STATE_SUPPRESSION_WINDOW_MS + 5_000);
        const nowMs = Date.now();
        expect(isObsoleteAfterTerminalState("session-start", state, tmux, projectDir, nowMs)).toBe(false);
        expect(isObsoleteAfterTerminalState("stop", state, tmux, projectDir, nowMs)).toBe(false);
    });
    it("uses scope isolation — terminal record for a different tmux session does not suppress", () => {
        const state = makeState("session-end", 100);
        const nowMs = Date.now();
        // Different tmux session name
        expect(isObsoleteAfterTerminalState("session-start", state, "other-tmux", projectDir, nowMs)).toBe(false);
    });
    it("uses scope isolation — terminal record for a different projectPath does not suppress", () => {
        const otherDir = mkdtempSync(join(tmpdir(), "omc-openclaw-other-"));
        try {
            const state = makeState("session-end", 100);
            const nowMs = Date.now();
            expect(isObsoleteAfterTerminalState("session-start", state, tmux, otherDir, nowMs)).toBe(false);
        }
        finally {
            rmSync(otherDir, { recursive: true, force: true });
        }
    });
});
// ---------------------------------------------------------------------------
// shouldCollapseOpenClawBurst — integration tests via filesystem state
// ---------------------------------------------------------------------------
describe("shouldCollapseOpenClawBurst — terminal-state suppression", () => {
    const tmux = "dev-session";
    it("session-start is suppressed when it arrives after session-end within the window", () => {
        // Fire session-end to record terminal state
        const sessionEndCollapsed = collapse("session-end", projectDir, tmux);
        expect(sessionEndCollapsed).toBe(false); // first occurrence — not collapsed
        // Late session-start for the same {projectPath}::{tmux} scope
        const lateStart = collapse("session-start", projectDir, tmux);
        expect(lateStart).toBe(true); // suppressed as obsolete
    });
    it("session-start is suppressed when it arrives after stop within the window", () => {
        const stopCollapsed = collapse("stop", projectDir, tmux);
        expect(stopCollapsed).toBe(false);
        const lateStart = collapse("session-start", projectDir, tmux);
        expect(lateStart).toBe(true);
    });
    it("stop is suppressed when it arrives after session-end within the window", () => {
        collapse("session-end", projectDir, tmux);
        const lateStop = collapse("stop", projectDir, tmux);
        expect(lateStop).toBe(true);
    });
    it("terminal state record is preserved after suppressing an obsolete event (re-suppression)", () => {
        collapse("session-end", projectDir, tmux);
        // First late start — suppressed
        expect(collapse("session-start", projectDir, tmux)).toBe(true);
        // Second late start — still suppressed (terminal record not erased)
        expect(collapse("session-start", projectDir, tmux)).toBe(true);
    });
    it("events are NOT suppressed when there is no tmuxSession", () => {
        // Fire session-end with a tmux session first
        collapse("session-end", projectDir, tmux);
        // Without a tmux session, no suppression occurs
        const context = ctx(projectDir);
        const signal = buildOpenClawSignal("session-start", context);
        const result = shouldCollapseOpenClawBurst("session-start", signal, context, undefined);
        expect(result).toBe(false);
    });
    it("events outside the suppression window are not suppressed", () => {
        vi.useFakeTimers();
        // Record terminal state at t=0
        collapse("session-end", projectDir, tmux);
        // Advance past the suppression window
        vi.advanceTimersByTime(TERMINAL_STATE_SUPPRESSION_WINDOW_MS + 5_000);
        // session-start is no longer suppressed
        const lateStart = collapse("session-start", projectDir, tmux);
        expect(lateStart).toBe(false);
    });
    it("suppresses at TERMINAL_STATE_SUPPRESSION_WINDOW_MS - 1 ms (inside window, exclusive upper bound)", () => {
        vi.useFakeTimers();
        collapse("session-end", projectDir, tmux);
        vi.advanceTimersByTime(TERMINAL_STATE_SUPPRESSION_WINDOW_MS - 1);
        expect(collapse("session-start", projectDir, tmux)).toBe(true);
    });
    it("does NOT suppress at exactly TERMINAL_STATE_SUPPRESSION_WINDOW_MS ms (boundary, exclusive)", () => {
        vi.useFakeTimers();
        collapse("session-end", projectDir, tmux);
        vi.advanceTimersByTime(TERMINAL_STATE_SUPPRESSION_WINDOW_MS);
        expect(collapse("session-start", projectDir, tmux)).toBe(false);
    });
    it("a second session-end within the burst window is collapsed by burst-dedupe (not by terminal-state guard)", () => {
        // First session-end — allowed, record written
        expect(collapse("session-end", projectDir, tmux)).toBe(false);
        // Second session-end immediately: session-end is not in the terminal-state suppression
        // list, so isObsoleteAfterTerminalState returns false. However the existing burst-dedupe
        // kicks in (STOP_WINDOW_MS = 12s) and collapses it.
        expect(collapse("session-end", projectDir, tmux)).toBe(true);
        // Subsequent session-start is still suppressed by the terminal-state guard
        expect(collapse("session-start", projectDir, tmux)).toBe(true);
    });
    it("different tmux sessions are not affected by each other's terminal state", () => {
        collapse("session-end", projectDir, "session-A");
        // session-B should not be suppressed
        const result = collapse("session-start", projectDir, "session-B");
        expect(result).toBe(false);
    });
    it("keyword-detector is not affected by terminal-state suppression", () => {
        collapse("session-end", projectDir, tmux);
        const context = ctx(projectDir, { prompt: "ralph do something" });
        const signal = buildOpenClawSignal("keyword-detector", context);
        const result = shouldCollapseOpenClawBurst("keyword-detector", signal, context, tmux);
        // keyword-detector has no descriptor for this scope, so it passes through
        expect(result).toBe(false);
    });
});
// ---------------------------------------------------------------------------
// readState resilience — corrupted / partially-valid state files
// ---------------------------------------------------------------------------
describe("shouldCollapseOpenClawBurst — readState resilience", () => {
    const tmux = "resilience-session";
    const stateDir = join(".omc", "state");
    const stateFile = "openclaw-event-dedupe.json";
    function writeStateFile(projectPath, content) {
        const { mkdirSync, writeFileSync } = require("fs");
        mkdirSync(join(projectPath, ...stateDir.split("/")), { recursive: true });
        writeFileSync(join(projectPath, ...stateDir.split("/"), stateFile), content, "utf-8");
    }
    it("recovers gracefully from malformed JSON in state file", () => {
        writeStateFile(projectDir, "NOT VALID JSON {{{");
        // Should not throw — falls back to empty state
        expect(() => collapse("session-start", projectDir, tmux)).not.toThrow();
        const result = collapse("session-start", projectDir, tmux);
        // Second call: first wasn't collapsed, so second within window IS collapsed
        expect(typeof result).toBe("boolean");
    });
    it("recovers from state file with non-string updatedAt", () => {
        writeStateFile(projectDir, JSON.stringify({ updatedAt: 12345, records: {} }));
        expect(() => collapse("session-start", projectDir, tmux)).not.toThrow();
    });
    it("recovers from state file with null records field", () => {
        writeStateFile(projectDir, JSON.stringify({ updatedAt: new Date().toISOString(), records: null }));
        expect(() => collapse("session-start", projectDir, tmux)).not.toThrow();
    });
    it("recovers from state file with string records field", () => {
        writeStateFile(projectDir, JSON.stringify({ updatedAt: new Date().toISOString(), records: "bad" }));
        expect(() => collapse("session-start", projectDir, tmux)).not.toThrow();
    });
});
// ---------------------------------------------------------------------------
// pruneState — expired records are cleaned up
// ---------------------------------------------------------------------------
describe("shouldCollapseOpenClawBurst — expired record pruning", () => {
    const tmux = "prune-session";
    it("does not collapse when the only prior record is older than the TTL", () => {
        vi.useFakeTimers();
        // Fire a session-start to record state at t=0
        expect(collapse("session-start", projectDir, tmux)).toBe(false);
        // Advance past STATE_TTL_MS (6 hours)
        vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1_000);
        // The stale record is pruned → session-start is treated as fresh
        expect(collapse("session-start", projectDir, tmux)).toBe(false);
    });
});
// ---------------------------------------------------------------------------
// shouldCollapseOpenClawBurst — no projectPath / no descriptor edge cases
// ---------------------------------------------------------------------------
describe("shouldCollapseOpenClawBurst — descriptor edge cases", () => {
    const tmux = "edge-session";
    it("returns false when context has no projectPath", () => {
        const context = { projectPath: "" };
        const signal = buildOpenClawSignal("session-start", context);
        expect(shouldCollapseOpenClawBurst("session-start", signal, context, tmux)).toBe(false);
    });
    it("returns false for keyword-detector with empty prompt", () => {
        const context = ctx(projectDir, { prompt: "" });
        const signal = buildOpenClawSignal("keyword-detector", context);
        // Empty prompt → descriptor returns null → no collapse
        expect(shouldCollapseOpenClawBurst("keyword-detector", signal, context, tmux)).toBe(false);
    });
    it("returns false for keyword-detector with undefined prompt", () => {
        const context = ctx(projectDir);
        const signal = buildOpenClawSignal("keyword-detector", context);
        expect(shouldCollapseOpenClawBurst("keyword-detector", signal, context, tmux)).toBe(false);
    });
});
//# sourceMappingURL=dedupe.test.js.map
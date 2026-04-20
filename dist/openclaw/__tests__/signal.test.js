import { describe, expect, it } from "vitest";
import { buildOpenClawSignal } from "../signal.js";
describe("buildOpenClawSignal", () => {
    it("classifies session-start as a high-priority started session signal", () => {
        const signal = buildOpenClawSignal("session-start", {
            sessionId: "sess-1",
        });
        expect(signal).toMatchObject({
            kind: "session",
            phase: "started",
            routeKey: "session.started",
            priority: "high",
        });
    });
    it("classifies bash test commands as high-priority test signals", () => {
        const signal = buildOpenClawSignal("pre-tool-use", {
            toolName: "Bash",
            toolInput: { command: "npm test -- --runInBand" },
        });
        expect(signal).toMatchObject({
            kind: "test",
            name: "test-run",
            phase: "started",
            routeKey: "test.started",
            testRunner: "package-test",
            priority: "high",
        });
    });
    it("classifies failed bash test output as a failed test signal", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "pnpm test" },
            toolOutput: "FAIL src/openclaw/signal.test.ts\nTest failed: expected 1 to be 2",
        });
        expect(signal).toMatchObject({
            kind: "test",
            phase: "failed",
            routeKey: "test.failed",
            priority: "high",
        });
    });
    it("extracts pull request URLs from gh pr create output", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "gh pr create --base dev --fill" },
            toolOutput: "https://github.com/example/oh-my-claudecode/pull/1501",
        });
        expect(signal).toMatchObject({
            kind: "pull-request",
            phase: "finished",
            routeKey: "pull-request.created",
            priority: "high",
            prUrl: "https://github.com/example/oh-my-claudecode/pull/1501",
        });
    });
    it("keeps generic tool completion low priority when no higher-level signal exists", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Read",
            toolOutput: "file contents",
        });
        expect(signal).toMatchObject({
            kind: "tool",
            phase: "finished",
            routeKey: "tool.finished",
            priority: "low",
        });
    });
    // ── session / keyword / ask-user-question events ─────────────────────────
    it("classifies session-end as finished session signal", () => {
        const signal = buildOpenClawSignal("session-end", { reason: "user stopped" });
        expect(signal).toMatchObject({ kind: "session", phase: "finished", routeKey: "session.finished" });
    });
    it("classifies stop as idle session signal", () => {
        const signal = buildOpenClawSignal("stop", {});
        expect(signal).toMatchObject({ kind: "session", phase: "idle", routeKey: "session.idle" });
    });
    it("classifies ask-user-question event", () => {
        const signal = buildOpenClawSignal("ask-user-question", { question: "Are you sure?" });
        expect(signal).toMatchObject({ kind: "question", phase: "requested", routeKey: "question.requested", priority: "high" });
        expect(signal.summary).toContain("Are you sure?");
    });
    it("falls back to default signal for unknown event type", () => {
        // @ts-expect-error — testing runtime default branch
        const signal = buildOpenClawSignal("unknown-event", {});
        expect(signal).toMatchObject({ kind: "tool", phase: "finished", routeKey: "tool.finished" });
    });
    // ── getToolPhase — toolOutput edge cases ──────────────────────────────────
    it("returns finished when toolOutput is not a string", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "ls" },
            toolOutput: null,
        });
        expect(signal).toMatchObject({ phase: "finished" });
    });
    it("returns finished when toolOutput is an empty string", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "ls" },
            toolOutput: "",
        });
        expect(signal).toMatchObject({ phase: "finished" });
    });
    // ── isNonZeroExitWithOutput — exit code prefix branches ───────────────────
    it("treats bash output with only exit code prefix as failed (empty remaining, detectBashFailure wins)", () => {
        // "Error: Exit code 0" — prefix matches (L24 branch1 covered), remaining is empty (L29 branch0 covered)
        // isNonZeroExitWithOutput returns false → detectBashFailure("Error: Exit code 0") matches "error:" → "failed"
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "ls" },
            toolOutput: "Error: Exit code 0",
        });
        expect(signal).toMatchObject({ phase: "failed" });
    });
    it("treats bash output with exit code prefix + non-error content as finished", () => {
        // Has exit code prefix AND remaining content with no error keywords → isNonZeroExitWithOutput returns true
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "ls" },
            toolOutput: "Error: Exit code 0\nfiles listed successfully",
        });
        expect(signal).toMatchObject({ phase: "finished" });
    });
    // ── Edit / Write tool failure detection ───────────────────────────────────
    it("classifies Edit tool failure", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Edit",
            toolOutput: "error: failed to write file",
        });
        expect(signal).toMatchObject({ kind: "tool", phase: "failed", priority: "high" });
    });
    it("classifies Write tool success", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Write",
            toolOutput: "File written successfully",
        });
        expect(signal).toMatchObject({ kind: "tool", phase: "finished" });
    });
    // ── getCommand edge cases ─────────────────────────────────────────────────
    it("handles null toolInput gracefully", () => {
        const signal = buildOpenClawSignal("pre-tool-use", {
            toolName: "Bash",
            toolInput: null,
        });
        expect(signal).toMatchObject({ kind: "tool", phase: "started" });
    });
    it("handles empty command string in toolInput", () => {
        const signal = buildOpenClawSignal("pre-tool-use", {
            toolName: "Bash",
            toolInput: { command: "   " },
        });
        // Whitespace-only command → getCommand returns undefined → no test runner
        expect(signal).toMatchObject({ kind: "tool" });
    });
    // ── PR create — all three phase branches ─────────────────────────────────
    it("classifies gh pr create on pre-tool-use as started", () => {
        const signal = buildOpenClawSignal("pre-tool-use", {
            toolName: "Bash",
            toolInput: { command: "gh pr create --fill" },
        });
        expect(signal).toMatchObject({ kind: "pull-request", phase: "started", routeKey: "pull-request.started" });
    });
    it("classifies gh pr create with error output as failed", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "gh pr create --fill" },
            toolOutput: "error: failed to create pull request: HTTP 422",
        });
        expect(signal).toMatchObject({ kind: "pull-request", phase: "failed", routeKey: "pull-request.failed" });
    });
    it("handles gh pr create with non-string toolOutput", () => {
        const signal = buildOpenClawSignal("post-tool-use", {
            toolName: "Bash",
            toolInput: { command: "gh pr create --fill" },
            toolOutput: undefined,
        });
        // Non-string output → output = "" → no prUrl found
        expect(signal).toMatchObject({ kind: "pull-request" });
    });
    // ── summarize — empty/non-string values ──────────────────────────────────
    it("produces no summary for empty-string toolOutput", () => {
        const signal = buildOpenClawSignal("session-end", { reason: "" });
        expect(signal.summary).toBeUndefined();
    });
    it("produces no summary for non-string reason", () => {
        const signal = buildOpenClawSignal("session-end", { reason: 42 });
        expect(signal.summary).toBeUndefined();
    });
    // ── non-Bash tool without test runner ────────────────────────────────────
    it("non-Bash tool pre-tool-use has started phase", () => {
        const signal = buildOpenClawSignal("pre-tool-use", { toolName: "Read" });
        expect(signal).toMatchObject({ phase: "started", priority: "low" });
    });
});
//# sourceMappingURL=signal.test.js.map
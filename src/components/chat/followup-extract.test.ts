import { test } from "node:test"
import assert from "node:assert/strict"
import { getSuggestedFollowups } from "./followup-extract.ts"
import type { Message, Part } from "../../lib/sdk.ts"

test("getSuggestedFollowups returns empty array if no messages", () => {
  assert.deepEqual(getSuggestedFollowups([], {}), [])
})

test("getSuggestedFollowups returns empty array if last message is user", () => {
  const messages: Message[] = [{ id: "m1", role: "user", sessionID: "s1", time: 1 }]
  assert.deepEqual(getSuggestedFollowups(messages, {}), [])
})

test("getSuggestedFollowups returns edit suggestions when edit tools were executed", () => {
  const messages: Message[] = [{ id: "m1", role: "assistant", sessionID: "s1", time: 1 }]
  const parts: Record<string, Part[]> = {
    m1: [
      {
        id: "p1",
        type: "tool",
        tool: "write",
        state: { status: "completed" } as any,
      },
    ],
  }

  const suggestions = getSuggestedFollowups(messages, parts)
  assert.ok(suggestions.includes("Review git diff"))
  assert.ok(suggestions.includes("Run unit tests"))
})

test("getSuggestedFollowups returns error suggestions when tool failed", () => {
  const messages: Message[] = [{ id: "m1", role: "assistant", sessionID: "s1", time: 1 }]
  const parts: Record<string, Part[]> = {
    m1: [
      {
        id: "p1",
        type: "tool",
        tool: "bash",
        state: { status: "error" } as any,
      },
    ],
  }

  const suggestions = getSuggestedFollowups(messages, parts)
  assert.ok(suggestions.includes("Fix this error"))
})

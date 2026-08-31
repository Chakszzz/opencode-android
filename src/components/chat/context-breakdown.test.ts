import { test } from "node:test"
import assert from "node:assert/strict"
import { estimateSessionContextBreakdown, charsFromUserPart, charsFromAssistantPart } from "./context-breakdown.ts"
import type { Message, Part } from "../../lib/sdk.ts"

test("charsFromUserPart counts characters from text and files", () => {
  const textPart: Part = { id: "p1", type: "text", text: "Hello OpenCode" }
  assert.equal(charsFromUserPart(textPart), 14)

  const otherPart: Part = { id: "p2", type: "step-start" } as any
  assert.equal(charsFromUserPart(otherPart), 0)
})

test("charsFromAssistantPart separates assistant text and tool payloads", () => {
  const textPart: Part = { id: "p1", type: "text", text: "Writing code now" }
  assert.deepEqual(charsFromAssistantPart(textPart), { assistant: 16, tool: 0 })

  const toolPart: Part = {
    id: "p2",
    type: "tool",
    tool: "read",
    state: {
      status: "completed",
      input: { filePath: "test.ts" },
      output: "const x = 1;",
    } as any,
  }
  const toolResult = charsFromAssistantPart(toolPart)
  assert.equal(toolResult.assistant, 0)
  assert.ok(toolResult.tool > 12)
})

test("estimateSessionContextBreakdown returns empty array for zero or negative input", () => {
  assert.deepEqual(estimateSessionContextBreakdown({ messages: [], parts: {}, input: 0 }), [])
  assert.deepEqual(estimateSessionContextBreakdown({ messages: [], parts: {}, input: -1 }), [])
})

test("estimateSessionContextBreakdown distributes tokens into segments", () => {
  const messages: Message[] = [
    { id: "m1", sessionID: "s1", role: "user", time: { created: 1000 } },
    { id: "m2", sessionID: "s1", role: "assistant", time: { created: 2000 } },
  ]
  const parts: Record<string, Part[]> = {
    m1: [{ id: "p1", type: "text", text: "Please inspect our code" }],
    m2: [{ id: "p2", type: "text", text: "I have inspected the code." }],
  }

  const breakdown = estimateSessionContextBreakdown({
    messages,
    parts,
    input: 1000,
    systemPrompt: "You are OpenCode assistant.",
  })

  assert.ok(breakdown.length > 0)
  const keys = breakdown.map((b) => b.key)
  assert.ok(keys.includes("system"))
  assert.ok(keys.includes("user"))
  assert.ok(keys.includes("assistant"))
  assert.ok(keys.includes("other"))

  const totalWidth = breakdown.reduce((sum, b) => sum + b.width, 0)
  assert.ok(Math.abs(totalWidth - 100) < 1)
})

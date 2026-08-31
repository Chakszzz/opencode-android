import { test } from "node:test"
import assert from "node:assert/strict"
import { groupMessagesIntoTurns } from "./turn-grouping.ts"
import type { Message, Part } from "../../lib/sdk.ts"

test("groupMessagesIntoTurns returns empty array when messages are empty", () => {
  assert.deepEqual(groupMessagesIntoTurns([], {}), [])
})

test("keeps user messages distinct", () => {
  const userMsg: Message = {
    id: "msg_user_1",
    sessionID: "ses_1",
    role: "user",
    time: { created: 100 },
  }
  const userParts: Part[] = [{ id: "p1", messageID: "msg_user_1", type: "text", text: "Hello AI" }]

  const result = groupMessagesIntoTurns([userMsg], { msg_user_1: userParts })
  assert.equal(result.length, 1)
  assert.equal(result[0].id, "msg_user_1")
  assert.equal(result[0].message.role, "user")
  assert.equal(result[0].parts.length, 1)
})

test("merges consecutive assistant messages (thinking, tool, text) into a single turn item", () => {
  const userMsg: Message = {
    id: "msg_u1",
    sessionID: "ses_1",
    role: "user",
    time: { created: 100 },
  }
  const astReasoning: Message = {
    id: "msg_a1",
    sessionID: "ses_1",
    role: "assistant",
    modelID: "claude-3-7-sonnet",
    time: { created: 101 },
    tokens: { input: 100, output: 50 },
  }
  const astTool: Message = {
    id: "msg_a2",
    sessionID: "ses_1",
    role: "assistant",
    modelID: "claude-3-7-sonnet",
    time: { created: 102 },
    tokens: { input: 10, output: 20 },
  }
  const astText: Message = {
    id: "msg_a3",
    sessionID: "ses_1",
    role: "assistant",
    modelID: "claude-3-7-sonnet",
    time: { created: 103, completed: 104 },
    tokens: { input: 10, output: 30 },
    cost: 0.005,
  }

  const partsRecord: Record<string, Part[]> = {
    msg_u1: [{ id: "p0", messageID: "msg_u1", type: "text", text: "Run test" }],
    msg_a1: [{ id: "p1", messageID: "msg_a1", type: "reasoning", text: "Thinking process..." }],
    msg_a2: [{ id: "p2", messageID: "msg_a2", type: "tool", tool: "bash", state: { status: "completed" } }],
    msg_a3: [{ id: "p3", messageID: "msg_a3", type: "text", text: "Tests passed successfully!" }],
  }

  const result = groupMessagesIntoTurns([userMsg, astReasoning, astTool, astText], partsRecord)

  // Expected: 1 user item + 1 unified assistant item
  assert.equal(result.length, 2)
  assert.equal(result[0].message.role, "user")
  assert.equal(result[0].parts.length, 1)

  const unifiedAst = result[1]
  assert.equal(unifiedAst.message.role, "assistant")
  assert.equal(unifiedAst.messages.length, 3)
  // All 3 parts combined
  assert.equal(unifiedAst.parts.length, 3)
  assert.equal(unifiedAst.parts[0].type, "reasoning")
  assert.equal(unifiedAst.parts[1].type, "tool")
  assert.equal(unifiedAst.parts[2].type, "text")

  // Tokens and cost aggregated
  assert.deepEqual(unifiedAst.message.tokens, { input: 120, output: 100 })
  assert.equal(unifiedAst.message.cost, 0.005)
})

test("extracts error message from assistant message in turn", () => {
  const userMsg: Message = {
    id: "msg_u1",
    sessionID: "ses_1",
    role: "user",
    time: { created: 100 },
  }
  const astErrorMsg: Message = {
    id: "msg_a1",
    sessionID: "ses_1",
    role: "assistant",
    time: { created: 101 },
    error: { message: "Rate limit exceeded. Please retry in 20s." },
  }

  const result = groupMessagesIntoTurns([userMsg, astErrorMsg], {})
  assert.equal(result.length, 2)
  assert.equal(result[1].error, "Rate limit exceeded. Please retry in 20s.")
})

test("respects revertMessageID filtering", () => {
  const user1: Message = { id: "msg_01", sessionID: "s", role: "user", time: { created: 1 } }
  const ast1: Message = { id: "msg_02", sessionID: "s", role: "assistant", time: { created: 2 } }
  const user2: Message = { id: "msg_03", sessionID: "s", role: "user", time: { created: 3 } }
  const ast2: Message = { id: "msg_04", sessionID: "s", role: "assistant", time: { created: 4 } }

  const result = groupMessagesIntoTurns([user1, ast1, user2, ast2], {}, "msg_03")
  assert.equal(result.length, 2) // only user1 and ast1
  assert.equal(result[0].id, "msg_01")
})

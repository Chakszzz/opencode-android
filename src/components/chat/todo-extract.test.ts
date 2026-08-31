import { test } from "node:test"
import assert from "node:assert/strict"
import { extractTodosFromParts } from "./todo-extract.ts"
import type { Part } from "../../lib/sdk.ts"

test("extractTodosFromParts returns empty array when no todowrite tool exists", () => {
  const parts: Record<string, Part[]> = {
    m1: [{ id: "p1", type: "text", text: "Hello" }],
  }
  assert.deepEqual(extractTodosFromParts(parts), [])
})

test("extractTodosFromParts extracts todos from input payload", () => {
  const parts: Record<string, Part[]> = {
    m1: [
      {
        id: "p1",
        type: "tool",
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { content: "Setup project", status: "completed" },
              { content: "Write feature", status: "in_progress" },
              { content: "Add tests", status: "pending" },
            ],
          },
        } as any,
      },
    ],
  }

  const todos = extractTodosFromParts(parts)
  assert.equal(todos.length, 3)
  assert.equal(todos[0]?.content, "Setup project")
  assert.equal(todos[0]?.status, "completed")
  assert.equal(todos[1]?.content, "Write feature")
  assert.equal(todos[1]?.status, "in_progress")
  assert.equal(todos[2]?.content, "Add tests")
  assert.equal(todos[2]?.status, "pending")
})

test("extractTodosFromParts extracts latest state from multiple todowrite invocations", () => {
  const parts: Record<string, Part[]> = {
    m1: [
      {
        id: "p1",
        type: "tool",
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { content: "Task 1", status: "pending" },
            ],
          },
        } as any,
      },
    ],
    m2: [
      {
        id: "p2",
        type: "tool",
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { content: "Task 1", status: "completed" },
              { content: "Task 2", status: "in_progress" },
            ],
          },
        } as any,
      },
    ],
  }

  const todos = extractTodosFromParts(parts)
  assert.equal(todos.length, 2)
  assert.equal(todos[0]?.status, "completed")
  assert.equal(todos[1]?.status, "in_progress")
})

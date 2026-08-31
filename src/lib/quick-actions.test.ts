import { test } from "node:test"
import assert from "node:assert/strict"
import { buildQuickActions } from "./quick-actions.ts"
import type { Session } from "./sdk.ts"

test("buildQuickActions returns New Session action by default", () => {
  const actions = buildQuickActions([])
  assert.equal(actions.length, 1)
  assert.equal(actions[0].id, "new_session")
  assert.equal(actions[0].title, "New Session")
})

test("buildQuickActions includes recent sessions up to 2 items", () => {
  const mockSessions: Session[] = [
    { id: "s1", title: "Build feature A", directory: "/home/user/repoA", time: { created: 100 } },
    { id: "s2", title: "Debug test B", directory: "/home/user/repoB", time: { created: 200 } },
    { id: "s3", title: "Refactor C", directory: "/home/user/repoC", time: { created: 300 } },
  ]

  const actions = buildQuickActions(mockSessions)
  assert.equal(actions.length, 3)
  assert.equal(actions[0].id, "new_session")
  assert.equal(actions[1].id, "session_s1")
  assert.equal(actions[1].title, "Build feature A")
  assert.equal(actions[1].subtitle, "repoA")
  assert.equal(actions[2].id, "session_s2")
})

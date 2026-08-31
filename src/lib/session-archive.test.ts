import { test } from "node:test"
import assert from "node:assert/strict"
import type { Session } from "./sdk.ts"

function session(id: string, archived?: number): Session {
  return {
    id,
    slug: id,
    projectID: "p",
    directory: "/workspace/project",
    title: `Session ${id}`,
    version: "1",
    time: {
      created: 1000,
      updated: 2000,
      ...(archived !== undefined ? { archived } : {}),
    },
  } as Session
}

test("session archiving: active vs archived separation", () => {
  const sessions: Session[] = [
    session("s1"),
    session("s2", 1700000000),
    session("s3"),
    session("s4", 1700000500),
  ]

  const active = sessions.filter((s) => !s.time?.archived)
  const archived = sessions.filter((s) => !!s.time?.archived)

  assert.equal(active.length, 2)
  assert.deepEqual(active.map((s) => s.id), ["s1", "s3"])

  assert.equal(archived.length, 2)
  assert.deepEqual(archived.map((s) => s.id), ["s2", "s4"])
})

test("session archiving: unarchiving resets archived timestamp", () => {
  let s = session("s1", Date.now())
  assert.ok(s.time.archived)

  // simulate unarchive
  s = { ...s, time: { ...s.time, archived: undefined } }
  assert.equal(s.time.archived, undefined)
  assert.equal(Boolean(s.time.archived), false)
})

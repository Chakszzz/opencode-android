import test from "node:test"
import assert from "node:assert/strict"
import { stripShellWrapper, getToolPresentation } from "./tool-presentation.ts"
import type { Part } from "../../lib/sdk.ts"

test("stripShellWrapper removes /bin/bash -c wrappers", () => {
  assert.equal(stripShellWrapper('/bin/bash -c "npm test"'), "npm test")
  assert.equal(stripShellWrapper("/bin/zsh -lc 'git status'"), "git status")
  assert.equal(stripShellWrapper("sh -c 'echo hello'"), "echo hello")
  assert.equal(stripShellWrapper("npm run build"), "npm run build")
})

test("getToolPresentation produces clean summaries for bash, read, and write", () => {
  const bashPart: Part = {
    id: "p1",
    messageID: "m1",
    type: "tool",
    tool: "bash",
    state: {
      status: "completed",
      input: { command: "/bin/bash -c 'npm test'" },
      output: "All tests passed",
    },
  }

  const p = getToolPresentation(bashPart)
  assert.equal(p.summary, "Run")
  assert.equal(p.detail, "npm test")
  assert.equal(p.copyText, "All tests passed")

  const readPart: Part = {
    id: "p2",
    messageID: "m1",
    type: "tool",
    tool: "read",
    state: {
      status: "completed",
      input: { filePath: "src/lib/sdk.ts", offset: 10, limit: 50 },
    },
  }

  const pRead = getToolPresentation(readPart)
  assert.equal(pRead.summary, "Read")
  assert.equal(pRead.detail, "src/lib/sdk.ts (10..50)")
  assert.equal(pRead.copyText, "src/lib/sdk.ts")
})

import { test } from "node:test"
import assert from "node:assert/strict"
import { reduceLiveFollow, type LiveFollowState } from "./live-follow.ts"

test("reduceLiveFollow: starts with live follow active on reset or snap-bottom", () => {
  const initial: LiveFollowState = { isLiveFollow: false, isAtBottom: false }
  const res1 = reduceLiveFollow(initial, { type: "reset" })
  assert.equal(res1.isLiveFollow, true)
  assert.equal(res1.isAtBottom, true)

  const res2 = reduceLiveFollow(initial, { type: "snap-bottom" })
  assert.equal(res2.isLiveFollow, true)
  assert.equal(res2.isAtBottom, true)
})

test("reduceLiveFollow: user dragging pauses live follow", () => {
  const state: LiveFollowState = { isLiveFollow: true, isAtBottom: true }
  const res = reduceLiveFollow(state, { type: "user-drag-begin" })
  assert.equal(res.isLiveFollow, false)
})

test("reduceLiveFollow: scrolling above threshold while dragging marks not at bottom", () => {
  const state: LiveFollowState = { isLiveFollow: true, isAtBottom: true }
  const res = reduceLiveFollow(state, { type: "scroll", offsetY: 250, isDragging: true })
  assert.equal(res.isLiveFollow, false)
  assert.equal(res.isAtBottom, false)
})

test("reduceLiveFollow: scrolling back down to <= threshold resumes live follow", () => {
  const state: LiveFollowState = { isLiveFollow: false, isAtBottom: false }
  const res = reduceLiveFollow(state, { type: "scroll", offsetY: 20 })
  assert.equal(res.isLiveFollow, true)
  assert.equal(res.isAtBottom, true)
})

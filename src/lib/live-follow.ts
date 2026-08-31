/**
 * Smart Live Follow state machine for chat feed scrolling.
 *
 * In an inverted FlatList, offset 0 is the bottom (newest messages).
 * When live follow is active, new incoming stream tokens and tool outputs
 * keep the feed anchored at the bottom.
 * If the user scrolls up (offset > threshold), live follow is paused so
 * the viewport does not jerk away while reading past history.
 * Live follow automatically resumes once the user scrolls back to the bottom.
 */

export interface LiveFollowState {
  isLiveFollow: boolean
  isAtBottom: boolean
}

export type LiveFollowAction =
  | { type: "scroll"; offsetY: number; isDragging?: boolean; threshold?: number }
  | { type: "user-drag-begin" }
  | { type: "reset" }
  | { type: "snap-bottom" }

const DEFAULT_THRESHOLD = 40

export function reduceLiveFollow(
  state: LiveFollowState,
  action: LiveFollowAction,
): LiveFollowState {
  switch (action.type) {
    case "reset":
    case "snap-bottom":
      return { isLiveFollow: true, isAtBottom: true }

    case "user-drag-begin":
      return { ...state, isLiveFollow: false }

    case "scroll": {
      const threshold = action.threshold ?? DEFAULT_THRESHOLD
      const isAtBottom = action.offsetY <= threshold

      if (isAtBottom) {
        return { isLiveFollow: true, isAtBottom: true }
      }

      if (action.isDragging) {
        return { isLiveFollow: false, isAtBottom: false }
      }

      return { isLiveFollow: state.isLiveFollow, isAtBottom: false }
    }
  }
}

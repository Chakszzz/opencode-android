import * as QuickActions from "expo-quick-actions"
import type { Session } from "./sdk"

export interface QuickActionPayload {
  id: string
  title: string
  subtitle?: string
  icon?: string
  params?: Record<string, unknown>
}

/**
 * Builds the list of launcher shortcuts based on recent sessions.
 */
export function buildQuickActions(recentSessions: Session[] = []): QuickActionPayload[] {
  const actions: QuickActionPayload[] = [
    {
      id: "new_session",
      title: "New Session",
      subtitle: "Start a new coding task",
      icon: "compose",
      params: { href: "/session/new" },
    },
  ]

  // Add up to 2 most recent sessions
  const topSessions = recentSessions.slice(0, 2)
  for (const session of topSessions) {
    if (session.id) {
      actions.push({
        id: `session_${session.id}`,
        title: session.title || "Untitled Session",
        subtitle: session.directory ? session.directory.split("/").pop() || undefined : undefined,
        icon: "chat",
        params: { href: `/session/${session.id}`, sessionId: session.id },
      })
    }
  }

  return actions
}

/**
 * Updates launcher quick actions in the OS.
 */
export async function syncQuickActions(sessions: Session[] = []): Promise<void> {
  try {
    const items = buildQuickActions(sessions)
    await QuickActions.setItems(items as any)
  } catch (err) {
    // Quick actions are optional and may not be supported on all platforms/emulators
    console.warn("[QuickActions] Failed to sync:", err)
  }
}

/**
 * Subscribes to quick action launches.
 */
export function onQuickActionTap(callback: (href: string) => void): () => void {
  // Check initial launch action (cold start)
  if (QuickActions.initial) {
    const initialHref = (QuickActions.initial.params as any)?.href
    if (initialHref) {
      setTimeout(() => callback(initialHref), 100)
    }
  }

  const subscription = QuickActions.addListener((action) => {
    const href = (action.params as any)?.href
    if (href) {
      callback(href)
    }
  })

  return () => {
    subscription.remove()
  }
}

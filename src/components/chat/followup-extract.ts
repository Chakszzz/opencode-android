import type { Message, Part } from "../../lib/sdk.ts"

export function getSuggestedFollowups(
  messages: Message[],
  parts: Record<string, Part[] | undefined>,
): string[] {
  if (!messages || messages.length === 0) return []

  const lastMsg = messages[messages.length - 1]
  if (!lastMsg || lastMsg.role !== "assistant") return []

  const lastParts = (parts[lastMsg.id] ?? []) as Part[]
  const hasEdit = lastParts.some(
    (p) => p.type === "tool" && ["edit", "write", "apply_patch"].includes((p as any).tool),
  )
  const hasRead = lastParts.some(
    (p) => p.type === "tool" && ["read", "grep", "find", "list"].includes((p as any).tool),
  )
  const hasError = lastParts.some(
    (p) => p.type === "tool" && (p as any).state?.status === "error",
  )

  if (hasError) {
    return [
      "Fix this error",
      "Try an alternative approach",
      "Show debug details",
    ]
  }

  if (hasEdit) {
    return [
      "Review git diff",
      "Run unit tests",
      "Explain the changes made",
      "Commit these changes",
    ]
  }

  if (hasRead) {
    return [
      "Proceed with changes",
      "Explain implementation details",
      "Check related files",
    ]
  }

  return [
    "Proceed to next step",
    "Provide code example",
    "Explain in more detail",
  ]
}

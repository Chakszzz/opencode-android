import type { Part } from "../../lib/sdk.ts"
import type { TodoItem } from "./TodoSheet"

export function extractTodosFromParts(parts: Record<string, Part[] | undefined>): TodoItem[] {
  let latestTodos: TodoItem[] = []
  const allParts: Part[] = Object.values(parts).filter(Boolean).flat() as Part[]

  for (const part of allParts) {
    if (part.type === "tool" && part.tool === "todowrite") {
      const input = part.state?.input as { todos?: TodoItem[] } | undefined
      const output = part.state?.output
      const metadata = (part.state as any)?.metadata as { todos?: TodoItem[] } | undefined

      if (Array.isArray(metadata?.todos)) {
        latestTodos = metadata.todos
      } else if (Array.isArray(input?.todos)) {
        latestTodos = input.todos
      } else if (typeof output === "string") {
        try {
          const parsed = JSON.parse(output)
          if (Array.isArray(parsed)) latestTodos = parsed
        } catch {}
      }
    }
  }

  return latestTodos
}

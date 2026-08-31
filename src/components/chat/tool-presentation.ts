import type { Part } from "../../lib/sdk"

/**
 * Strips verbose shell wrappers like `/bin/bash -c "..."` or `/bin/zsh -lc "..."`
 * so the user sees the real command.
 */
export function stripShellWrapper(value = ""): string {
  const trimmed = value.trim()
  const match =
    trimmed.match(/^\/bin\/(?:bash|zsh|sh)\s+-[a-zA-Z]*c\s+['"]?([\s\S]*?)['"]?$/) ||
    trimmed.match(/^(?:bash|zsh|sh)\s+-[a-zA-Z]*c\s+['"]?([\s\S]*?)['"]?$/)
  return (match?.[1] ?? trimmed).trim()
}

export interface ToolPresentation {
  summary: string
  detail: string | null
  copyText: string
}

/**
 * Extracts a concise summary action and target detail for any tool call part.
 */
export function getToolPresentation(tool: Part): ToolPresentation {
  const name = tool.tool || ""
  const input = (tool.state?.input as Record<string, unknown>) || {}
  const output = tool.state?.output
  const title = tool.state?.title

  switch (name) {
    case "bash": {
      const rawCmd = typeof input.command === "string" ? input.command : ""
      const cleanCmd = stripShellWrapper(rawCmd)
      const outStr = typeof output === "string" ? output : ""
      return {
        summary: "Run",
        detail: cleanCmd || null,
        copyText: outStr || cleanCmd || rawCmd,
      }
    }

    case "read": {
      const file = typeof input.filePath === "string" ? input.filePath : ""
      const offset = typeof input.offset === "number" ? input.offset : undefined
      const limit = typeof input.limit === "number" ? input.limit : undefined
      const range = offset || limit ? ` (${offset || 0}..${limit || "end"})` : ""
      return {
        summary: "Read",
        detail: file ? `${file}${range}` : null,
        copyText: file,
      }
    }

    case "write": {
      const file = typeof input.filePath === "string" ? input.filePath : ""
      const content = typeof input.content === "string" ? input.content : ""
      return {
        summary: "Write",
        detail: file || null,
        copyText: content || file,
      }
    }

    case "edit": {
      const file = typeof input.filePath === "string" ? input.filePath : ""
      return {
        summary: "Edit",
        detail: file || null,
        copyText: file,
      }
    }

    case "apply_patch": {
      const file = typeof input.filePath === "string" ? input.filePath : ""
      const patch = typeof input.patch === "string" ? input.patch : ""
      return {
        summary: "Patch",
        detail: file || null,
        copyText: patch || file,
      }
    }

    case "list":
    case "glob": {
      const path = typeof input.path === "string" ? input.path : ""
      const pattern = typeof input.pattern === "string" ? input.pattern : ""
      const detail = pattern && path ? `${pattern} in ${path}` : pattern || path
      return {
        summary: "List",
        detail: detail || null,
        copyText: detail,
      }
    }

    case "grep":
    case "codesearch": {
      const pattern = typeof input.pattern === "string" ? input.pattern : ""
      const path = typeof input.path === "string" ? input.path : ""
      const detail = pattern && path ? `"${pattern}" in ${path}` : pattern ? `"${pattern}"` : path
      return {
        summary: "Search",
        detail: detail || null,
        copyText: pattern || path,
      }
    }

    case "webfetch":
    case "websearch": {
      const url = typeof input.url === "string" ? input.url : typeof input.query === "string" ? input.query : ""
      return {
        summary: name === "websearch" ? "Search" : "Fetch",
        detail: url || null,
        copyText: url,
      }
    }

    case "task": {
      const subagent = typeof input.subagent_type === "string" ? input.subagent_type : ""
      const desc = typeof input.description === "string" ? input.description : ""
      return {
        summary: subagent ? `Agent [${subagent}]` : "Agent",
        detail: desc || null,
        copyText: desc || (typeof input.prompt === "string" ? input.prompt : subagent),
      }
    }

    case "todowrite":
    case "todoread": {
      const todos = Array.isArray(input.todos) ? input.todos : []
      return {
        summary: "Tasks",
        detail: todos.length > 0 ? `${todos.length} items` : null,
        copyText: JSON.stringify(input.todos || {}),
      }
    }

    default: {
      const fallbackSummary = title || name || "Tool"
      const outStr = typeof output === "string" ? output : JSON.stringify(output || input || {})
      return {
        summary: fallbackSummary,
        detail: null,
        copyText: outStr,
      }
    }
  }
}

import type { Message, Part } from "../../lib/sdk.ts"

export type SessionContextBreakdownKey = "system" | "user" | "assistant" | "tool" | "other"

export interface SessionContextBreakdownSegment {
  key: SessionContextBreakdownKey
  tokens: number
  width: number
  percent: number
}

const estimateTokens = (chars: number) => Math.ceil(chars / 4)
const toPercent = (tokens: number, input: number) => (input > 0 ? (tokens / input) * 100 : 0)
const toPercentLabel = (tokens: number, input: number) => Math.round(toPercent(tokens, input) * 10) / 10

export const charsFromUserPart = (part: Part): number => {
  if (part.type === "text") return part.text?.length ?? 0
  if (part.type === "file") return (part as any).source?.text?.value?.length ?? 0
  if (part.type === "agent") return (part as any).source?.value?.length ?? 0
  return 0
}

export const charsFromAssistantPart = (part: Part): { assistant: number; tool: number } => {
  if (part.type === "text") return { assistant: part.text?.length ?? 0, tool: 0 }
  if (part.type === "reasoning") return { assistant: (part as any).text?.length ?? 0, tool: 0 }
  if (part.type !== "tool") return { assistant: 0, tool: 0 }

  const state = (part as any).state || {}
  const inputLen = state.input ? JSON.stringify(state.input).length : 0
  if (state.status === "pending") return { assistant: 0, tool: inputLen + (state.raw?.length ?? 0) }
  if (state.status === "completed") {
    const outLen = typeof state.output === "string" ? state.output.length : JSON.stringify(state.output ?? "").length
    return { assistant: 0, tool: inputLen + outLen }
  }
  if (state.status === "error") return { assistant: 0, tool: inputLen + (state.error?.length ?? 0) }
  return { assistant: 0, tool: inputLen }
}

const buildSegments = (
  tokens: { system: number; user: number; assistant: number; tool: number; other: number },
  input: number,
): SessionContextBreakdownSegment[] => {
  const list: Array<{ key: SessionContextBreakdownKey; tokens: number }> = [
    { key: "system", tokens: tokens.system },
    { key: "user", tokens: tokens.user },
    { key: "assistant", tokens: tokens.assistant },
    { key: "tool", tokens: tokens.tool },
    { key: "other", tokens: tokens.other },
  ]

  return list
    .filter((x) => x.tokens > 0)
    .map((x) => ({
      key: x.key,
      tokens: x.tokens,
      width: Math.min(100, Math.max(0, toPercent(x.tokens, input))),
      percent: toPercentLabel(x.tokens, input),
    }))
}

export function estimateSessionContextBreakdown(args: {
  messages: Message[]
  parts: Record<string, Part[] | undefined>
  input: number
  systemPrompt?: string
}): SessionContextBreakdownSegment[] {
  if (!args.input || args.input <= 0) return []

  const counts = args.messages.reduce(
    (acc, msg) => {
      const parts = args.parts[msg.id] ?? []
      if (msg.role === "user") {
        const user = parts.reduce((sum, part) => sum + charsFromUserPart(part), 0)
        return { ...acc, user: acc.user + user }
      }

      if (msg.role !== "assistant") return acc
      const assistant = parts.reduce(
        (sum, part) => {
          const next = charsFromAssistantPart(part)
          return {
            assistant: sum.assistant + next.assistant,
            tool: sum.tool + next.tool,
          }
        },
        { assistant: 0, tool: 0 },
      )
      return {
        ...acc,
        assistant: acc.assistant + assistant.assistant,
        tool: acc.tool + assistant.tool,
      }
    },
    {
      system: args.systemPrompt?.length ?? 0,
      user: 0,
      assistant: 0,
      tool: 0,
    },
  )

  const tokens = {
    system: estimateTokens(counts.system),
    user: estimateTokens(counts.user),
    assistant: estimateTokens(counts.assistant),
    tool: estimateTokens(counts.tool),
  }
  const estimated = tokens.system + tokens.user + tokens.assistant + tokens.tool

  if (estimated <= args.input) {
    return buildSegments({ ...tokens, other: args.input - estimated }, args.input)
  }

  // Normalize if estimated exceeds total input
  const scale = args.input / (estimated || 1)
  return buildSegments(
    {
      system: Math.round(tokens.system * scale),
      user: Math.round(tokens.user * scale),
      assistant: Math.round(tokens.assistant * scale),
      tool: Math.round(tokens.tool * scale),
      other: 0,
    },
    args.input,
  )
}

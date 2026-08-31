import type { Message, Part } from "../../lib/sdk"

export interface TurnGroupItem {
  id: string
  message: Message
  messages: Message[]
  parts: Part[]
  error?: string
}

function extractErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined
  if (typeof error === "string") return error
  if (typeof error === "object") {
    const errObj = error as Record<string, unknown>
    if (typeof errObj.message === "string") return errObj.message
    if (errObj.data && typeof (errObj.data as Record<string, unknown>).message === "string") {
      return (errObj.data as Record<string, unknown>).message as string
    }
  }
  return undefined
}

/**
 * Groups messages and parts into unified turn items.
 * Consecutive assistant messages following a user message (or belonging to the same turn)
 * are merged into a single unified assistant response with combined parts, tokens, and errors.
 */
export function groupMessagesIntoTurns(
  messages: Message[],
  partsRecord: Record<string, Part[]> | undefined,
  revertMessageID?: string,
): TurnGroupItem[] {
  if (!messages || messages.length === 0) return []

  const validMessages = messages.filter(
    (msg) => !revertMessageID || msg.id.startsWith("temp-") || msg.id < revertMessageID,
  )

  const items: TurnGroupItem[] = []
  let currentAssistantGroup: {
    messages: Message[]
    parts: Part[]
    error?: string
  } | null = null

  const flushAssistantGroup = () => {
    if (!currentAssistantGroup || currentAssistantGroup.messages.length === 0) {
      currentAssistantGroup = null
      return
    }

    const primaryMessage = currentAssistantGroup.messages[currentAssistantGroup.messages.length - 1]
    // Aggregate tokens and cost
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCost = 0
    let hasTokens = false
    let hasCost = false

    for (const msg of currentAssistantGroup.messages) {
      if (msg.tokens) {
        totalInputTokens += msg.tokens.input || 0
        totalOutputTokens += msg.tokens.output || 0
        hasTokens = true
      }
      if (typeof msg.cost === "number") {
        totalCost += msg.cost
        hasCost = true
      }
    }

    const mergedMessage: Message = {
      ...primaryMessage,
      tokens: hasTokens ? { input: totalInputTokens, output: totalOutputTokens } : primaryMessage.tokens,
      cost: hasCost ? totalCost : primaryMessage.cost,
    }

    items.push({
      id: `turn-assistant-${currentAssistantGroup.messages[0].id}`,
      message: mergedMessage,
      messages: currentAssistantGroup.messages,
      parts: currentAssistantGroup.parts,
      error: currentAssistantGroup.error,
    })

    currentAssistantGroup = null
  }

  for (const msg of validMessages) {
    const msgParts = (partsRecord && partsRecord[msg.id]) || []
    const msgError = extractErrorMessage((msg as any).error)

    if (msg.role === "user") {
      // Flush previous assistant group before starting a new user prompt
      flushAssistantGroup()

      items.push({
        id: msg.id,
        message: msg,
        messages: [msg],
        parts: msgParts,
        error: msgError,
      })
    } else {
      // Assistant message: group with preceding assistant messages in this turn
      if (!currentAssistantGroup) {
        currentAssistantGroup = {
          messages: [msg],
          parts: [...msgParts],
          error: msgError,
        }
      } else {
        currentAssistantGroup.messages.push(msg)
        currentAssistantGroup.parts.push(...msgParts)
        if (msgError && !currentAssistantGroup.error) {
          currentAssistantGroup.error = msgError
        }
      }
    }
  }

  flushAssistantGroup()
  return items
}

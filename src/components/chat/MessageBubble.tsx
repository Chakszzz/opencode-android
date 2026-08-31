import { memo, useMemo, useState, useRef, useEffect, useCallback } from "react"
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, LayoutAnimation, Vibration } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import { Markdown } from "../markdown"
import { ToolCallCard } from "./ToolCallCard"
import { ReasoningBlock } from "./ReasoningBlock"
import { OpenCodeMark } from "../OpenCodeLogo"
import type { Message, Part } from "../../lib/sdk"

const SCREEN_WIDTH = Dimensions.get("window").width

function isImageMime(mime?: string): boolean {
  return !!mime && mime.startsWith("image/")
}

function formatMessageTime(timestamp?: number): string {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

interface Props {
  message: Message
  parts: Part[]
  error?: string
  isDark: boolean
  onLongPress?: (messageID: string, role: "user" | "assistant", text: string) => void
}

const HIDDEN_TOOLS = new Set(["todowrite"])

export const MessageBubble = memo(
  function MessageBubble({ message, parts, error, isDark, onLongPress }: Props) {
    const isUser = message.role === "user"
    const [copied, setCopied] = useState(false)

    // Extract text parts
    const textParts = useMemo(
      () => parts.filter((p) => p.type === "text" && p.text),
      [parts],
    )
    const text = textParts.map((p) => p.text).join("")

    // Extract reasoning parts
    const reasoningParts = useMemo(
      () => parts.filter((p) => p.type === "reasoning" && p.text),
      [parts],
    )
    const reasoning = reasoningParts.map((p) => p.text).join("")

    // Extract tool parts (filter out internal tools)
    const toolParts = useMemo(
      () => parts.filter((p) => p.type === "tool" && (!p.tool || !HIDDEN_TOOLS.has(p.tool))),
      [parts],
    )

    // Extract file/image parts
    const fileParts = useMemo(
      () => parts.filter((p) => p.type === "file" && isImageMime(p.mime)),
      [parts],
    )

    // Track active tools
    const hasActiveTool = useMemo(
      () => toolParts.some((t) => t.state?.status === "running" || t.state?.status === "pending"),
      [toolParts],
    )

    // Sticky Auto-expand & User toggle
    const [userToggle, setUserToggle] = useState<boolean | null>(null)
    const wasAutoExpanded = useRef(false)

    if (hasActiveTool && !wasAutoExpanded.current) {
      wasAutoExpanded.current = true
    }

    const isCollapsibleTools = toolParts.length >= 3
    const showTools = isCollapsibleTools
      ? userToggle !== null
        ? userToggle
        : wasAutoExpanded.current || hasActiveTool
      : true

    const handleToggle = () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        Vibration.vibrate(8)
      } catch {}
      setUserToggle((prev) => (prev !== null ? !prev : !showTools))
    }

    const toolSummaryText = useMemo(() => {
      const counts: Record<string, number> = {}
      for (const t of toolParts) {
        const name = t.tool || "tool"
        counts[name] = (counts[name] || 0) + 1
      }
      return Object.entries(counts)
        .map(([name, count]) => `${count} ${name}`)
        .join(", ")
    }, [toolParts])

    const totalToolDuration = useMemo(() => {
      let minStart = Infinity
      let maxEnd = 0
      for (const t of toolParts) {
        const start = t.state?.time?.start
        const end = t.state?.time?.end
        if (start) minStart = Math.min(minStart, start)
        if (end) maxEnd = Math.max(maxEnd, end)
      }
      if (minStart !== Infinity && maxEnd > minStart) {
        const ms = maxEnd - minStart
        return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
      }
      return null
    }, [toolParts])

    const isCompleted = typeof (message as any).time?.completed === "number"
    const hasActiveReasoning = !isCompleted && reasoningParts.length > 0 && textParts.length === 0
    const timeLabel = formatMessageTime((message as any).time?.created || (message as any).created)

    const handleCopy = useCallback(async () => {
      const copyContent = text || reasoning
      if (!copyContent) return
      await Clipboard.setStringAsync(copyContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }, [text, reasoning])

    return (
      <View style={[s.bubbleContainer, isUser ? s.bubbleUserContainer : s.bubbleAssistantContainer]}>
        {isUser ? (
          <TouchableOpacity
            activeOpacity={onLongPress ? 0.7 : 1}
            onLongPress={onLongPress ? () => onLongPress(message.id, message.role, text) : undefined}
            disabled={!onLongPress}
            style={[
              s.bubble,
              s.user,
              isDark && s.userDark,
            ]}
            testID={`chat-bubble-${message.role}`}
          >
            {/* Image attachments */}
            {fileParts.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.imageRow}
                style={s.imageScroll}
              >
                {fileParts.map((fp) => (
                  <View key={fp.id} style={s.imageWrap}>
                    <Image source={{ uri: fp.url }} style={s.attachedImage} resizeMode="cover" />
                    {fp.filename && (
                      <Text style={[s.imageLabel, isDark && s.imageLabelDark]} numberOfLines={1}>
                        {fp.filename}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Message text */}
            {text.length > 0 && (
              <Text style={[s.messageText, isDark && s.textWhite]} selectable>
                {text}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View
            style={[
              s.bubble,
              s.assistant,
              isDark && s.assistantDark,
            ]}
            testID={`chat-bubble-${message.role}`}
          >
            {/* Role indicator (only for assistant) */}
            <TouchableOpacity
              activeOpacity={onLongPress ? 0.7 : 1}
              onLongPress={onLongPress ? () => onLongPress(message.id, message.role, text) : undefined}
              disabled={!onLongPress}
              style={s.header}
            >
              <OpenCodeMark size={13} isDark={isDark} />
              <Text style={[s.role, isDark && s.textWhite]}>Assistant</Text>
              {message.modelID && <Text style={[s.modelTag, isDark && s.modelTagDark]}>{message.modelID}</Text>}
            </TouchableOpacity>

          {/* Image attachments */}
          {fileParts.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.imageRow}
              style={s.imageScroll}
            >
              {fileParts.map((fp) => (
                <View key={fp.id} style={s.imageWrap}>
                  <Image source={{ uri: fp.url }} style={s.attachedImage} resizeMode="cover" />
                  {fp.filename && (
                    <Text style={[s.imageLabel, isDark && s.imageLabelDark]} numberOfLines={1}>
                      {fp.filename}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Reasoning (collapsible / streaming) */}
          {reasoning.length > 0 && (
            <ReasoningBlock text={reasoning} isDark={isDark} streaming={hasActiveReasoning} />
          )}

          {/* Message text */}
          {text.length > 0 &&
            (isUser ? (
              <Text style={[s.messageText, isDark && s.textWhite]} selectable>
                {text}
              </Text>
            ) : (
              <View style={s.markdownWrap}>
                <Markdown>{text}</Markdown>
              </View>
            ))}

          {/* Tool calls (T3-style grouping) */}
          {toolParts.length > 0 && (
            <View style={s.toolsContainer}>
              {isCollapsibleTools && !showTools ? (
                <>
                  {/* Collapsed: show latest tool call */}
                  {toolParts.slice(-1).map((tool) => (
                    <ToolCallCard key={tool.id} tool={tool} isDark={isDark} />
                  ))}
                  {/* Toggle to reveal earlier tool calls */}
                  <TouchableOpacity
                    style={[s.workGroupToggle, isDark && s.workGroupToggleDark]}
                    onPress={handleToggle}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`+${toolParts.length - 1} previous tool calls`}
                  >
                    <Ionicons name="chevron-down" size={12} color={isDark ? "#888888" : "#666666"} />
                    <Text style={[s.workGroupToggleText, isDark && s.textWhite]}>
                      +{toolParts.length - 1} previous tool calls
                      {totalToolDuration ? ` (${totalToolDuration})` : ""}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Expanded / normal: show all tool calls */}
                  {toolParts.map((tool) => (
                    <ToolCallCard key={tool.id} tool={tool} isDark={isDark} />
                  ))}
                  {/* If 3+ tools, show toggle to collapse */}
                  {isCollapsibleTools && (
                    <TouchableOpacity
                      style={[s.workGroupToggle, isDark && s.workGroupToggleDark]}
                      onPress={handleToggle}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Show fewer tool calls"
                    >
                      <Ionicons name="chevron-up" size={12} color={isDark ? "#888888" : "#666666"} />
                      <Text style={[s.workGroupToggleText, isDark && s.textWhite]}>
                        Show fewer tool calls
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Error banner */}
          {error && (
            <View style={[s.errorCard, isDark && s.errorCardDark]}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" style={s.errorIcon} />
              <View style={s.errorContent}>
                <Text style={[s.errorText, isDark && s.errorTextDark]}>{error}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Quick Action & Metadata Bar below the bubble */}
      <View style={[s.actionRow, isUser ? s.actionRowUser : s.actionRowAssistant]}>
          {copied && (
            <View style={[s.copiedBadge, isDark && s.copiedBadgeDark]}>
              <Text style={s.copiedBadgeText}>Copied</Text>
            </View>
          )}

          {!isUser && message.tokens && (
            <Text style={[s.tokens, isDark && s.tokensDark]}>
              {message.tokens.input + message.tokens.output} tokens
              {message.cost ? ` · $${message.cost.toFixed(4)}` : ""}
            </Text>
          )}

          {timeLabel.length > 0 && (
            <Text style={[s.timeText, isDark && s.timeTextDark]}>{timeLabel}</Text>
          )}

          {(text.length > 0 || reasoning.length > 0) && (
            <TouchableOpacity
              onPress={handleCopy}
              hitSlop={6}
              style={s.copyButton}
              accessibilityRole="button"
              accessibilityLabel="Copy message"
            >
              <Ionicons
                name="copy-outline"
                size={13}
                color={isDark ? "#737373" : "#a3a3a3"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  },
  (prev, next) => {
    if (prev.message !== next.message) return false
    if (prev.error !== next.error) return false
    if (prev.isDark !== next.isDark) return false
    if (prev.onLongPress !== next.onLongPress) return false
    if (prev.parts.length !== next.parts.length) return false
    for (let i = 0; i < prev.parts.length; i++) {
      if (prev.parts[i] !== next.parts[i]) return false
    }
    return true
  },
)

const s = StyleSheet.create({
  bubbleContainer: {
    marginBottom: 14,
    maxWidth: "100%",
  },
  bubbleUserContainer: {
    alignItems: "flex-end",
  },
  bubbleAssistantContainer: {
    alignItems: "stretch",
  },
  bubble: {
    maxWidth: "100%",
  },
  user: {
    backgroundColor: "#f0f0f0",
    maxWidth: "85%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  userDark: {
    backgroundColor: "#202020",
    borderColor: "#2e2e2e",
  },
  assistant: {
    backgroundColor: "transparent",
    alignSelf: "stretch",
    paddingVertical: 2,
  },
  assistantDark: {
    backgroundColor: "transparent",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  role: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
  },
  textWhite: {
    color: "#ffffff",
  },

  modelTag: {
    fontSize: 11,
    color: "#737373",
    backgroundColor: "#e5e5e5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  modelTagDark: {
    backgroundColor: "#262626",
    color: "#a3a3a3",
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#0a0a0a",
  },
  markdownWrap: {
    marginHorizontal: -2,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  actionRowUser: {
    justifyContent: "flex-end",
  },
  actionRowAssistant: {
    justifyContent: "flex-start",
  },
  timeText: {
    fontSize: 11,
    color: "#a3a3a3",
  },
  timeTextDark: {
    color: "#666666",
  },
  tokens: {
    fontSize: 11,
    color: "#a3a3a3",
  },
  tokensDark: {
    color: "#666666",
  },
  copyButton: {
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  copiedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: "#dcfce7",
  },
  copiedBadgeDark: {
    backgroundColor: "#064e3b",
  },
  copiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16a34a",
  },

  // Images
  imageScroll: { marginBottom: 8 },
  imageRow: { gap: 8 },
  imageWrap: { alignItems: "center" },
  attachedImage: {
    width: Math.min(200, SCREEN_WIDTH * 0.5),
    height: Math.min(200, SCREEN_WIDTH * 0.5),
    borderRadius: 8,
    backgroundColor: "#e5e5e5",
  },
  imageLabel: { fontSize: 10, color: "#666666", marginTop: 2, maxWidth: 200 },
  imageLabelDark: { color: "#888888" },

  // Tools container & Work group toggle
  toolsContainer: {
    marginVertical: 2,
  },
  workGroupToggle: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 3,
    marginBottom: 2,
  },
  workGroupToggleDark: {
    backgroundColor: "#161616",
    borderColor: "#262626",
  },
  workGroupToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#525252",
  },
  metaDark: { color: "#888888" },

  // Error banner
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  errorCardDark: {
    backgroundColor: "#1c1111",
    borderColor: "#451a1a",
  },
  errorIcon: {
    marginTop: 1,
  },
  errorContent: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#b91c1c",
  },
  errorTextDark: {
    color: "#f87171",
  },
})

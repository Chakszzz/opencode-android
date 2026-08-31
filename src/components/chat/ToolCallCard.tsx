import { useState, useCallback, memo } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform, LayoutAnimation, Vibration } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"
import type { Part } from "../../lib/sdk"
import { DiffView } from "./DiffView"
import { getToolPresentation } from "./tool-presentation"

const TOOL_ICONS: Record<string, string> = {
  read: "glasses-outline",
  list: "list-outline",
  glob: "search-outline",
  grep: "search-outline",
  webfetch: "globe-outline",
  edit: "code-slash-outline",
  write: "create-outline",
  apply_patch: "git-merge-outline",
  bash: "terminal-outline",
  task: "git-branch-outline",
  todowrite: "checkbox-outline",
  todoread: "checkbox-outline",
  question: "chatbubble-ellipses-outline",
  codesearch: "search-outline",
  websearch: "globe-outline",
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

function statusColor(status: string): string {
  if (status === "completed") return "#22c55e"
  if (status === "error") return "#ef4444"
  if (status === "running") return "#d97706"
  return "#888888"
}

// --- Tool-specific detail renderers ---

function BashDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const cmd = typeof input === "object" && input !== null ? (input as Record<string, unknown>).command : undefined
  const out = typeof output === "string" ? output : undefined
  return (
    <View style={s.detailSection}>
      {typeof cmd === "string" && (
        <View style={[s.codeBlock, isDark && s.codeBlockDark]}>
          <Text style={[s.codePre, isDark && s.codePteDark]} selectable>
            <Text style={[s.codePrompt, isDark && s.codePromptDark]}>$ </Text>
            {cmd}
          </Text>
        </View>
      )}
      {out !== undefined && out.length > 0 && (
        <View style={[s.codeBlock, isDark && s.codeBlockDark, { marginTop: 6 }]}>
          <Text style={[s.codePre, isDark && s.codePteDark]} selectable numberOfLines={80}>
            {out}
          </Text>
        </View>
      )}
    </View>
  )
}

function ReadDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const file = typeof input === "object" && input !== null ? (input as Record<string, unknown>).filePath : undefined
  const offset = typeof input === "object" && input !== null ? (input as Record<string, unknown>).offset : undefined
  const limit = typeof input === "object" && input !== null ? (input as Record<string, unknown>).limit : undefined
  const range = offset || limit ? ` (${offset || 0}..${limit || "end"})` : ""
  return (
    <View style={s.detailSection}>
      {typeof file === "string" && (
        <Text style={[s.detailFile, isDark && s.detailFileDark]} selectable numberOfLines={2}>
          {file}
          {range}
        </Text>
      )}
    </View>
  )
}

function WriteDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const file = typeof input === "object" && input !== null ? (input as Record<string, unknown>).filePath : undefined
  const content = typeof input === "object" && input !== null ? (input as Record<string, unknown>).content : undefined
  return (
    <View style={s.detailSection}>
      {typeof file === "string" && (
        <Text style={[s.detailFile, isDark && s.detailFileDark]} selectable numberOfLines={2}>
          {file}
        </Text>
      )}
      {typeof content === "string" && content.length > 0 && (
        <View style={[s.codeBlock, isDark && s.codeBlockDark, { marginTop: 6 }]}>
          <Text style={[s.codePre, isDark && s.codePteDark]} selectable numberOfLines={40}>
            {content}
          </Text>
        </View>
      )}
    </View>
  )
}

function EditDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const file = typeof input === "object" && input !== null ? (input as Record<string, unknown>).filePath : undefined
  const old = typeof input === "object" && input !== null ? (input as Record<string, unknown>).oldString : undefined
  const replacement =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>).newString : undefined

  if (typeof old === "string" && typeof replacement === "string") {
    return (
      <View style={s.detailSection}>
        {typeof file === "string" && (
          <Text style={[s.detailFile, isDark && s.detailFileDark]} selectable numberOfLines={2}>
            {file}
          </Text>
        )}
        <DiffView before={old} after={replacement} isDark={isDark} />
      </View>
    )
  }

  const text = typeof output === "string" ? output : JSON.stringify(output, null, 2)
  return (
    <View style={s.detailSection}>
      {typeof file === "string" && (
        <Text style={[s.detailFile, isDark && s.detailFileDark]} selectable numberOfLines={2}>
          {file}
        </Text>
      )}
      {text && (
        <View style={[s.codeBlock, isDark && s.codeBlockDark, { marginTop: 6 }]}>
          <Text style={[s.codePre, isDark && s.codePteDark]} selectable numberOfLines={40}>
            {text}
          </Text>
        </View>
      )}
    </View>
  )
}

function PatchDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const patch = typeof input === "object" && input !== null ? (input as Record<string, unknown>).patch : undefined
  const file = typeof input === "object" && input !== null ? (input as Record<string, unknown>).filePath : undefined
  return (
    <View style={s.detailSection}>
      {typeof file === "string" && (
        <Text style={[s.detailFile, isDark && s.detailFileDark]} selectable numberOfLines={2}>
          {file}
        </Text>
      )}
      {typeof patch === "string" && patch.length > 0 && (
        <DiffView patch={patch} isDark={isDark} />
      )}
    </View>
  )
}

function GlobGrepDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const { t } = useTranslation()
  const pattern = typeof input === "object" && input !== null ? (input as Record<string, unknown>).pattern : undefined
  const path = typeof input === "object" && input !== null ? (input as Record<string, unknown>).path : undefined
  const results = typeof output === "string" ? output : undefined
  return (
    <View style={s.detailSection}>
      {typeof pattern === "string" && (
        <Text style={[s.detailMeta, isDark && s.detailMetaDark]}>
          {typeof path === "string"
            ? t("chat.toolCallCard.patternWithPath", { pattern, path })
            : t("chat.toolCallCard.patternOnly", { pattern })}
        </Text>
      )}
      {results && results.length > 0 && (
        <View style={[s.codeBlock, isDark && s.codeBlockDark, { marginTop: 6 }]}>
          <Text style={[s.codePre, isDark && s.codePteDark]} selectable numberOfLines={30}>
            {results}
          </Text>
        </View>
      )}
    </View>
  )
}

function WebfetchDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const url = typeof input === "object" && input !== null ? (input as Record<string, unknown>).url : undefined
  return (
    <View style={s.detailSection}>
      {typeof url === "string" && (
        <Text style={[s.detailFile, isDark && s.detailFileDark, { color: isDark ? "#60a5fa" : "#3b82f6" }]} selectable numberOfLines={3}>
          {url}
        </Text>
      )}
    </View>
  )
}

function TaskDetail({ input, metadata, isDark }: { input: unknown; metadata?: unknown; isDark: boolean }) {
  const router = useRouter()
  const description =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>).description : undefined
  const prompt = typeof input === "object" && input !== null ? (input as Record<string, unknown>).prompt : undefined
  const subagentType =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>).subagent_type : undefined
  const sessionId =
    typeof metadata === "object" && metadata !== null ? (metadata as Record<string, unknown>).sessionId : undefined

  return (
    <View style={s.detailSection}>
      {typeof subagentType === "string" && (
        <View style={[s.subagentChip, isDark && s.subagentChipDark]}>
          <Ionicons name="git-branch-outline" size={12} color={isDark ? "#ffffff" : "#0a0a0a"} />
          <Text style={[s.subagentChipText, isDark && s.textWhite]}>
            Agent: {subagentType.toUpperCase()}
          </Text>
        </View>
      )}
      {typeof description === "string" && (
        <Text style={[s.detailMeta, isDark && s.detailMetaDark]}>{description}</Text>
      )}
      {typeof prompt === "string" && prompt.length > 0 && (
        <View style={[s.codeBlock, isDark && s.codeBlockDark, { marginTop: 6 }]}>
          <Text style={[s.codePre, isDark && s.codePteDark]} selectable numberOfLines={20}>
            {prompt}
          </Text>
        </View>
      )}
      {typeof sessionId === "string" && sessionId.length > 0 && (
        <TouchableOpacity
          style={[s.subagentLinkBtn, isDark && s.subagentLinkBtnDark]}
          onPress={() => router.push(`/session/${sessionId}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={13} color={isDark ? "#ffffff" : "#0a0a0a"} />
          <Text style={[s.subagentLinkBtnText, isDark && s.textWhite]}>
            Open Subagent Session ({sessionId.slice(0, 8)}...)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function TodoDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const todos = typeof input === "object" && input !== null ? (input as Record<string, unknown>).todos : undefined
  if (!Array.isArray(todos)) return null
  return (
    <View style={s.detailSection}>
      {todos.map((t, i) => {
        const item = t as Record<string, unknown>
        const done = item.status === "completed"
        return (
          <View key={String(item.id || i)} style={s.todoRow}>
            <Ionicons
              name={done ? "checkbox" : "square-outline"}
              size={16}
              color={done ? "#22c55e" : isDark ? "#666666" : "#999999"}
            />
            <Text style={[s.todoText, isDark && s.todoTextDark, done && s.todoDone]} numberOfLines={2}>
              {String(item.content || item.title || "")}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function GenericDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const text =
    typeof output === "string"
      ? output
      : output !== undefined && output !== null
        ? JSON.stringify(output, null, 2)
        : typeof input === "object" && input !== null
          ? JSON.stringify(input, null, 2)
          : undefined
  if (!text || text.length === 0) return null
  return (
    <View style={s.detailSection}>
      <View style={[s.codeBlock, isDark && s.codeBlockDark]}>
        <Text style={[s.codePre, isDark && s.codePteDark]} selectable numberOfLines={30}>
          {text}
        </Text>
      </View>
    </View>
  )
}

function ToolDetail({ tool, isDark }: { tool: Part; isDark: boolean }) {
  const name = tool.tool || ""
  const input = tool.state?.input
  const output = tool.state?.output

  switch (name) {
    case "bash":
      return <BashDetail input={input} output={output} isDark={isDark} />
    case "read":
      return <ReadDetail input={input} isDark={isDark} />
    case "write":
      return <WriteDetail input={input} isDark={isDark} />
    case "edit":
      return <EditDetail input={input} output={output} isDark={isDark} />
    case "apply_patch":
      return <PatchDetail input={input} isDark={isDark} />
    case "glob":
    case "grep":
    case "list":
    case "codesearch":
      return <GlobGrepDetail input={input} output={output} isDark={isDark} />
    case "webfetch":
    case "websearch":
      return <WebfetchDetail input={input} isDark={isDark} />
    case "task":
      return <TaskDetail input={input} metadata={(tool.state as any)?.metadata} isDark={isDark} />
    case "todowrite":
      return <TodoDetail input={input} isDark={isDark} />
    default:
      return <GenericDetail input={input} output={output} isDark={isDark} />
  }
}

// --- Error display ---
function ErrorBanner({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <View style={[s.errorBanner, isDark && s.errorBannerDark]}>
      <Ionicons name="alert-circle" size={14} color="#ef4444" />
      <Text style={s.errorText} numberOfLines={3} selectable>
        {message}
      </Text>
    </View>
  )
}

// --- Duration display ---
function duration(start?: number, end?: number): string | null {
  if (!start || !end) return null
  const ms = end - start
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// --- Main component ---
interface Props {
  tool: Part
  isDark: boolean
}

export const ToolCallCard = memo(function ToolCallCard({ tool, isDark }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const icon = (tool.tool && TOOL_ICONS[tool.tool]) || "extension-puzzle-outline"
  const status = tool.state?.status || "pending"
  const color = statusColor(status)
  const error = tool.state?.error?.message
  const elapsed = duration(tool.state?.time?.start, tool.state?.time?.end)
  const hasDetail = tool.state?.input !== undefined || tool.state?.output !== undefined || !!error

  const presentation = getToolPresentation(tool)

  const toggle = useCallback(() => {
    if (hasDetail) {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        Vibration.vibrate(8)
      } catch {}
      setExpanded((v) => !v)
    }
  }, [hasDetail])

  const handleLongPress = useCallback(async () => {
    if (!presentation.copyText) return
    try {
      Vibration.vibrate(20)
    } catch {}
    await Clipboard.setStringAsync(presentation.copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [presentation.copyText])

  return (
    <View style={s.wrapper}>
      {/* Sleek compact tool row */}
      <TouchableOpacity
        style={[
          s.row,
          isDark ? s.rowDark : s.rowLight,
          status === "error" && (isDark ? s.rowErrorDark : s.rowErrorLight),
        ]}
        onPress={toggle}
        onLongPress={handleLongPress}
        activeOpacity={hasDetail ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`${presentation.summary} ${presentation.detail || ""}`}
        accessibilityHint="Tap to expand details. Long press to copy."
      >
        {/* Left: Tool icon */}
        <View style={s.iconWrap}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>

        {/* Center: Action Summary + Detail */}
        <View style={s.textWrap}>
          <Text style={[s.actionSummary, isDark && s.textWhite]} numberOfLines={1}>
            {presentation.summary}
            {presentation.detail ? (
              <Text style={[s.actionDetail, isDark && s.actionDetailDark]}> {presentation.detail}</Text>
            ) : null}
          </Text>
        </View>

        {/* Right: Copied badge, elapsed time, status icon & chevron */}
        <View style={s.metaWrap}>
          {copied && (
            <View style={[s.copiedBadge, isDark && s.copiedBadgeDark]}>
              <Text style={s.copiedBadgeText}>Copied</Text>
            </View>
          )}

          {elapsed && <Text style={[s.elapsed, isDark && s.elapsedDark]}>{elapsed}</Text>}

          {status === "running" && <ActivityIndicator size="small" color={color} />}
          {status === "completed" && <Ionicons name="checkmark" size={14} color="#22c55e" />}
          {status === "error" && <Ionicons name="close" size={14} color="#ef4444" />}

          {hasDetail && (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={13}
              color={isDark ? "#737373" : "#a3a3a3"}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Error banner if not expanded */}
      {error && !expanded && <ErrorBanner message={error} isDark={isDark} />}

      {/* Expanded detail drawer attached below */}
      {expanded && (
        <View style={[s.drawer, isDark ? s.drawerDark : s.drawerLight]}>
          <ScrollView style={s.detailScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {error && <ErrorBanner message={error} isDark={isDark} />}
            <ToolDetail tool={tool} isDark={isDark} />
          </ScrollView>
        </View>
      )}
    </View>
  )
})

const s = StyleSheet.create({
  wrapper: {
    marginTop: 4,
    marginBottom: 2,
  },
  row: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  rowLight: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  rowDark: {
    backgroundColor: "#181818",
    borderColor: "#262626",
  },
  rowErrorLight: {
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
  },
  rowErrorDark: {
    borderColor: "#7f1d1d",
    backgroundColor: "#201212",
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    justifyContent: "center",
  },
  actionSummary: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  actionDetail: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6b7280",
    fontFamily: mono,
  },
  actionDetailDark: {
    color: "#9ca3af",
  },
  metaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
  elapsed: {
    fontSize: 11,
    color: "#888888",
    fontFamily: mono,
  },
  elapsedDark: {
    color: "#737373",
  },
  textWhite: {
    color: "#ffffff",
  },

  // Attached drawer
  drawer: {
    marginLeft: 8,
    paddingLeft: 10,
    paddingTop: 6,
    paddingBottom: 4,
    borderLeftWidth: 2,
  },
  drawerLight: {
    borderLeftColor: "#e5e7eb",
  },
  drawerDark: {
    borderLeftColor: "#2e2e2e",
  },
  detailScroll: {
    maxHeight: 280,
  },
  detailSection: {
    marginTop: 2,
  },
  detailFile: {
    fontSize: 12,
    fontFamily: mono,
    color: "#0969da",
    marginBottom: 4,
  },
  detailFileDark: {
    color: "#58a6ff",
  },
  detailMeta: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 4,
  },
  detailMetaDark: {
    color: "#9ca3af",
  },
  codeBlock: {
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  codeBlockDark: {
    backgroundColor: "#141414",
    borderColor: "#262626",
  },
  codePre: {
    fontFamily: mono,
    fontSize: 11,
    lineHeight: 16,
    color: "#1f2937",
  },
  codePteDark: {
    color: "#e5e7eb",
  },
  codePrompt: {
    color: "#16a34a",
    fontWeight: "700",
  },
  codePromptDark: {
    color: "#22c55e",
  },

  // Subagents
  subagentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  subagentChipDark: {
    backgroundColor: "#262626",
  },
  subagentChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  subagentLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  subagentLinkBtnDark: {
    backgroundColor: "#222222",
  },
  subagentLinkBtnText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#0a0a0a",
  },

  // Todo
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  todoText: {
    fontSize: 12,
    color: "#374151",
    flex: 1,
  },
  todoTextDark: {
    color: "#d1d5db",
  },
  todoDone: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
    padding: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorBannerDark: {
    backgroundColor: "#221111",
    borderColor: "#7f1d1d",
  },
  errorText: {
    fontSize: 11,
    color: "#ef4444",
    flex: 1,
    lineHeight: 15,
  },
})

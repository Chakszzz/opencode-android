import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Share,
  Vibration,
} from "react-native"
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from "expo-router"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as Clipboard from "expo-clipboard"
import type BottomSheet from "@gorhom/bottom-sheet"
import type { Message, Part, Session } from "../../src/lib/sdk"
import {
  MessageBubble,
  PermissionPrompt,
  QuestionPrompt,
  StatusIndicator,
  SlashPopover,
  ModelPicker,
  ModelLogo,
  VariantPicker,
  ConnectProviderSheet,
  McpSheet,
  StatusSheet,
  DirectoryBrowserSheet,
  OpenCodeSettingsSheet,
  SkillsSheet,
  ReviewDiffSheet,
  SubagentsSheet,
  AgentPickerSheet,
  FileViewerSheet,
  FileMentionPopover,
  TodoSheet,
  TodoDock,
  RevertDock,
  FollowupDock,
  SessionsSheet,
  ImageAttachments,
  SessionInfo,
  groupMessagesIntoTurns,
  type TurnGroupItem,
  type SlashCommand,
  type Attachment,
  type Skill,
} from "../../src/components/chat"
import { useSessions } from "../../src/stores/sessions"
import { useEvents, refreshPending } from "../../src/stores/events"
import { useConnections } from "../../src/stores/connections"
import { useAuth } from "../../src/stores/auth"
import { useCatalog } from "../../src/stores/catalog"
import { useSpeech } from "../../src/lib/speech"
import { reduceLiveFollow } from "../../src/lib/live-follow"
import { readClipboardContent } from "../../src/lib/clipboard-paste"

// --- Builtin slash commands ---
const BUILTIN_COMMANDS: SlashCommand[] = [
  {
    trigger: "new",
    title: "New Session",
    description: "Start a new session",
    icon: "add-circle-outline",
    type: "builtin",
  },
  {
    trigger: "clear",
    title: "Clear Session",
    description: "Start a new session",
    icon: "trash-outline",
    type: "builtin",
  },
  {
    trigger: "sessions",
    title: "All Sessions",
    description: "Go back to sessions list",
    icon: "chatbubbles-outline",
    type: "builtin",
  },
  {
    trigger: "resume",
    title: "Resume Session",
    description: "Go back to sessions list",
    icon: "chatbubbles-outline",
    type: "builtin",
  },
  {
    trigger: "continue",
    title: "Continue Session",
    description: "Go back to sessions list",
    icon: "chatbubbles-outline",
    type: "builtin",
  },
  {
    trigger: "model",
    title: "Switch Model",
    description: "Choose a different model",
    icon: "hardware-chip-outline",
    type: "builtin",
  },
  {
    trigger: "models",
    title: "Switch Model",
    description: "Choose a different model",
    icon: "hardware-chip-outline",
    type: "builtin",
  },
  {
    trigger: "mo",
    title: "Switch Model",
    description: "Choose a different model",
    icon: "hardware-chip-outline",
    type: "builtin",
  },
  {
    trigger: "agent",
    title: "Switch Agent",
    description: "Cycle to next agent",
    icon: "person-outline",
    type: "builtin",
  },
  {
    trigger: "agents",
    title: "Switch Agent",
    description: "Cycle to next agent",
    icon: "person-outline",
    type: "builtin",
  },
  {
    trigger: "connect",
    title: "Connect Provider",
    description: "Manage AI providers & API keys",
    icon: "key-outline",
    type: "builtin",
  },
  {
    trigger: "settings",
    title: "Server Settings",
    description: "OpenCode server configuration & opencode.json",
    icon: "settings-outline",
    type: "builtin",
  },
  {
    trigger: "exit",
    title: "Exit",
    description: "Exit the session",
    icon: "exit-outline",
    type: "builtin",
  },
  {
    trigger: "quit",
    title: "Quit",
    description: "Exit the session",
    icon: "exit-outline",
    type: "builtin",
  },
  {
    trigger: "workspaces",
    title: "Workspaces",
    description: "Switch workspaces",
    icon: "folder-open-outline",
    type: "builtin",
  },
  {
    trigger: "mcps",
    title: "Toggle MCPs",
    description: "Manage MCP tools",
    icon: "construct-outline",
    type: "builtin",
  },
  {
    trigger: "variants",
    title: "Model Variants",
    description: "Switch model variants",
    icon: "color-wand-outline",
    type: "builtin",
  },
  {
    trigger: "org",
    title: "Switch Org",
    description: "Switch organization",
    icon: "business-outline",
    type: "builtin",
  },
  {
    trigger: "status",
    title: "View Status",
    description: "System status",
    icon: "information-circle-outline",
    type: "builtin",
  },
  {
    trigger: "debug",
    title: "Debug Info",
    description: "View debug logs",
    icon: "bug-outline",
    type: "builtin",
  },
  {
    trigger: "themes",
    title: "Switch Theme",
    description: "Change app theme",
    icon: "color-palette-outline",
    type: "builtin",
  },
  {
    trigger: "help",
    title: "Help",
    description: "Show help",
    icon: "help-circle-outline",
    type: "builtin",
  },
  {
    trigger: "switch",
    title: "Switch Session",
    description: "Switch between project sessions",
    icon: "swap-horizontal-outline",
    type: "builtin",
  },
  {
    trigger: "compact",
    title: "Compact Session",
    description: "Summarize session with AI compaction",
    icon: "contract-outline",
    type: "builtin",
  },
  {
    trigger: "skills",
    title: "Browse Skills",
    description: "Browse available skills",
    icon: "library-outline",
    type: "builtin",
  },
  {
    trigger: "editor",
    title: "Open Editor",
    description: "Open external editor",
    icon: "create-outline",
    type: "builtin",
  },
  {
    trigger: "init",
    title: "Initialize AGENTS.md",
    description: "Create/update AGENTS.md in project root",
    icon: "document-text-outline",
    type: "builtin",
  },
  {
    trigger: "review",
    title: "Code Review",
    description: "Run native OpenCode AI code review",
    icon: "git-pull-request-outline",
    type: "builtin",
  },
  {
    trigger: "diff",
    title: "View Diffs",
    description: "Visual Git diff viewer",
    icon: "git-compare-outline",
    type: "builtin",
  },
  {
    trigger: "docs",
    title: "Search Docs",
    description: "Search documentation",
    icon: "book-outline",
    type: "builtin",
  },
  {
    trigger: "memory",
    title: "Manage Memory",
    description: "Manage memory and rules",
    icon: "hardware-chip-outline",
    type: "builtin",
  },
  {
    trigger: "rules",
    title: "Manage Rules",
    description: "Manage custom rules",
    icon: "shield-checkmark-outline",
    type: "builtin",
  },
  {
    trigger: "hooks",
    title: "Manage Hooks",
    description: "Manage hooks",
    icon: "git-commit-outline",
    type: "builtin",
  },
  {
    trigger: "profile",
    title: "View Profile",
    description: "View user profile",
    icon: "person-circle-outline",
    type: "builtin",
  },
  {
    trigger: "usage",
    title: "Usage Stats",
    description: "View usage statistics",
    icon: "analytics-outline",
    type: "builtin",
  },
  {
    trigger: "todo",
    title: "Manage Todos",
    description: "View and manage todos",
    icon: "checkbox-outline",
    type: "builtin",
  },
  {
    trigger: "budget",
    title: "Budget Settings",
    description: "Manage budget settings",
    icon: "wallet-outline",
    type: "builtin",
  },
  {
    trigger: "feedback",
    title: "Send Feedback",
    description: "Send feedback to OpenCode",
    icon: "chatbubble-outline",
    type: "builtin",
  },
  {
    trigger: "history",
    title: "View History",
    description: "View session history",
    icon: "time-outline",
    type: "builtin",
  },
  {
    trigger: "share",
    title: "Share Session",
    description: "Export & share session markdown transcript",
    icon: "share-social-outline",
    type: "builtin",
  },
  {
    trigger: "mcp",
    title: "Manage MCP",
    description: "Manage a specific MCP",
    icon: "construct-outline",
    type: "builtin",
  },
  {
    trigger: "export",
    title: "Export Session",
    description: "Export full session transcript to markdown",
    icon: "download-outline",
    type: "builtin",
  },
  {
    trigger: "import",
    title: "Import Session",
    description: "Import session data",
    icon: "enter-outline",
    type: "builtin",
  },
]

const EMPTY_ARRAY: never[] = []

function getShortDir(dir?: string): string | null {
  if (!dir) return null
  const parts = dir.split("/").filter(Boolean)
  return parts[parts.length - 1] || null
}

export default function SessionScreen() {
  const { id, directory } = useLocalSearchParams<{ id: string; directory?: string }>()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const flatListRef = useRef<FlatList>(null)
  const modelSheetRef = useRef<BottomSheet>(null)
  const variantSheetRef = useRef<BottomSheet>(null)
  const providerSheetRef = useRef<BottomSheet>(null)
  const mcpSheetRef = useRef<BottomSheet>(null)
  const statusSheetRef = useRef<BottomSheet>(null)
  const workspaceSheetRef = useRef<BottomSheet>(null)
  const opencodeSettingsSheetRef = useRef<BottomSheet>(null)
  const skillsSheetRef = useRef<BottomSheet>(null)
  const reviewDiffSheetRef = useRef<BottomSheet>(null)
  const subagentsSheetRef = useRef<BottomSheet>(null)
  const agentSheetRef = useRef<BottomSheet>(null)
  const fileViewerSheetRef = useRef<BottomSheet>(null)
  const todoSheetRef = useRef<BottomSheet>(null)
  const sessionsSheetRef = useRef<BottomSheet>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showInfo, setShowInfo] = useState(false)

  const currentSession = useSessions((s) => s.currentSession)
  const messages = useSessions((s) => s.messages)
  const parts = useSessions((s) => s.parts)
  const isLoading = useSessions((s) => s.isLoading)
  const loadingMore = useSessions((s) => s.loadingMore)
  const hasMore = useSessions((s) => s.hasMore)
  const sessionsError = useSessions((s) => s.error)
  const selectSession = useSessions((s) => s.selectSession)
  const sendMessage = useSessions((s) => s.sendMessage)
  const abortSession = useSessions((s) => s.abortSession)
  const loadOlderMessages = useSessions((s) => s.loadOlderMessages)
  const revertToMessage = useSessions((s) => s.revertToMessage)
  const unrevertSession = useSessions((s) => s.unrevertSession)
  const clearError = useSessions((s) => s.clearError)
  const loadSubagents = useSessions((s) => s.loadSubagents)
  const subagents = useSessions((s) => s.subagents)
  const subagentsLoading = useSessions((s) => s.subagentsLoading)

  // Derive sending state for this specific session
  const isSending = useSessions((s) => !!(currentSession && s.sending[currentSession.id]))

  const { authenticateForMessage } = useAuth()
  const client = useConnections((s) => s.client)
  const clientForDirectory = useConnections((s) => s.clientForDirectory)

  // Use directory-aware client for sessions that belong to a project other than the active one
  const sessionClient = useMemo(
    () => (currentSession?.directory ? (clientForDirectory(currentSession.directory) ?? client) : client),
    [currentSession?.directory, clientForDirectory, client],
  )

  // Catalog
  const rawAgents = useCatalog((s) => s.agents)
  const rawCommands = useCatalog((s) => s.commands)
  const rawProviders = useCatalog((s) => s.providers)
  const agents = Array.isArray(rawAgents) ? rawAgents : EMPTY_ARRAY
  const serverCommands = Array.isArray(rawCommands) ? rawCommands : EMPTY_ARRAY
  const providers = Array.isArray(rawProviders) ? rawProviders : EMPTY_ARRAY
  const agent = useCatalog((s) => s.agent) || ""
  const setAgent = useCatalog((s) => s.setAgent)
  const model = useCatalog((s) => s.model)
  const setModel = useCatalog((s) => s.setModel)
  const variant = useCatalog((s) => s.variant)
  const setVariant = useCatalog((s) => s.setVariant)
  const cycleAgent = useCatalog((s) => s.cycleAgent)

  // Permission & question state
  const sessionID = currentSession?.id
  const permissions = useEvents((s) => (sessionID ? s.permissions[sessionID] : undefined)) ?? EMPTY_ARRAY
  const questions = useEvents((s) => (sessionID ? s.questions[sessionID] : undefined)) ?? EMPTY_ARRAY
  const sessionStatus = useEvents((s) => (sessionID ? s.sessionStatus[sessionID] : undefined))
  const statusText = useEvents((s) => (sessionID ? s.statusText[sessionID] : undefined))
  const isWorking = isSending || sessionStatus?.type === "busy" || !!(statusText && statusText !== "Idle")

  const shortDir = getShortDir(currentSession?.directory)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isDraggingRef = useRef(false)
  const [liveFollow, setLiveFollow] = useState({ isLiveFollow: true, isAtBottom: true })

  // SSE reconnect banner
  const reconnectAttempts = useEvents((s) => s.reconnectAttempts)
  const [showConnectedFlash, setShowConnectedFlash] = useState(false)
  const prevReconnecting = useRef(false)

  // Voice input — transcript appends to the text input on completion
  const speech = useSpeech(
    useCallback((text: string) => {
      setInput((prev) => (prev ? prev + " " + text : text))
    }, []),
  )

  // Clear stale speech error when returning to this screen.
  useFocusEffect(
    useCallback(() => {
      speech.reset()
    }, [speech.reset]),
  )

  // Surface speech recognition failures (e.g. mic permission denied). Keyed
  // on the error value itself so it only fires once per distinct error, not
  // on every re-render while it remains set.
  useEffect(() => {
    if (!speech.error) return
    Alert.alert(t("session.alerts.speechErrorTitle"), t("session.alerts.speechErrorMessage"))
  }, [speech.error, t])

  // Slash command state
  const slashActive = input.startsWith("/") && !input.includes(" ")
  const slashQuery = slashActive ? input.slice(1) : ""

  // @ file mention state
  const mentionMatch = input.match(/(?:^|\s)@([^\s]*)$/)
  const mentionActive = !slashActive && Boolean(mentionMatch)
  const mentionQuery = mentionMatch ? mentionMatch[1] : ""

  const handleMentionSelect = useCallback((filePath: string) => {
    setInput((prev) =>
      prev.replace(/(?:^|\s)@([^\s]*)$/, (match) => {
        const prefix = match.startsWith(" ") ? " @" : "@"
        return `${prefix}${filePath} `
      }),
    )
  }, [])

  const allCommands = useMemo<SlashCommand[]>(() => {
    const seen = new Set<string>()
    const result: SlashCommand[] = []

    // Builtin commands first
    for (const cmd of BUILTIN_COMMANDS) {
      const key = cmd.trigger.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        result.push(cmd)
      }
    }

    // Custom / server commands (deduplicate against builtins)
    for (const cmd of serverCommands) {
      const key = cmd.name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        result.push({
          trigger: cmd.name,
          title: cmd.name,
          description: cmd.description,
          icon: "code-slash-outline",
          type: "custom",
        })
      }
    }

    return result
  }, [serverCommands])

  // While a revert is pending, the reverted message and everything after it
  // still exist server-side (cleanup only runs on the next prompt/unrevert)
  // — hide them client-side so editing feels immediate. Message IDs are
  // lexicographically sortable, same comparison the TUI uses. Optimistic
  // "temp-" IDs (assigned client-side before the server responds, see
  // sendMessage) aren't part of that sort order — always keep them so a
  // message sent concurrently with a revert isn't hidden.
  const revertMessageID = currentSession?.revert?.messageID

  // Cache turn item references so older turns maintain stable object identity
  // during streaming, preventing VirtualizedList from re-rendering the entire list.
  const itemCacheRef = useRef<Map<string, TurnGroupItem>>(new Map())

  // Inverted FlatList: data is reversed (newest first) so newest renders at bottom
  const messageData = useMemo(() => {
    const rawTurns = groupMessagesIntoTurns(messages || [], parts, revertMessageID)
    const cache = itemCacheRef.current

    const result = rawTurns.map((turn) => {
      const cached = cache.get(turn.id)
      if (
        cached &&
        cached.message === turn.message &&
        cached.error === turn.error &&
        cached.parts.length === turn.parts.length &&
        cached.parts.every((p, i) => p === turn.parts[i])
      ) {
        return cached
      }
      cache.set(turn.id, turn)
      return turn
    })

    return result.reverse()
  }, [messages, parts, revertMessageID])

  // Tracks the latest composer text without pulling `input` into
  // handleMessageLongPress's deps — kept as a plain ref assignment (not
  // state) so the callback below stays referentially stable across
  // keystrokes for MessageBubble's custom memo comparator.
  const inputRef = useRef(input)
  inputRef.current = input

  const applyRevertResult = useCallback((result: Awaited<ReturnType<typeof revertToMessage>>) => {
    if (!result.ok) {
      if (result.reason === "unsupported") {
        Alert.alert(t("session.alerts.notSupportedTitle"), t("session.alerts.notSupportedMessage"))
      } else if (result.reason === "auth") {
        Alert.alert(t("session.alerts.revertAuthFailedTitle"), t("session.alerts.revertAuthFailedMessage"))
      } else {
        Alert.alert(t("session.alerts.editFailedTitle"), t("session.alerts.editFailedMessage"))
      }
      return
    }

    // Prefill the composer with the reverted message's text
    setInput(result.text)
    inputRef.current = result.text

    // Restore any image attachments that were on the reverted message
    setAttachments(
      result.files
        .filter((f): f is typeof f & { url: string; mime: string } => Boolean(f.url && f.mime))
        .map((f) => ({ uri: f.url, mime: f.mime, filename: f.filename })),
    )
  }, [t])

  const handleShareSession = useCallback(() => {
    const session = useSessions.getState().currentSession
    const sessionMsgs = useSessions.getState().messages
    const sessionParts = useSessions.getState().parts
    if (!session || !sessionMsgs.length) {
      Alert.alert("Empty Session", "There are no messages in this session to export or share.")
      return
    }
    const transcript = [
      `# ${session.title || "OpenCode Session"}`,
      `*Directory: ${session.directory || "root"}*`,
      `*Exported on ${new Date().toLocaleString()}*`,
      "",
      ...sessionMsgs.map((m) => {
        const roleHeader = m.role === "user" ? "### 👤 User" : `### 🤖 Assistant (${m.modelID || "AI"})`
        const msgParts = sessionParts[m.id] || []
        const text = msgParts
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n")
        return `${roleHeader}\n\n${text}\n`
      }),
    ].join("\n")

    Alert.alert(session.title || "OpenCode Session", "Export or share session transcript", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: "Share via Apps",
        onPress: () => {
          Share.share({
            title: session.title || "OpenCode Session",
            message: transcript,
          }).catch(() => {})
        },
      },
      {
        text: "Copy Full Markdown",
        onPress: async () => {
          await Clipboard.setStringAsync(transcript)
          Alert.alert("Copied", "Full session markdown transcript copied to clipboard.")
        },
      },
    ])
  }, [t])

  const handleForkFromMessage = useCallback(
    async (targetMessageID?: string) => {
      const session = useSessions.getState().currentSession
      if (!session) return
      const title = `${t("session.actions.forkPrefix")}: ${session.title || t("sessionsList.untitledSession")}`
      const create = useSessions.getState().createSession
      const newSession = await create(title)
      if (newSession) {
        router.push({
          pathname: `/session/[id]`,
          params: { id: newSession.id, ...(session.directory ? { directory: session.directory } : {}) },
        })
      } else {
        Alert.alert(t("session.alerts.forkFailedTitle"), t("session.alerts.forkFailedMessage"))
      }
    },
    [t, router],
  )

  // Stable across renders (reads fresh state via getState() rather than
  // closing over props) so MessageBubble's custom memo comparator can bail
  // safely without risking a stale handler.
  const handleMessageLongPress = useCallback(
    (messageID: string, role: "user" | "assistant", messageText: string) => {
      if (role === "user") {
        Alert.alert(t("session.alerts.messageActionsTitle"), undefined, [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: "Copy Message Text",
            onPress: async () => {
              await Clipboard.setStringAsync(messageText)
              Alert.alert("Copied", "User message copied to clipboard.")
            },
          },
          {
            text: t("session.actions.fork"),
            onPress: () => handleForkFromMessage(messageID),
          },
          {
            text: t("session.actions.editMessage"),
            onPress: () => {
              const doRevert = async () => {
                const result = await useSessions.getState().revertToMessage(messageID)
                applyRevertResult(result)
              }
              // Editing overwrites the composer — don't silently clobber an
              // in-progress unsent draft.
              if (inputRef.current.trim()) {
                Alert.alert(
                  t("session.alerts.replaceDraftTitle"),
                  t("session.alerts.replaceDraftMessage"),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    { text: t("session.actions.replace"), style: "destructive", onPress: doRevert },
                  ],
                  { cancelable: false },
                )
                return
              }
              doRevert()
            },
          },
        ])
      } else {
        // Assistant message actions
        Alert.alert("Assistant Response", undefined, [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: "Copy Response (Markdown)",
            onPress: async () => {
              await Clipboard.setStringAsync(messageText)
              Alert.alert("Copied", "Assistant response copied to clipboard.")
            },
          },
          {
            text: "Copy Code Blocks Only",
            onPress: async () => {
              const codeBlocks = (messageText.match(/```[\s\S]*?```/g) || [])
                .map((b) => b.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, ""))
                .join("\n\n---\n\n")
              if (codeBlocks.trim()) {
                await Clipboard.setStringAsync(codeBlocks)
                Alert.alert("Copied", "Code blocks copied to clipboard.")
              } else {
                Alert.alert("No Code Blocks", "No fenced code blocks found in this message.")
              }
            },
          },
          {
            text: t("session.actions.fork"),
            onPress: () => handleForkFromMessage(messageID),
          },
          {
            text: "Share Response",
            onPress: () => {
              Share.share({ message: messageText })
            },
          },
        ])
      }
    },
    [applyRevertResult, handleForkFromMessage, t],
  )

  const renderMessage = useCallback(
    ({ item }: { item: TurnGroupItem }) => (
      <MessageBubble
        message={item.message}
        parts={item.parts}
        error={item.error}
        isDark={isDark}
        onLongPress={handleMessageLongPress}
      />
    ),
    [isDark, handleMessageLongPress],
  )

  const scrollToBottom = useCallback((animated = true) => {
    setLiveFollow((prev) => reduceLiveFollow(prev, { type: "snap-bottom" }))
    flatListRef.current?.scrollToOffset({ offset: 0, animated })
  }, [])

  // Re-select on every focus, not just mount. currentSession/messages/
  // permissions are a single global store, and the native stack keeps screens
  // underneath a pushed one mounted. Without re-selecting on focus, navigating
  // to another session and back would leave this screen bound to the *other*
  // session's data (and its permission/question prompts) — so a user could
  // approve the wrong session's tool call. useFocusEffect re-binds this screen
  // to its own session whenever it becomes visible again.
  useFocusEffect(
    useCallback(() => {
      if (!id) return
      selectSession(id, directory).then(() => {
        // Re-fetch pending permissions/questions from the server to recover from
        // missed SSE events or failed optimistic removals
        const connState = useConnections.getState()
        const c = directory ? (connState.clientForDirectory(directory) ?? connState.client) : connState.client
        if (c) refreshPending(c, id)
        loadSubagents()
      })
    }, [id, directory]),
  )

  // Sync model chip from latest assistant message
  useEffect(() => {
    if (!messages || messages.length === 0) return
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === "assistant" && msg.providerID && msg.modelID) {
        setModel({ providerID: msg.providerID, modelID: msg.modelID })
        return
      }
      if (msg.role === "user" && msg.model) {
        setModel(msg.model)
        return
      }
    }
  }, [currentSession?.id, messages?.length])

  // Variants for current model (for reasoning effort picker)
  const currentModelVariants = useMemo(() => {
    if (!model) return undefined
    const provider = providers.find((p) => p.id === model.providerID)
    const found = provider?.models.find((m) => m.id === model.modelID)
    return found?.variants
  }, [model, providers])

  // Slash command handler
  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.type === "builtin") {
        switch (cmd.trigger) {
          case "new": {
            setInput("")
            const dir = currentSession?.directory || (directory as string | undefined)
            useSessions.getState().createSession(undefined, dir).then((newSession) => {
              if (newSession) {
                router.replace({
                  pathname: "/session/[id]",
                  params: { id: newSession.id, ...(dir ? { directory: dir } : {}) },
                })
              }
            })
            return
          }
          case "clear": {
            setInput("")
            Alert.alert(
              "Clear Session",
              "Start a fresh session in this project directory?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Start New",
                  onPress: async () => {
                    const dir = currentSession?.directory || (directory as string | undefined)
                    const newSession = await useSessions.getState().createSession(undefined, dir)
                    if (newSession) {
                      router.replace({
                        pathname: "/session/[id]",
                        params: { id: newSession.id, ...(dir ? { directory: dir } : {}) },
                      })
                    }
                  },
                },
              ],
            )
            return
          }
          case "sessions":
          case "resume":
          case "continue":
          case "switch":
            setInput("")
            sessionsSheetRef.current?.expand()
            return
          case "exit":
          case "quit":
            setInput("")
            router.replace("/(tabs)")
            return
          case "model":
          case "models":
          case "mo":
            setInput("")
            modelSheetRef.current?.expand()
            return
          case "agent":
          case "agents":
            setInput("")
            agentSheetRef.current?.expand()
            return
          case "connect":
            setInput("")
            providerSheetRef.current?.expand()
            return
          case "settings":
            setInput("")
            opencodeSettingsSheetRef.current?.expand()
            return
          case "themes":
            router.replace("/(tabs)/settings")
            return
          case "variants":
            setInput("")
            if (currentModelVariants && Object.keys(currentModelVariants).length > 0) {
              variantSheetRef.current?.expand()
            } else {
              Alert.alert(
                "No Variants Available",
                "The current model does not support reasoning effort variants (e.g. low/medium/high).",
              )
            }
            return
          case "workspaces":
          case "file":
          case "files":
            setInput("")
            workspaceSheetRef.current?.expand()
            return
          case "mcps":
          case "mcp":
            setInput("")
            mcpSheetRef.current?.expand()
            return
          case "status":
            setInput("")
            statusSheetRef.current?.expand()
            return
          case "share":
          case "export":
            setInput("")
            handleShareSession()
            return
          case "org":
          case "debug":
          case "help":
            setInput("")
            Alert.alert(
              "Not Implemented",
              `The /${cmd.trigger} command is currently only available via the OpenCode CLI/TUI on your server. Mobile UI is coming soon!`
            )
            return
          case "compact":
            setInput("")
            if (!sessionClient || !currentSession) {
              Alert.alert("Error", "No active session or connection.")
              return
            }
            sessionClient.session
              .summarize(currentSession.id, {
                providerID: model?.providerID,
                modelID: model?.modelID,
                auto: false,
              })
              .then(() => {
                console.log("[slash] compact: summarize triggered")
              })
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err)
                Alert.alert("Compact Failed", msg)
              })
            return
          case "skills":
          case "skill":
            setInput("")
            skillsSheetRef.current?.expand()
            return
          case "init":
            setInput("")
            if (!sessionClient || !currentSession) {
              Alert.alert("Error", "No active session or connection.")
              return
            }
            if (!model?.providerID || !model?.modelID) {
              Alert.alert("Model Required", "Please select a model before initializing AGENTS.md.")
              return
            }
            sessionClient
              .init(currentSession.id, {
                providerID: model.providerID,
                modelID: model.modelID,
                messageID: messages?.[messages.length - 1]?.id || "",
              })
              .then(() => {
                Alert.alert("Initialized", "AGENTS.md initialization requested on server!")
              })
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err)
                Alert.alert("Init Failed", msg)
              })
            return
          case "review":
            setInput("")
            if (!sessionClient || !currentSession) {
              Alert.alert("Error", "No active session or connection.")
              return
            }
            sessionClient.session
              .command(currentSession.id, {
                command: "review",
                arguments: "",
                agent,
                model: model ? `${model.providerID}/${model.modelID}` : undefined,
              })
              .then(() => {
                console.log("[slash] review: native AI code review triggered")
              })
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err)
                Alert.alert("Review Failed", msg)
              })
            return
          case "diff":
            setInput("")
            reviewDiffSheetRef.current?.expand()
            return
          case "subagents":
          case "subagent":
            setInput("")
            subagentsSheetRef.current?.expand()
            return
          case "todo":
          case "todos":
          case "tasks":
            setInput("")
            todoSheetRef.current?.expand()
            return
          case "editor":
          case "docs":
          case "memory":
          case "rules":
          case "hooks":
          case "profile":
          case "usage":
          case "budget":
          case "feedback":
          case "history":
          case "import":
            setInput("")
            Alert.alert(
              "Not Implemented",
              `The /${cmd.trigger} command is currently only available via the OpenCode CLI/TUI on your server. Mobile UI is coming soon!`
            )
            return
        }
      }
      setInput(`/${cmd.trigger} `)
    },
    [router, cycleAgent, currentModelVariants, sessionClient, currentSession, model, messages],
  )

  const handleWorkspaceSelect = useCallback(
    (dir: string) => {
      workspaceSheetRef.current?.close()
      Alert.alert(
        "Open Workspace",
        `Start a new session in ${dir}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open",
            onPress: () => {
              router.push({
                pathname: "/session/[id]",
                params: { id: "new", directory: dir },
              })
            },
          },
        ],
      )
    },
    [router],
  )

  const handleSelectSkill = useCallback((skill: Skill) => {
    setInput((prev) => (prev ? `${prev} use skill ${skill.name}` : `Use the ${skill.name} skill to `))
  }, [])

  const handleSelectSubagent = useCallback(
    (sa: Session) => {
      router.push({
        pathname: "/session/[id]",
        params: { id: sa.id, ...(sa.directory ? { directory: sa.directory } : {}) },
      })
    },
    [router],
  )

  const handleSelectFile = useCallback((filePath: string) => {
    setSelectedFilePath(filePath)
    fileViewerSheetRef.current?.expand()
  }, [])

  const handleQuoteDiffLine = useCallback((file: string, lineText: string) => {
    setInput((prev) => {
      const quote = `> [${file}]: ${lineText}\n\n`
      return prev ? `${prev}\n${quote}` : quote
    })
  }, [])

  const handleSelectOtherSession = useCallback(
    (targetSession: Session) => {
      if (targetSession.id === currentSession?.id) return
      router.replace({
        pathname: "/session/[id]",
        params: {
          id: targetSession.id,
          ...(targetSession.directory ? { directory: targetSession.directory } : {}),
        },
      })
    },
    [currentSession?.id, router],
  )

  const handleCreateSessionFromSheet = useCallback(async () => {
    const dir = currentSession?.directory || (directory as string | undefined)
    const newSession = await useSessions.getState().createSession(undefined, dir)
    if (newSession) {
      router.replace({
        pathname: "/session/[id]",
        params: { id: newSession.id, ...(dir ? { directory: dir } : {}) },
      })
    }
  }, [currentSession?.directory, directory, router])

  // --- Image picking ---

  // Convert any image (including HEIC/HEIF from iOS) to guaranteed JPEG bytes
  const MAX_DIMENSION = 1568 // Anthropic recommended max
  async function toJpeg(uri: string, width: number, height: number): Promise<Attachment> {
    const actions: ImageManipulator.Action[] = []
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height)
      actions.push({ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } })
    }
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.8,
      base64: true,
    })
    return {
      uri: result.uri,
      mime: "image/jpeg",
      filename: "image.jpg",
      width: result.width,
      height: result.height,
      base64: result.base64 || undefined,
    }
  }

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1, // full quality - we compress in manipulator
    })
    if (result.canceled) return
    const settled = await Promise.allSettled(result.assets.map((a) => toJpeg(a.uri, a.width, a.height)))
    const items = settled.filter((r) => r.status === "fulfilled").map((r) => r.value)
    if (items.length) setAttachments((prev) => [...prev, ...items])
    if (settled.some((r) => r.status === "rejected")) {
      console.error(
        "Failed to process image(s):",
        settled.filter((r) => r.status === "rejected").map((r) => r.reason),
      )
      Alert.alert(t("session.alerts.imageFailedTitle"), t("session.alerts.imageFailedMessage"))
    }
  }, [t])

  const pickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t("session.alerts.cameraPermissionTitle"), t("session.alerts.cameraPermissionMessage"))
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 })
    if (result.canceled) return
    const a = result.assets[0]
    try {
      const item = await toJpeg(a.uri, a.width, a.height)
      setAttachments((prev) => [...prev, item])
    } catch (err) {
      console.error("Failed to process photo:", err)
      Alert.alert(t("session.alerts.imageFailedTitle"), t("session.alerts.imageFailedMessage"))
    }
  }, [t])

  const pasteFromClipboard = useCallback(async () => {
    const result = await readClipboardContent(attachments.length, 10)
    if (result.image) {
      try {
        const item = await toJpeg(result.image.uri, result.image.width, result.image.height)
        setAttachments((prev) => [...prev, item])
        try {
          Vibration.vibrate(10)
        } catch {}
        return
      } catch (err) {
        console.error("Failed to process clipboard image:", err)
      }
    }
    if (result.text) {
      setInput((prev) => (prev ? `${prev}\n${result.text}` : result.text!))
      try {
        Vibration.vibrate(10)
      } catch {}
      return
    }
    if (result.error) {
      Alert.alert(t("session.alerts.emptyClipboardTitle"), result.error)
    }
  }, [attachments.length, t])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // --- Send ---
  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return
    const authenticated = await authenticateForMessage()
    if (!authenticated) {
      Alert.alert(t("session.alerts.authRequiredTitle"), t("session.alerts.authRequiredMessage"))
      return
    }

    const text = input.trim()
    const files = [...attachments]
    setInput("")
    setAttachments([])

    // Slash command intercepts (no attachments for commands)
    if (text.startsWith("/") && files.length === 0) {
      if (text === "/diff") {
        reviewDiffSheetRef.current?.expand()
        return
      }
      const [cmdName, ...args] = text.split(" ")
      const name = cmdName.slice(1)
      const match = serverCommands.find((c) => c.name === name)
      if ((match || name === "review" || name === "init") && sessionClient && currentSession) {
        sessionClient.session
          .command(currentSession.id, {
            command: name,
            arguments: args.join(" "),
            agent,
            model: model ? `${model.providerID}/${model.modelID}` : undefined,
          })
          .catch((err) => console.error("Command failed:", err))
        return
      }
    }

    // Messages are queued server-side when the session is busy.
    // No need to abort - just send and it will be processed after current response.
    try {
      await sendMessage(text, model || undefined, agent || undefined, files, variant || undefined)
    } catch (err) {
      console.error("Send failed:", err)
      // Restore the user's text and attachments so their input isn't lost.
      setInput((prev) => (prev ? prev : text))
      setAttachments((prev) => (prev.length ? prev : files))
      Alert.alert(t("session.alerts.sendFailedTitle"), t("session.alerts.sendFailedMessage"))
    }
  }

  const handleSelectFollowup = useCallback(
    async (followupText: string, immediateSend?: boolean) => {
      if (immediateSend) {
        const authenticated = await authenticateForMessage()
        if (!authenticated) {
          Alert.alert(t("session.alerts.authRequiredTitle"), t("session.alerts.authRequiredMessage"))
          return
        }
        try {
          await sendMessage(followupText.trim(), model || undefined, agent || undefined, [], variant || undefined)
        } catch (err) {
          console.error("Followup send failed:", err)
          Alert.alert(t("session.alerts.sendFailedTitle"), t("session.alerts.sendFailedMessage"))
        }
      } else {
        setInput((prev) => (prev.trim() ? `${prev} ${followupText}` : followupText))
      }
    },
    [authenticateForMessage, sendMessage, model, agent, variant, t],
  )

  const handleUnrevert = useCallback(async () => {
    await unrevertSession()
    setInput("")
    setAttachments([])
  }, [unrevertSession])

  // In inverted mode, offset 0 = bottom. Show scroll button when scrolled away from bottom.
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent
    setShowScrollButton(contentOffset.y > 200)
    setLiveFollow((prev) =>
      reduceLiveFollow(prev, {
        type: "scroll",
        offsetY: contentOffset.y,
        isDragging: isDraggingRef.current,
      }),
    )
  }, [])

  const handleScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true
    setLiveFollow((prev) => reduceLiveFollow(prev, { type: "user-drag-begin" }))
  }, [])

  const handleScrollEndDrag = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Auto-scroll to bottom on incoming streaming content only when live follow is enabled (throttled to max once every 100ms)
  const lastScrollTimeRef = useRef(0)
  useEffect(() => {
    if (liveFollow.isLiveFollow && messageData.length > 0) {
      const now = Date.now()
      if (now - lastScrollTimeRef.current > 100) {
        lastScrollTimeRef.current = now
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
      }
    }
  }, [messageData, liveFollow.isLiveFollow])

  // Debounce: onEndReached can fire multiple times during a single scroll gesture
  const loadingTriggered = useRef(false)
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loadingTriggered.current) {
      loadingTriggered.current = true
      loadOlderMessages()
    }
  }, [hasMore, loadingMore, loadOlderMessages])

  // Reset trigger when loading finishes
  useEffect(() => {
    if (!loadingMore) loadingTriggered.current = false
  }, [loadingMore])

  // Detect reconnecting → stable transition for the "Connected ✓" flash.
  // reconnectAttempts and lastDisconnectAt reset in the same set() call, so we
  // can't use lastDisconnectAt alone; a useRef tracks the prior reconnecting state.
  useEffect(() => {
    const isReconnecting = reconnectAttempts > 0
    if (prevReconnecting.current && !isReconnecting) {
      setShowConnectedFlash(true)
      const t = setTimeout(() => setShowConnectedFlash(false), 2000)
      return () => clearTimeout(t)
    }
    prevReconnecting.current = isReconnecting
  }, [reconnectAttempts])

  const handlePermissionReply = async (requestID: string, reply: "once" | "always" | "reject") => {
    if (!sessionClient || !sessionID) return
    // Snapshot for rollback
    const snapshot = useEvents.getState().permissions[sessionID] || []
    // Optimistically remove from UI
    useEvents.setState((state) => ({
      permissions: {
        ...state.permissions,
        [sessionID]: snapshot.filter((p) => p.id !== requestID),
      },
    }))
    try {
      await sessionClient.permission.reply(requestID, reply)
    } catch (err) {
      console.error("Permission reply failed:", err)
      // Restore the prompt so the user can retry
      useEvents.setState((state) => ({
        permissions: { ...state.permissions, [sessionID]: snapshot },
      }))
      Alert.alert(t("session.alerts.replyFailedTitle"), t("session.alerts.replyFailedMessage"))
    }
  }

  const handleQuestionReply = async (requestID: string, answers: string[][]) => {
    if (!sessionClient || !sessionID) return
    const snapshot = useEvents.getState().questions[sessionID] || []
    useEvents.setState((state) => ({
      questions: {
        ...state.questions,
        [sessionID]: snapshot.filter((q) => q.id !== requestID),
      },
    }))
    try {
      await sessionClient.question.reply(requestID, answers)
    } catch (err) {
      console.error("Question reply failed:", err)
      useEvents.setState((state) => ({
        questions: { ...state.questions, [sessionID]: snapshot },
      }))
      Alert.alert(t("session.alerts.replyFailedTitle"), t("session.alerts.replyFailedMessage"))
    }
  }

  const handleQuestionReject = async (requestID: string) => {
    if (!sessionClient || !sessionID) return
    const snapshot = useEvents.getState().questions[sessionID] || []
    useEvents.setState((state) => ({
      questions: {
        ...state.questions,
        [sessionID]: snapshot.filter((q) => q.id !== requestID),
      },
    }))
    try {
      await sessionClient.question.reject(requestID)
    } catch (err) {
      console.error("Question reject failed:", err)
      useEvents.setState((state) => ({
        questions: { ...state.questions, [sessionID]: snapshot },
      }))
      Alert.alert(t("session.alerts.rejectFailedTitle"), t("session.alerts.rejectFailedMessage"))
    }
  }

  const handleModelSelect = useCallback(
    (providerID: string, modelID: string) => {
      setModel({ providerID, modelID })
    },
    [setModel],
  )

  // Current agent display
  const currentAgent = agents.find((a) => a.name === agent)
  const agentColor = currentAgent?.color || (isDark ? "#ffffff" : "#0a0a0a")
  const modelLabel = model?.modelID ? model.modelID.split("/").pop() || model.modelID : "default"

  return (
    <>
      <Stack.Screen
        options={{
          title: currentSession?.title || t("session.titleFallback"),
          headerRight: () => (
            <View style={s.headerRight}>
              {shortDir && (
                <View style={[s.dirBadge, isDark && s.dirBadgeDark]}>
                  <Ionicons name="folder-outline" size={14} color={isDark ? "#888888" : "#666666"} />
                  <Text style={[s.dirText, isDark && s.dirTextDark]}>{shortDir}</Text>
                </View>
              )}
              <TouchableOpacity onPress={handleShareSession} hitSlop={8}>
                <Ionicons name="share-outline" size={20} color={isDark ? "#888888" : "#666666"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowInfo((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showInfo ? "stats-chart" : "stats-chart-outline"}
                  size={20}
                  color={showInfo ? "#3b82f6" : isDark ? "#888888" : "#666666"}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={[s.container, isDark && s.containerDark]}
        // Both platforms use "padding" so the composer/toolbar is pushed up
        // above the keyboard via JS-measured keyboard height.
        //
        // Android previously relied on the native android:windowSoftInputMode
        // (adjustResize, see AndroidManifest.xml) with behavior={undefined}
        // to let the OS resize the window (see #70/#53). Since adopting
        // Expo's mandatory edge-to-edge display, Android no longer resizes
        // the window when the keyboard opens — the system assumes insets are
        // handled dynamically — so adjustResize became a no-op and the
        // bottom toolbar + input were left completely hidden behind the
        // keyboard (#147). "padding" restores avoidance without depending
        // on native resize.
        behavior="padding"
        keyboardVerticalOffset={90}
      >
        {/* Session info pulldown */}
        <SessionInfo
          session={currentSession}
          messages={messages || []}
          providers={providers}
          visible={showInfo}
          isDark={isDark}
          hasMore={hasMore}
          loadingAll={loadingMore}
          onLoadAll={() => {
            if (hasMore && !loadingMore) loadOlderMessages()
          }}
          onScrollToTop={() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }}
          onClose={() => setShowInfo(false)}
        />

        {/* Error banner */}
        {sessionsError && (
          <View style={[s.banner, s.bannerError]}>
            <Text style={s.bannerText} selectable={true}>{sessionsError}</Text>
            <TouchableOpacity onPress={clearError} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* SSE reconnect/connected banner */}
        {reconnectAttempts > 0 && (
          <View style={[s.banner, s.bannerReconnecting]}>
            <Text style={s.bannerText}>{t("session.banners.reconnecting", { attempt: reconnectAttempts })}</Text>
          </View>
        )}
        {showConnectedFlash && reconnectAttempts === 0 && (
          <View style={[s.banner, s.bannerConnected]}>
            <Text style={s.bannerText}>{t("session.banners.connected")}</Text>
          </View>
        )}


        {isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0a0a0a"} />
          </View>
        ) : (
          <View style={s.listWrap}>
            <FlatList
              ref={flatListRef}
              data={messageData}
              inverted
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={s.messageList}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              scrollEventThrottle={16}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              maxToRenderPerBatch={10}
              windowSize={7}
              initialNumToRender={10}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={false}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              ListFooterComponent={
                loadingMore ? (
                  <View style={s.loadingMore}>
                    <ActivityIndicator size="small" color={isDark ? "#888888" : "#666666"} />
                    <Text style={[s.loadingMoreText, isDark && s.metaDark]}>{t("session.loadingOlder")}</Text>
                  </View>
                ) : null
              }
            />
            {/* Empty state rendered OUTSIDE the inverted list to avoid the
                inverted transform mirroring its text/icon (see #ui-mirror). */}
            {messageData.length === 0 && (
              <View style={s.emptyOverlay} pointerEvents="none">
                <Ionicons name="chatbubble-outline" size={48} color={isDark ? "#444444" : "#cccccc"} />
                <Text style={[s.emptyText, isDark && s.metaDark]}>{t("session.empty.title")}</Text>
                <Text style={[s.emptyHint, isDark && s.metaDark]}>{t("session.empty.hint")}</Text>
              </View>
            )}
            {showScrollButton && (
              <TouchableOpacity style={[s.scrollBtn, isDark && s.scrollBtnDark]} onPress={() => scrollToBottom(true)}>
                <Ionicons name="chevron-down" size={24} color={isDark ? "#ffffff" : "#0a0a0a"} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Status */}
        {currentSession && <StatusIndicator sessionID={currentSession.id} isDark={isDark} />}

        {/* Permissions */}
        {permissions.map((perm) => (
          <PermissionPrompt
            key={perm.id}
            permission={perm}
            isDark={isDark}
            onReply={(reply) => handlePermissionReply(perm.id, reply)}
          />
        ))}

        {/* Questions */}
        {questions.map((q) => (
          <QuestionPrompt
            key={q.id}
            request={q}
            isDark={isDark}
            onReply={(answers) => handleQuestionReply(q.id, answers)}
            onReject={() => handleQuestionReject(q.id)}
          />
        ))}

        {/* Slash popover */}
        {slashActive && (
          <SlashPopover query={slashQuery} commands={allCommands} isDark={isDark} onSelect={handleSlashSelect} />
        )}

        {/* File @ mention popover */}
        {mentionActive && (
          <FileMentionPopover
            query={mentionQuery}
            client={sessionClient}
            directory={currentSession?.directory}
            isDark={isDark}
            onSelect={handleMentionSelect}
          />
        )}

        {/* Revert & Restore Dock */}
        {revertMessageID && (
          <RevertDock
            revertMessageID={revertMessageID}
            messages={messages}
            isDark={isDark}
            onUnrevert={handleUnrevert}
          />
        )}

        {/* Live Todo Tracking Dock */}
        {parts && (
          <TodoDock
            parts={parts}
            isDark={isDark}
            onOpenSheet={() => todoSheetRef.current?.expand()}
          />
        )}

        {/* Suggested Next Steps / Followup Dock */}
        <FollowupDock
          messages={messages}
          parts={parts}
          isSending={isSending}
          isBusy={isWorking}
          isDark={isDark}
          onSelectFollowup={handleSelectFollowup}
        />

        {/* Agent/model toolbar */}
        <View style={[s.toolbar, isDark && s.toolbarDark]}>
          <TouchableOpacity
            style={[s.agentChip, { borderColor: agentColor }]}
            onPress={() => agentSheetRef.current?.expand()}
            onLongPress={() => cycleAgent()}
          >
            <View style={[s.agentDot, { backgroundColor: agentColor }]} />
            <Text style={[s.agentLabel, isDark && s.textWhite]}>{agent || "build"}</Text>
            <Ionicons name="swap-horizontal-outline" size={12} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modelChip, isDark && s.modelChipDark]}
            onPress={() => modelSheetRef.current?.expand()}
            testID="model-chip"
          >
            <ModelLogo providerID={model?.providerID} modelID={model?.modelID} isDark={isDark} size={13} />
            <Text style={[s.modelLabel, isDark && s.metaDark]} numberOfLines={1}>
              {modelLabel}
            </Text>
          </TouchableOpacity>

          {currentModelVariants && Object.keys(currentModelVariants).length > 0 && (
            <TouchableOpacity
              style={[
                s.variantChip,
                isDark && s.variantChipDark,
                variant && s.variantChipActive,
                variant && isDark && s.variantChipActiveDark,
              ]}
              onPress={() => variantSheetRef.current?.expand()}
              testID="variant-chip"
            >
              <MaterialCommunityIcons
                name="brain"
                size={14}
                color={variant ? (isDark ? "#ffffff" : "#0a0a0a") : isDark ? "#888888" : "#666666"}
              />
              <Text
                style={[
                  s.variantLabel,
                  isDark && s.metaDark,
                  variant && (isDark ? s.textWhite : s.variantLabelActive),
                ]}
                numberOfLines={1}
              >
                {variant ? variant.charAt(0).toUpperCase() + variant.slice(1) : t("session.toolbar.auto")}
              </Text>
            </TouchableOpacity>
          )}

          {subagents.length > 0 && (
            <TouchableOpacity
              style={[s.subagentChip, isDark && s.subagentChipDark]}
              onPress={() => subagentsSheetRef.current?.expand()}
              testID="subagent-chip"
            >
              <Ionicons name="git-branch-outline" size={13} color={isDark ? "#ffffff" : "#0a0a0a"} />
              <Text style={[s.subagentChipText, isDark && s.textWhite]} numberOfLines={1}>
                {subagents.length} Subagent{subagents.length > 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Attachment preview */}
        <ImageAttachments attachments={attachments} isDark={isDark} onRemove={removeAttachment} />

        {/* Input */}
        <View
          style={[s.inputContainer, isDark && s.inputContainerDark, { paddingBottom: Math.max(12, insets.bottom) }]}
        >
          <View style={s.inputRow}>
            {/* Attach button */}
            <TouchableOpacity style={s.attachBtn} onPress={pickFromLibrary} onLongPress={pickFromCamera}>
              <Ionicons name="add-circle-outline" size={26} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>

            {/* Clipboard paste button */}
            <TouchableOpacity style={s.attachBtn} onPress={pasteFromClipboard}>
              <Ionicons name="clipboard-outline" size={22} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>

            <TextInput
              style={[s.input, isDark && s.inputDark, speech.listening && s.inputListening]}
              placeholder={
                speech.listening
                  ? t("session.input.placeholderListening")
                  : isSending
                    ? t("session.input.placeholderFollowUp")
                    : t("session.input.placeholderDefault")
              }
              placeholderTextColor={speech.listening ? "#ef4444" : isDark ? "#666666" : "#999999"}
              value={speech.listening ? speech.transcript : input}
              onChangeText={speech.listening ? undefined : setInput}
              editable={!speech.listening}
              multiline
              testID="chat-message-input"
            />
            {/* Stop button: only when busy and no input */}
            {isSending && !input.trim() && attachments.length === 0 && !speech.listening && (
              <TouchableOpacity style={s.stopBtn} onPress={abortSession}>
                <Ionicons name="stop" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            {/* Mic button: when no input, not sending, and not listening */}
            {!isSending && !input.trim() && attachments.length === 0 && !speech.listening && (
              <TouchableOpacity style={s.micBtn} onPress={speech.start}>
                <Ionicons name="mic" size={22} color={isDark ? "#888888" : "#666666"} />
              </TouchableOpacity>
            )}
            {/* Listening indicator: tap to stop */}
            {speech.listening && (
              <TouchableOpacity style={s.micBtnActive} onPress={speech.stop}>
                <Ionicons name="mic" size={22} color="#ffffff" />
              </TouchableOpacity>
            )}
            {/* Send button: when there's input */}
            {!speech.listening && (input.trim() || attachments.length > 0) && (
              <TouchableOpacity
                style={[s.sendBtn, isDark && s.sendBtnDark]}
                onPress={handleSend}
                testID="chat-send-button"
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={isDark ? "#0a0a0a" : "#ffffff"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Model picker bottom sheet */}
      <ModelPicker
        sheetRef={modelSheetRef}
        providers={providers}
        selected={model}
        isDark={isDark}
        onSelect={handleModelSelect}
      />

      {/* Reasoning effort (variant) picker bottom sheet */}
      <VariantPicker
        sheetRef={variantSheetRef}
        variants={currentModelVariants}
        selected={variant}
        isDark={isDark}
        onSelect={setVariant}
      />

      {/* Connect AI provider bottom sheet */}
      <ConnectProviderSheet sheetRef={providerSheetRef} isDark={isDark} />

      {/* MCP tools management bottom sheet */}
      <McpSheet sheetRef={mcpSheetRef} isDark={isDark} />

      {/* System & token status bottom sheet */}
      <StatusSheet sheetRef={statusSheetRef} isDark={isDark} />

      {/* Workspace / Directory browser bottom sheet */}
      <DirectoryBrowserSheet
        sheetRef={workspaceSheetRef}
        startDirectory={currentSession?.directory || null}
        clientForDirectory={clientForDirectory}
        isDark={isDark}
        onSelect={handleWorkspaceSelect}
        showFiles={true}
        onSelectFile={handleSelectFile}
      />

      {/* OpenCode native server configuration bottom sheet */}
      <OpenCodeSettingsSheet sheetRef={opencodeSettingsSheetRef} isDark={isDark} />

      {/* Skills browser bottom sheet */}
      <SkillsSheet
        sheetRef={skillsSheetRef}
        isDark={isDark}
        onSelectSkill={handleSelectSkill}
      />

      {/* Review git changes bottom sheet */}
      <ReviewDiffSheet
        sheetRef={reviewDiffSheetRef}
        isDark={isDark}
        sessionClient={sessionClient}
        sessionID={currentSession?.id}
        onQuoteLine={handleQuoteDiffLine}
      />

      {/* Subagents / child sessions bottom sheet */}
      <SubagentsSheet
        sheetRef={subagentsSheetRef}
        isDark={isDark}
        subagents={subagents}
        loading={subagentsLoading}
        onRefresh={loadSubagents}
        onSelectSubagent={handleSelectSubagent}
      />

      {/* Agent picker bottom sheet */}
      <AgentPickerSheet
        sheetRef={agentSheetRef}
        isDark={isDark}
        agents={agents}
        currentAgent={agent}
        onSelectAgent={setAgent}
      />

      {/* In-app file viewer & preview bottom sheet */}
      <FileViewerSheet
        sheetRef={fileViewerSheetRef}
        isDark={isDark}
        filePath={selectedFilePath}
        client={sessionClient}
      />

      {/* Tasks & Todo tracker bottom sheet */}
      <TodoSheet
        sheetRef={todoSheetRef}
        isDark={isDark}
        parts={parts}
      />

      {/* Sessions switcher bottom sheet */}
      <SessionsSheet
        sheetRef={sessionsSheetRef}
        isDark={isDark}
        currentSessionID={currentSession?.id}
        currentDirectory={currentSession?.directory || (directory as string | undefined)}
        onSelectSession={handleSelectOtherSession}
        onCreateNewSession={handleCreateSessionFromSheet}
      />
    </>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  containerDark: { backgroundColor: "#0a0a0a" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  listWrap: { flex: 1, position: "relative" },

  // Messages
  messageList: { padding: 16, paddingBottom: 8 },

  // Scroll button
  scrollBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollBtnDark: { backgroundColor: "#2a2a2a" },

  // Loading more (appears at top in inverted list = ListFooterComponent)
  loadingMore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingMoreText: { fontSize: 13, color: "#999999" },

  // Empty state overlay — sits on top of the (empty) inverted list, untransformed,
  // so its text/icon render upright and un-mirrored on Android.
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },

  // Empty
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 64 },
  emptyText: { fontSize: 16, color: "#999999", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#bbbbbb", marginTop: 4 },
  metaDark: { color: "#666666" },
  textWhite: { color: "#ffffff" },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#ffffff",
  },
  toolbarDark: { borderTopColor: "#1a1a1a", backgroundColor: "#0a0a0a" },
  agentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  agentDot: { width: 8, height: 8, borderRadius: 4 },
  agentLabel: { fontSize: 12, fontWeight: "600", color: "#0a0a0a" },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modelChipDark: { backgroundColor: "#1a1a1a" },
  modelLabel: { fontSize: 12, color: "#666666", maxWidth: 160 },

  // Variant (reasoning effort) chip
  variantChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  variantChipDark: { backgroundColor: "#1a1a1a" },
  variantChipActive: {
    backgroundColor: "#e5e5e5",
    borderWidth: 1,
    borderColor: "#cccccc",
  },
  variantChipActiveDark: {
    backgroundColor: "#262626",
    borderColor: "#444444",
  },
  variantLabel: { fontSize: 12, color: "#666666" },
  variantLabelActive: { color: "#0a0a0a", fontWeight: "600" },
  subagentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  subagentChipDark: { backgroundColor: "#222222" },
  subagentChipText: { fontSize: 12, fontWeight: "600", color: "#0a0a0a" },

  // Input
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#ffffff",
  },
  inputContainerDark: { borderTopColor: "#1a1a1a", backgroundColor: "#0a0a0a" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  attachBtn: {
    width: 36,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    color: "#0a0a0a",
  },
  inputDark: { backgroundColor: "#1a1a1a", color: "#ffffff" },
  inputListening: { borderWidth: 1, borderColor: "#ef4444" },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendBtnDark: { backgroundColor: "#ffffff" },
  sendBtnDisabled: { backgroundColor: "#cccccc" },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  micBtnActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  stopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Header
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dirBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dirBadgeDark: { backgroundColor: "#1a1a1a" },
  dirText: { fontSize: 12, color: "#666666", fontWeight: "500" },
  dirTextDark: { color: "#888888" },

  // SSE reconnect/connected banner
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
  },
  bannerReconnecting: { backgroundColor: "#92400e" },
  bannerConnected: { backgroundColor: "#065f46" },
  bannerError: { backgroundColor: "#991b1b", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 6 },
  bannerText: { color: "#ffffff", fontSize: 13, fontWeight: "500" },

  // Pending revert (edit message) banner
  bannerRevert: {
    backgroundColor: "#1e3a8a",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bannerAction: { color: "#93c5fd", fontSize: 13, fontWeight: "700" },

  // Subagent section
  subagentSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#ffffff",
  },
  subagentSectionDark: { borderTopColor: "#1a1a1a", backgroundColor: "#0a0a0a" },
  subagentHeader: { fontSize: 12, fontWeight: "600", color: "#666666", paddingHorizontal: 16, paddingVertical: 8 },
  subagentHeaderDark: { color: "#888888" },
  subagentItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  subagentItemDark: { backgroundColor: "#0a0a0a" },
  subagentItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  subagentItemText: { flex: 1 },
  subagentTitle: { fontSize: 14, color: "#0a0a0a" },
  subagentTitleDark: { color: "#ffffff" },
  subagentMeta: { fontSize: 12, color: "#999999" },
  subagentMetaDark: { color: "#666666" },
  subagentDot: { width: 8, height: 8, borderRadius: 4 },
})

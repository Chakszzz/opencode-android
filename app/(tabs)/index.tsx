import { useCallback, useMemo, useState, useRef, useEffect, memo } from "react"
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Vibration,
} from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import { useSessions } from "../../src/stores/sessions"
import { useConnections } from "../../src/stores/connections"
import { useEvents } from "../../src/stores/events"
import { useCatalog } from "../../src/stores/catalog"
import type BottomSheet from "@gorhom/bottom-sheet"
import type { Session, Project } from "../../src/lib/sdk"
import { DirectorySwitcher, DirectoryBrowserSheet, NewSessionSheet } from "../../src/components/chat"
import { groupByDirectory } from "../../src/lib/session-grouping"
import { UpdateBanner } from "../../src/components/UpdateBanner"
import { OpenCodeAsciiBanner } from "../../src/components/OpenCodeLogo"
import { nameOf } from "../../src/lib/path-utils"
import { SETUP_GUIDE_URL } from "../../src/lib/links"

function formatTime(timestamp: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return t("sessionsList.time.justNow")
  if (diff < 3600000) return t("sessionsList.time.minutesAgo", { count: Math.floor(diff / 60000) })
  if (diff < 86400000) return t("sessionsList.time.hoursAgo", { count: Math.floor(diff / 3600000) })
  if (diff < 604800000) return t("sessionsList.time.daysAgo", { count: Math.floor(diff / 86400000) })

  return date.toLocaleDateString()
}

const SessionItem = memo(function SessionItem({
  session,
  isDark,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  session: Session
  isDark: boolean
  onRename: () => void
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const isArchived = !!session.time?.archived

  const onPress = () => {
    router.push({
      pathname: `/session/[id]`,
      params: { id: session.id, ...(session.directory ? { directory: session.directory } : {}) },
    })
  }

  const onLongPress = () => {
    Alert.alert(session.title || t("sessionsList.untitledSession"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("sessionsList.actions.rename"), onPress: onRename },
      isArchived
        ? { text: t("sessionsList.actions.unarchive"), onPress: onUnarchive }
        : { text: t("sessionsList.actions.archive"), onPress: onArchive },
      { text: t("common.delete"), style: "destructive", onPress: onDelete },
    ])
  }

  // Clean up auto-generated timestamp titles to be more compact
  let displayTitle = session.title || t("sessionsList.untitledSession")
  if (displayTitle.startsWith("New session - 20") || displayTitle.startsWith("New session - ")) {
    displayTitle = "New session"
  }

  return (
    <TouchableOpacity
      style={[styles.sessionItem, isDark && styles.sessionItemDark]}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={`session-item-${session.id}`}
    >
      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionTitle, isDark && styles.textDark]} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>
        <Text style={[styles.sessionMeta, isDark && styles.metaDark]}>
          {formatTime(session.time.updated, t)}
          {session.summary && session.summary.files > 0 &&
            ` · ${t("sessionsList.filesCount", { count: session.summary.files })}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? "#444444" : "#cccccc"} />
    </TouchableOpacity>
  )
})

// Flattened list row — either a collapsible group header or a session.
// A single flat array keeps FlatList's refresh/empty-state handling as-is
// instead of switching to SectionList.
type ListRow =
  | { type: "header"; directory: string; shortName: string; count: number; collapsed: boolean }
  | { type: "session"; session: Session }

const GroupHeader = memo(function GroupHeader({
  row,
  isDark,
  onToggle,
}: {
  row: { directory: string; shortName: string; count: number; collapsed: boolean }
  isDark: boolean
  onToggle: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.groupHeader, isDark && styles.groupHeaderDark]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Ionicons name="folder-outline" size={16} color={isDark ? "#ffffff" : "#0a0a0a"} />
      <Text style={[styles.groupHeaderText, isDark && styles.textDark]} numberOfLines={1}>
        {row.shortName}
      </Text>
      <Text style={[styles.groupHeaderCount, isDark && styles.metaDark]}>{row.count}</Text>
      <Ionicons
        name={row.collapsed ? "chevron-forward" : "chevron-down"}
        size={16}
        color={isDark ? "#666666" : "#999999"}
      />
    </TouchableOpacity>
  )
})

// Get short directory name (last folder or project name)
function getShortPath(
  project: { path?: { cwd?: string; root?: string; absolute?: string }; name?: string } | null | undefined,
): string {
  if (!project) return ""
  if (project.name) return project.name
  if (!project.path?.absolute) return ""
  const parts = project.path.absolute.split("/").filter(Boolean)
  return parts[parts.length - 1] || project.path.absolute
}

export default function SessionsScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const [renaming, setRenaming] = useState<Session | null>(null)
  const [renameText, setRenameText] = useState("")
  const renamingInFlight = useRef(false)
  // Synchronous re-entrancy guard: `isCreating` state lags by a render, so a
  // fast double-tap on the FAB / "Use this folder" would fire two session
  // creates before the disabled state lands. This blocks the second call.
  const creatingInFlight = useRef(false)

  const sessions = useSessions((s) => s.sessions)
  const isLoading = useSessions((s) => s.isLoading)
  const error = useSessions((s) => s.error)
  const loadSessions = useSessions((s) => s.loadSessions)
  const createSession = useSessions((s) => s.createSession)
  const deleteSession = useSessions((s) => s.deleteSession)
  const archiveSession = useSessions((s) => s.archiveSession)
  const unarchiveSession = useSessions((s) => s.unarchiveSession)
  const clearError = useSessions((s) => s.clearError)

  const [filterTab, setFilterTab] = useState<"active" | "archived">("active")
  const [searchQuery, setSearchQuery] = useState("")

  const activeConnection = useConnections((s) => s.activeConnection)
  const client = useConnections((s) => s.client)
  const currentProject = useConnections((s) => s.currentProject)
  const serverHome = useConnections((s) => s.serverHome)
  const refreshProject = useConnections((s) => s.refreshProject)
  const clientForDirectory = useConnections((s) => s.clientForDirectory)
  const switchDirectory = useConnections((s) => s.switchDirectory)
  const addRecentDirectory = useConnections((s) => s.addRecentDirectory)
  const recentDirectories = useConnections((s) => s.recentDirectories)
  const authError = useEvents((s) => s.authError)
  const reconnect = useEvents((s) => s.connect)
  const loadCatalog = useCatalog((s) => s.load)
  const dirSheetRef = useRef<BottomSheet>(null)
  const browserSheetRef = useRef<BottomSheet>(null)
  const newSessionSheetRef = useRef<BottomSheet>(null)
  const [browseStartDir, setBrowseStartDir] = useState<string | null>(null)
  // Shared folder browser is opened either to pick a directory for a new
  // session, or to switch the active connection's directory.
  const [browseMode, setBrowseMode] = useState<"create" | "switch">("create")
  const [refreshing, setRefreshing] = useState(false)
  // Directories collapsed in the grouped session list. Empty by default —
  // all groups start expanded (#67).
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set())

  const toggleGroup = useCallback((directory: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(directory)) next.delete(directory)
      else next.add(directory)
      return next
    })
  }, [])

  const activeCount = useMemo(() => sessions.filter((s) => !s.time?.archived).length, [sessions])
  const archivedCount = useMemo(() => sessions.filter((s) => !!s.time?.archived).length, [sessions])

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return sessions.filter((s) => {
      const matchTab = filterTab === "archived" ? !!s.time?.archived : !s.time?.archived
      if (!matchTab) return false
      if (!q) return true
      const matchTitle = (s.title || "").toLowerCase().includes(q)
      const matchDir = (s.directory || "").toLowerCase().includes(q)
      const matchId = s.id.toLowerCase().includes(q)
      return matchTitle || matchDir || matchId
    })
  }, [sessions, filterTab, searchQuery])

  // Flatten sessions into header+item rows. Skip headers entirely when
  // everything lives in one directory — a lone header adds noise, not clarity.
  const rows = useMemo<ListRow[]>(() => {
    const groups = groupByDirectory(filteredSessions)
    if (groups.length <= 1) {
      return filteredSessions.map((session) => ({ type: "session", session }))
    }
    const out: ListRow[] = []
    for (const group of groups) {
      const collapsed = collapsedDirs.has(group.directory)
      out.push({
        type: "header",
        directory: group.directory,
        shortName: nameOf(group.directory) || group.directory,
        count: group.items.length,
        collapsed,
      })
      if (!collapsed) {
        for (const session of group.items) out.push({ type: "session", session })
      }
    }
    return out
  }, [filteredSessions, collapsedDirs])

  const handleSwitchDirectory = useCallback(
    async (dir?: string) => {
      await switchDirectory(dir)
      loadSessions()
      refreshProject()
      loadCatalog()
    },
    [switchDirectory, loadSessions, refreshProject, loadCatalog],
  )

  useFocusEffect(
    useCallback(() => {
      if (client) {
        loadSessions()
        refreshProject()
      }
    }, [client, loadSessions, refreshProject]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadSessions(), refreshProject()])
    } catch (err) {
      console.error("Refresh failed:", err)
    } finally {
      setRefreshing(false)
    }
  }, [loadSessions, refreshProject])

  const handleRename = useCallback((session: Session) => {
    setRenameText(session.title || "")
    setRenaming(session)
  }, [])

  const submitRename = useCallback(async () => {
    const title = renameText.trim()
    if (!title || !renaming || renamingInFlight.current) return
    const renameClient = renaming.directory ? (clientForDirectory(renaming.directory) ?? client) : client
    if (!renameClient) return
    renamingInFlight.current = true
    try {
      await renameClient.session.update(renaming.id, { title })
      setRenaming(null)
      setRenameText("")
      loadSessions()
    } catch (err) {
      console.error("Rename failed:", err)
      Alert.alert(t("sessionsList.alerts.renameFailedTitle"), t("sessionsList.alerts.renameFailedMessage"))
    } finally {
      renamingInFlight.current = false
    }
  }, [renaming, renameText, client, clientForDirectory, loadSessions, t])

  const handleDelete = useCallback(
    (session: Session) => {
      Alert.alert(
        t("sessionsList.alerts.deleteTitle"),
        t("sessionsList.alerts.deleteMessage", { title: session.title || t("sessionsList.untitledSession") }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteSession(session.id)
              } catch (err) {
                console.error("Delete failed:", err)
                Alert.alert(t("sessionsList.alerts.deleteFailedTitle"), t("sessionsList.alerts.deleteFailedMessage"))
              }
            },
          },
        ],
      )
    },
    [deleteSession, t],
  )

  const handleArchive = useCallback(
    async (session: Session) => {
      await archiveSession(session.id)
    },
    [archiveSession],
  )

  const handleUnarchive = useCallback(
    async (session: Session) => {
      await unarchiveSession(session.id)
    },
    [unarchiveSession],
  )

  const onCreateSession = async () => {
    if (creatingInFlight.current) return
    creatingInFlight.current = true
    try {
      const session = await createSession()
      if (session) {
        router.push({
          pathname: `/session/[id]`,
          params: { id: session.id, ...(session.directory ? { directory: session.directory } : {}) },
        })
      } else {
        Alert.alert(t("common.error"), t("sessionsList.alerts.createFailedMessage"))
      }
    } finally {
      creatingInFlight.current = false
    }
  }

  const onCreateInDirectory = async (dir?: string) => {
    if (!activeConnection) return
    if (creatingInFlight.current) return
    creatingInFlight.current = true
    setIsCreating(true)

    try {
      newSessionSheetRef.current?.close()
      // If a custom directory is specified, use a one-off client for that directory
      // so we don't mutate the connection's default project
      if (dir && dir.trim()) {
        const dirClient = clientForDirectory(dir.trim())
        if (!dirClient) return
        try {
          const session = await dirClient.session.create({})
          addRecentDirectory(dir.trim())
          if (session) {
            router.push({
              pathname: `/session/[id]`,
              params: { id: session.id, ...(session.directory ? { directory: session.directory } : {}) },
            })
          }
        } catch (error) {
          console.error("Failed to create session in directory:", error)
          Alert.alert(t("common.error"), t("sessionsList.alerts.createFailedMessage"))
        }
        return
      }

      const session = await createSession()
      if (session) {
        router.push({
          pathname: `/session/[id]`,
          params: { id: session.id, ...(session.directory ? { directory: session.directory } : {}) },
        })
      } else {
        Alert.alert(t("common.error"), t("sessionsList.alerts.createFailedMessage"))
      }
    } finally {
      creatingInFlight.current = false
      setIsCreating(false)
    }
  }

  const openBrowser = useCallback(
    (startDir: string | null, mode: "create" | "switch") => {
      setBrowseStartDir(startDir || serverHome || null)
      setBrowseMode(mode)
      if (mode === "create") {
        newSessionSheetRef.current?.close()
      }
      browserSheetRef.current?.expand()
    },
    [serverHome],
  )

  const onBrowserSelect = useCallback(
    (directory: string) => {
      browserSheetRef.current?.close()
      if (browseMode === "switch") {
        handleSwitchDirectory(directory)
        dirSheetRef.current?.close()
      } else {
        onCreateInDirectory(directory)
      }
    },
    [browseMode, handleSwitchDirectory, onCreateInDirectory],
  )

  const onBrowserDismiss = useCallback(() => {}, [])

  const shortPath = getShortPath(currentProject)

  const renderRow = useCallback(
    ({ item: row }: { item: ListRow }) =>
      row.type === "header" ? (
        <GroupHeader row={row} isDark={isDark} onToggle={() => toggleGroup(row.directory)} />
      ) : (
        <SessionItem
          session={row.session}
          isDark={isDark}
          onRename={() => handleRename(row.session)}
          onArchive={() => handleArchive(row.session)}
          onUnarchive={() => handleUnarchive(row.session)}
          onDelete={() => handleDelete(row.session)}
        />
      ),
    [isDark, toggleGroup, handleRename, handleArchive, handleUnarchive, handleDelete],
  )

  const onFabPress = () => {
    try {
      Vibration.vibrate(8)
    } catch {}
    newSessionSheetRef.current?.expand()
  }

  const onFabLongPress = () => {
    // Long press: instant create in current project directory
    onCreateSession()
  }

  if (!activeConnection) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.containerDark]}>
        <OpenCodeAsciiBanner isDark={isDark} showMobileBadge={true} />
        <Text style={[styles.emptyTitle, isDark && styles.textDark]}>{t("sessionsList.empty.noConnectionTitle")}</Text>
        <Text style={[styles.emptySubtitle, isDark && styles.metaDark]}>
          {t("sessionsList.empty.noConnectionSubtitle")}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, isDark && styles.addButtonDark]}
          onPress={() => router.push("/connection/add")}
          testID="add-connection-button"
        >
          <Text style={[styles.addButtonText, isDark && styles.addButtonTextDark]}>
            {t("sessionsList.empty.addConnectionButton")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.setupGuideLink}
          onPress={() => Linking.openURL(SETUP_GUIDE_URL)}
          testID="setup-guide-link"
        >
          <Text style={styles.setupGuideLinkText}>{t("sessionsList.empty.setupGuideLink")}</Text>
        </TouchableOpacity>
        {/* No-server activation path (retention): a fully offline scripted
            demo, isolated from real connect/session state — see app/demo.tsx. */}
        <TouchableOpacity
          style={[styles.tryDemoButton, isDark && styles.tryDemoButtonDark]}
          onPress={() => router.push("/demo")}
          testID="try-demo-button"
        >
          <Ionicons name="play-circle-outline" size={16} color={isDark ? "#ffffff" : "#0a0a0a"} />
          <Text style={[styles.tryDemoButtonText, isDark && styles.tryDemoButtonTextDark]}>
            {t("sessionsList.empty.tryDemoButton")}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  // The SSE loop stopped retrying because the server rejected our
  // credentials (401/403) — no amount of pull-to-refresh fixes that, so
  // point the user straight at the fix instead of a spinner that never
  // resolves (issue #76).
  if (authError) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.containerDark]}>
        <Ionicons name="lock-closed-outline" size={64} color={isDark ? "#444444" : "#cccccc"} />
        <Text style={[styles.emptyTitle, isDark && styles.textDark]}>{t("sessionsList.empty.authFailedTitle")}</Text>
        <Text style={[styles.emptySubtitle, isDark && styles.metaDark]}>
          {t("sessionsList.empty.authFailedSubtitle", { name: activeConnection.name })}
        </Text>
        <View style={styles.authErrorButtonRow}>
          <TouchableOpacity
            style={[styles.addButton, isDark && styles.addButtonDark]}
            onPress={() => router.push(`/connection/${activeConnection.id}`)}
            testID="fix-connection-button"
          >
            <Text style={[styles.addButtonText, isDark && styles.addButtonTextDark]}>
              {t("sessionsList.empty.checkCredentialsButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, isDark && styles.addButtonDark]}
            onPress={() => {
              // authError is cleared inside connect() itself once the retry
              // attempt starts (see src/stores/events.ts), so a manual
              // set() here isn't needed — just kick the SSE state machine.
              reconnect()
            }}
            testID="retry-connection-button"
          >
            <Text style={[styles.addButtonText, isDark && styles.addButtonTextDark]}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Connection indicator — tap to switch project */}
      <TouchableOpacity
        style={[styles.connectionBar, isDark && styles.connectionBarDark]}
        onPress={() => dirSheetRef.current?.expand()}
        onLongPress={() => router.push("/(tabs)/connections")}
        activeOpacity={0.7}
        testID="connection-status-bar"
      >
        <View style={styles.connectionInfo}>
          <View style={[styles.connectionDot, { backgroundColor: "#22c55e" }]} testID="connection-status-dot" />
          <Text style={[styles.connectionName, isDark && styles.textDark]} numberOfLines={1}>
            {activeConnection.name}
          </Text>
          {shortPath && (
            <>
              <Ionicons name="folder" size={14} color={isDark ? "#888888" : "#666666"} />
              <Text style={[styles.projectPath, isDark && styles.metaDark]} numberOfLines={1}>
                {shortPath}
              </Text>
            </>
          )}
        </View>
        <Ionicons name="swap-horizontal-outline" size={16} color={isDark ? "#666666" : "#999999"} />
      </TouchableOpacity>

      {error && (
        <TouchableOpacity style={styles.errorBar} onPress={clearError}>
          <Text style={styles.errorText} numberOfLines={3}>
            {error}
          </Text>
          <Ionicons name="close" size={20} color="#dc2626" style={styles.errorClose} />
        </TouchableOpacity>
      )}

      <UpdateBanner isDark={isDark} />

      {/* Search bar */}
      <View style={[styles.searchBarContainer, isDark && styles.searchBarContainerDark]}>
        <Ionicons name="search-outline" size={15} color={isDark ? "#888888" : "#666666"} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          placeholder={t("sessionsList.searchPlaceholder")}
          placeholderTextColor={isDark ? "#666666" : "#999999"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={isDark ? "#666666" : "#999999"} />
          </TouchableOpacity>
        )}
      </View>

      {/* Active / Archived Tab Pill Selector */}
      <View style={[styles.tabFilterBar, isDark && styles.tabFilterBarDark]}>
        <TouchableOpacity
          style={[
            styles.tabFilterBtn,
            filterTab === "active" && (isDark ? styles.tabFilterBtnActiveDark : styles.tabFilterBtnActive),
          ]}
          onPress={() => setFilterTab("active")}
        >
          <Text
            style={[
              styles.tabFilterText,
              filterTab === "active" && (isDark ? styles.tabFilterTextActiveDark : styles.tabFilterTextActive),
            ]}
          >
            {t("sessionsList.tabs.active", { count: activeCount })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabFilterBtn,
            filterTab === "archived" && (isDark ? styles.tabFilterBtnActiveDark : styles.tabFilterBtnActive),
          ]}
          onPress={() => setFilterTab("archived")}
        >
          <Text
            style={[
              styles.tabFilterText,
              filterTab === "archived" && (isDark ? styles.tabFilterTextActiveDark : styles.tabFilterTextActive),
            ]}
          >
            {t("sessionsList.tabs.archived", { count: archivedCount })}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => (row.type === "header" ? `dir:${row.directory}` : row.session.id)}
        renderItem={renderRow}
        maxToRenderPerBatch={10}
        windowSize={7}
        initialNumToRender={12}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#ffffff" : "#0a0a0a"} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0a0a0a"} />
            </View>
          ) : (
            <View style={styles.emptyList}>
              <Text style={[styles.emptyListText, isDark && styles.metaDark]}>{t("sessionsList.empty.noSessions")}</Text>
            </View>
          )
        }
        contentContainerStyle={sessions.length === 0 ? styles.emptyContent : undefined}
      />

      {/* FAB to create new session */}
      <TouchableOpacity
        style={[styles.fab, isDark && styles.fabDark]}
        onPress={onFabPress}
        onLongPress={onFabLongPress}
        delayLongPress={500}
        testID="new-session-fab"
      >
        <Ionicons name="add" size={28} color={isDark ? "#0a0a0a" : "#ffffff"} />
      </TouchableOpacity>

      {/* Rename modal */}
      <Modal visible={!!renaming} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { justifyContent: "center" }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setRenaming(null)} />
          <View style={[styles.renameCard, isDark && styles.renameCardDark]}>
            <Text style={[styles.renameTitle, isDark && styles.textDark]}>{t("sessionsList.renameModal.title")}</Text>
            <TextInput
              style={[styles.modalInput, isDark && styles.modalInputDark]}
              value={renameText}
              onChangeText={setRenameText}
              onSubmitEditing={submitRename}
              returnKeyType="done"
              autoFocus
              selectTextOnFocus
              autoCapitalize="sentences"
              autoCorrect={false}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity style={[styles.renameBtn, styles.renameBtnCancel]} onPress={() => setRenaming(null)}>
                <Text style={styles.renameBtnCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameBtn, styles.modalButtonPrimary, isDark && styles.modalButtonPrimaryDark]}
                onPress={submitRename}
                disabled={!renameText.trim()}
              >
                <Text style={[styles.modalButtonTextPrimary, isDark && styles.modalButtonTextPrimaryDark]}>
                  {t("common.save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setRenaming(null)} />
        </KeyboardAvoidingView>
      </Modal>

      {/* New session bottom sheet */}
      <NewSessionSheet
        sheetRef={newSessionSheetRef}
        currentDirectory={currentProject?.path?.absolute || activeConnection?.directory}
        recentDirectories={recentDirectories}
        serverHome={serverHome}
        isDark={isDark}
        isCreating={isCreating}
        onCreate={(dir) => onCreateInDirectory(dir)}
        onBrowse={() =>
          openBrowser(activeConnection?.directory || currentProject?.path?.absolute || null, "create")
        }
      />

      {/* Directory switcher bottom sheet */}
      <DirectorySwitcher
        sheetRef={dirSheetRef}
        current={activeConnection?.directory}
        recents={recentDirectories}
        serverHome={serverHome}
        isDark={isDark}
        onSwitch={handleSwitchDirectory}
        onBrowse={() =>
          openBrowser(activeConnection?.directory || currentProject?.path?.absolute || null, "switch")
        }
      />

      {/* Browsable folder picker — used for both "new session in..." and
          "switch project directory" flows (see browseMode). */}
      <DirectoryBrowserSheet
        sheetRef={browserSheetRef}
        startDirectory={browseStartDir}
        clientForDirectory={clientForDirectory}
        isDark={isDark}
        onSelect={onBrowserSelect}
        onDismiss={onBrowserDismiss}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#0a0a0a",
  },
  connectionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  connectionBarDark: {
    borderBottomColor: "#1a1a1a",
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  connectionUrl: {
    fontSize: 12,
    color: "#666666",
  },
  projectPath: {
    fontSize: 13,
    color: "#666666",
    flex: 1,
  },
  errorBar: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  searchBarContainerDark: {
    backgroundColor: "#161616",
    borderColor: "#262626",
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0a0a0a",
    paddingVertical: 0,
  },
  searchInputDark: {
    color: "#ffffff",
  },
  tabFilterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tabFilterBarDark: {
    backgroundColor: "#0a0a0a",
    borderBottomColor: "#1f1f1f",
  },
  tabFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
  },
  tabFilterBtnDark: {
    backgroundColor: "#1c1c1c",
  },
  tabFilterBtnActive: {
    backgroundColor: "#0a0a0a",
  },
  tabFilterBtnActiveDark: {
    backgroundColor: "#ffffff",
  },
  tabFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666666",
  },
  tabFilterTextActive: {
    color: "#ffffff",
  },
  tabFilterTextActiveDark: {
    color: "#0a0a0a",
  },
  errorText: {
    flex: 1,
    color: "#dc2626",
    fontSize: 14,
  },
  errorClose: {
    paddingTop: 2,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  groupHeaderDark: {
    backgroundColor: "#151515",
    borderBottomColor: "#1a1a1a",
  },
  groupHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  groupHeaderCount: {
    fontSize: 12,
    color: "#666666",
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  sessionItemDark: {
    borderBottomColor: "#1a1a1a",
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0a0a0a",
    marginBottom: 2,
  },
  textDark: {
    color: "#ffffff",
  },
  sessionMeta: {
    fontSize: 12,
    color: "#666666",
  },
  metaDark: {
    color: "#888888",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    color: "#0a0a0a",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 8,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  authErrorButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  addButtonDark: {
    backgroundColor: "#ffffff",
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  addButtonTextDark: {
    color: "#0a0a0a",
  },
  setupGuideLink: {
    marginTop: 16,
  },
  setupGuideLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366f1",
  },
  tryDemoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0a0a0a",
  },
  tryDemoButtonDark: {
    borderColor: "#ffffff",
  },
  tryDemoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  tryDemoButtonTextDark: {
    color: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyListText: {
    fontSize: 16,
    color: "#666666",
  },
  emptyContent: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabDark: {
    backgroundColor: "#ffffff",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalContentDark: {
    backgroundColor: "#1a1a1a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  modalBody: {
    marginBottom: 24,
  },
  modalScrollBody: {
    maxHeight: 420,
    marginBottom: 16,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    marginBottom: 6,
  },
  projectRowDark: {
    backgroundColor: "#2a2a2a",
  },
  projectRowActive: {
    backgroundColor: "#f0f0f0",
  },
  projectRowContent: {
    flex: 1,
  },
  projectRowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  projectRowNameActive: {
    color: "#0a0a0a",
  },
  projectRowPath: {
    fontSize: 11,
    color: "#999999",
    marginTop: 1,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalDirBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
  },
  modalDirBoxDark: {
    backgroundColor: "#2a2a2a",
  },
  modalDirText: {
    fontSize: 15,
    color: "#0a0a0a",
    flex: 1,
  },
  modalInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0a0a0a",
  },
  modalInputDark: {
    backgroundColor: "#2a2a2a",
    color: "#ffffff",
  },
  pathChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  pathChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
  },
  pathChipDark: {
    backgroundColor: "#222222",
  },
  pathChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  pathChipTextDark: {
    color: "#ffffff",
  },
  modalHint: {
    fontSize: 13,
    color: "#666666",
    marginTop: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  modalButtonSecondary: {
    backgroundColor: "#f5f5f5",
  },
  modalButtonSecondaryDark: {
    backgroundColor: "#2a2a2a",
  },
  modalButtonPrimary: {
    backgroundColor: "#0a0a0a",
  },
  modalButtonPrimaryDark: {
    backgroundColor: "#ffffff",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  modalButtonTextPrimary: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  modalButtonTextPrimaryDark: {
    color: "#0a0a0a",
  },
  modalButtonFull: {
    flex: 0,
    width: "100%",
  },
  // Rename modal
  renameCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 32,
    gap: 16,
  },
  renameCardDark: {
    backgroundColor: "#1a1a1a",
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  renameBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  renameBtnCancel: {
    backgroundColor: "transparent",
  },
  renameBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888888",
  },
})

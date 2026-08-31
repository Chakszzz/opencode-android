import { useState, useMemo, useCallback, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet"
import { useSessions } from "../../stores/sessions"
import { useTranslation } from "react-i18next"
import type { Session } from "../../lib/sdk"

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
  currentSessionID?: string
  currentDirectory?: string
  onSelectSession: (session: Session) => void
  onCreateNewSession: () => void
}

export const SessionsSheet = memo(function SessionsSheet({
  isDark,
  sheetRef,
  currentSessionID,
  currentDirectory,
  onSelectSession,
  onCreateNewSession,
}: Props) {
  const { t } = useTranslation()
  const sessions = useSessions((s) => s.sessions) || []
  const isLoading = useSessions((s) => s.isLoading)
  const loadSessions = useSessions((s) => s.loadSessions)

  const [search, setSearch] = useState("")
  const [filterScope, setFilterScope] = useState<"project" | "all">(
    currentDirectory ? "project" : "all",
  )

  const filteredSessions = useMemo(() => {
    let list = sessions.filter((s) => !s.time?.archived && !s.parentID)

    if (filterScope === "project" && currentDirectory) {
      list = list.filter((s) => s.directory === currentDirectory)
    }

    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (s) =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q) ||
        (s.directory && s.directory.toLowerCase().includes(q)),
    )
  }, [sessions, filterScope, currentDirectory, search])

  const handleSelect = useCallback(
    (session: Session) => {
      sheetRef.current?.close()
      onSelectSession(session)
    },
    [onSelectSession, sheetRef],
  )

  const handleNew = useCallback(() => {
    sheetRef.current?.close()
    onCreateNewSession()
  }, [onCreateNewSession, sheetRef])

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ""
    const diffMs = Date.now() - timestamp
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["60%", "90%"]}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#666666" : "#cccccc" }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (idx !== -1) {
          loadSessions()
        }
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={isDark ? "#ffffff" : "#0a0a0a"}
            />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>Switch Session</Text>
            {sessions.length > 0 && (
              <View style={[s.countBadge, isDark && s.countBadgeDark]}>
                <Text style={[s.countText, isDark && s.textWhite]}>{sessions.length}</Text>
              </View>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={[s.newBtn, isDark && s.newBtnDark]}
              onPress={handleNew}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={isDark ? "#0a0a0a" : "#ffffff"} />
              <Text style={[s.newBtnText, isDark && s.textBlack]}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.iconBtn}>
              <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[s.searchBox, isDark && s.searchBoxDark]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={isDark ? "#888888" : "#666666"}
            style={s.searchIcon}
          />
          <BottomSheetTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search sessions by title or directory..."
            placeholderTextColor={isDark ? "#666666" : "#999999"}
            style={[s.searchInput, isDark && s.searchInputDark]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={s.clearBtn}>
              <Ionicons name="close-circle" size={16} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>
          )}
        </View>

        {/* Scope filter pills if inside a specific directory */}
        {currentDirectory && (
          <View style={s.filterRow}>
            <TouchableOpacity
              style={[
                s.filterPill,
                isDark && s.filterPillDark,
                filterScope === "project" && (isDark ? s.filterPillActiveDark : s.filterPillActive),
              ]}
              onPress={() => setFilterScope("project")}
            >
              <Text
                style={[
                  s.filterText,
                  isDark && s.metaDark,
                  filterScope === "project" && (isDark ? s.filterTextActiveDark : s.filterTextActive),
                ]}
              >
                Current Project
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.filterPill,
                isDark && s.filterPillDark,
                filterScope === "all" && (isDark ? s.filterPillActiveDark : s.filterPillActive),
              ]}
              onPress={() => setFilterScope("all")}
            >
              <Text
                style={[
                  s.filterText,
                  isDark && s.metaDark,
                  filterScope === "all" && (isDark ? s.filterTextActiveDark : s.filterTextActive),
                ]}
              >
                All Projects
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {isLoading && sessions.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.loadingText, isDark && s.metaDark]}>Loading sessions...</Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={40} color="#888888" />
            <Text style={[s.emptyTitle, isDark && s.textWhite]}>No Sessions Found</Text>
            <Text style={[s.emptyDesc, isDark && s.metaDark]}>
              {search
                ? `No sessions match "${search}"`
                : "No active sessions in this workspace."}
            </Text>
            <TouchableOpacity
              style={[s.emptyNewBtn, isDark && s.emptyNewBtnDark]}
              onPress={handleNew}
            >
              <Ionicons name="add" size={16} color={isDark ? "#0a0a0a" : "#ffffff"} />
              <Text style={[s.emptyNewText, isDark && s.textBlack]}>Start New Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <BottomSheetFlatList<Session>
            data={filteredSessions}
            keyExtractor={(item: Session) => item.id}
            contentContainerStyle={s.list}
            renderItem={({ item }: { item: Session }) => {
              const isCurrent = item.id === currentSessionID
              const timeLabel = formatTime(item.time?.updated || item.time?.created)
              const dirLabel = item.directory
                ? item.directory.split("/").filter(Boolean).pop() || item.directory
                : null

              return (
                <TouchableOpacity
                  style={[
                    s.sessionCard,
                    isDark && s.sessionCardDark,
                    isCurrent && (isDark ? s.sessionCardActiveDark : s.sessionCardActive),
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={s.sessionMain}>
                    <View style={s.sessionHeaderRow}>
                      <Text
                        style={[
                          s.sessionTitle,
                          isDark && s.textWhite,
                          isCurrent && s.sessionTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title || "Untitled Session"}
                      </Text>
                      {isCurrent && (
                        <View style={s.activeBadge}>
                          <Text style={s.activeText}>Current</Text>
                        </View>
                      )}
                    </View>

                    <View style={s.metaRow}>
                      {dirLabel && (
                        <View style={[s.dirBadge, isDark && s.dirBadgeDark]}>
                          <Ionicons
                            name="folder-outline"
                            size={11}
                            color={isDark ? "#888888" : "#666666"}
                          />
                          <Text style={[s.dirText, isDark && s.metaDark]} numberOfLines={1}>
                            {dirLabel}
                          </Text>
                        </View>
                      )}
                      {timeLabel ? (
                        <Text style={[s.timeText, isDark && s.metaDark]}>{timeLabel}</Text>
                      ) : null}
                    </View>
                  </View>

                  <Ionicons
                    name={isCurrent ? "checkmark-circle" : "chevron-forward"}
                    size={18}
                    color={
                      isCurrent
                        ? isDark
                          ? "#ffffff"
                          : "#0a0a0a"
                        : isDark
                        ? "#444444"
                        : "#cccccc"
                    }
                  />
                </TouchableOpacity>
              )
            }}
          />
        )}
      </View>
    </BottomSheet>
  )
})

const s = StyleSheet.create({
  sheet: { backgroundColor: "#ffffff" },
  sheetDark: { backgroundColor: "#141414" },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    marginBottom: 8,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#0a0a0a" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  newBtnDark: { backgroundColor: "#ffffff" },
  newBtnText: { fontSize: 12, fontWeight: "600", color: "#ffffff" },
  textBlack: { color: "#0a0a0a" },
  iconBtn: { padding: 4 },
  countBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeDark: { backgroundColor: "#222222" },
  countText: { fontSize: 11, fontWeight: "600", color: "#666666" },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  searchBoxDark: { backgroundColor: "#1f1f1f", borderColor: "#2e2e2e" },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0a0a0a",
    paddingVertical: 0,
    height: "100%",
  },
  searchInputDark: { color: "#ffffff" },
  clearBtn: { padding: 4 },

  // Filter
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
  },
  filterPillDark: { backgroundColor: "#222222" },
  filterPillActive: { backgroundColor: "#0a0a0a" },
  filterPillActiveDark: { backgroundColor: "#ffffff" },
  filterText: { fontSize: 11, fontWeight: "500", color: "#666666" },
  filterTextActive: { color: "#ffffff" },
  filterTextActiveDark: { color: "#0a0a0a" },

  // List
  list: { paddingBottom: 32, gap: 6 },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sessionCardDark: { backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" },
  sessionCardActive: { borderColor: "#0a0a0a", backgroundColor: "#f3f4f6" },
  sessionCardActiveDark: { borderColor: "#ffffff", backgroundColor: "#222222" },
  sessionMain: { flex: 1, marginRight: 10 },
  sessionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sessionTitle: { fontSize: 14, fontWeight: "600", color: "#0a0a0a", flexShrink: 1 },
  sessionTitleActive: { fontWeight: "700" },
  activeBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeText: { fontSize: 10, fontWeight: "600", color: "#0a0a0a" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dirBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 160,
  },
  dirBadgeDark: { backgroundColor: "#262626" },
  dirText: { fontSize: 10, color: "#666666" },
  timeText: { fontSize: 11, color: "#888888" },

  // Empty / loading
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 13, color: "#666666" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  emptyDesc: { fontSize: 12, color: "#666666", textAlign: "center", maxWidth: 260 },
  emptyNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyNewBtnDark: { backgroundColor: "#ffffff" },
  emptyNewText: { fontSize: 13, fontWeight: "600", color: "#ffffff" },

  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

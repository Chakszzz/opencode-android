import { useState, useEffect, useCallback, useRef, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { useConnections } from "../../stores/connections"
import { DiffView } from "./DiffView"
import type { DiffLine } from "./diff-compute"
import type { Client } from "../../lib/sdk"

export interface FileDiff {
  file?: string
  path?: string
  before?: string
  after?: string
  patch?: string
  additions?: number
  deletions?: number
  status?: string
}

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
  sessionClient?: Client | null
  sessionID?: string
  onQuoteLine?: (file: string, lineText: string) => void
}

export const ReviewDiffSheet = memo(function ReviewDiffSheet({
  isDark,
  sheetRef,
  sessionID,
  sessionClient: propClient,
  onQuoteLine,
}: Props) {
  const storeClient = useConnections((s) => s.client)
  const sessionClient = propClient || storeClient
  const [diffs, setDiffs] = useState<FileDiff[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const prevIndex = useRef(-1)

  const loadDiffs = useCallback(async () => {
    if (!sessionClient || !sessionID) return
    setLoading(true)
    try {
      const res = await sessionClient.session.diff(sessionID)
      if (Array.isArray(res)) {
        setDiffs(res as FileDiff[])
        // Auto expand all diffs by default
        const initExpanded: Record<number, boolean> = {}
        res.forEach((_, idx) => {
          initExpanded[idx] = true
        })
        setExpanded(initExpanded)
      } else {
        setDiffs([])
      }
    } catch (err) {
      console.log("[ReviewDiffSheet] Failed to load diffs:", err)
      setDiffs([])
    } finally {
      setLoading(false)
    }
  }, [sessionClient, sessionID])

  useEffect(() => {
    loadDiffs()
  }, [loadDiffs])

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleLinePress = useCallback(
    (file: string, line: DiffLine) => {
      Alert.alert(file, `"${line.text}"`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy Line",
          onPress: async () => {
            await Clipboard.setStringAsync(line.text)
          },
        },
        ...(onQuoteLine
          ? [
              {
                text: "Quote to Chat",
                onPress: () => {
                  onQuoteLine(file, line.text)
                  sheetRef.current?.close()
                },
              },
            ]
          : []),
      ])
    },
    [onQuoteLine, sheetRef],
  )

  const totalAdditions = diffs.reduce((acc, d) => acc + (d.additions || 0), 0)
  const totalDeletions = diffs.reduce((acc, d) => acc + (d.deletions || 0), 0)

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["70%", "95%"]}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#666666" : "#cccccc" }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (prevIndex.current === -1 && idx !== -1) {
          loadDiffs()
        }
        prevIndex.current = idx
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons
              name="git-pull-request-outline"
              size={20}
              color={isDark ? "#ffffff" : "#0a0a0a"}
            />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>Review Changes</Text>
            {diffs.length > 0 && (
              <View style={s.statsRow}>
                {totalAdditions > 0 && (
                  <Text style={s.addBadge}>+{totalAdditions}</Text>
                )}
                {totalDeletions > 0 && (
                  <Text style={s.delBadge}>-{totalDeletions}</Text>
                )}
              </View>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={loadDiffs} style={s.iconBtn} disabled={loading}>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={isDark ? "#888888" : "#666666"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.iconBtn}>
              <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {loading && diffs.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.loadingText, isDark && s.metaDark]}>Checking session diffs...</Text>
          </View>
        ) : diffs.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#22c55e" />
            <Text style={[s.emptyTitle, isDark && s.textWhite]}>Working Tree Clean</Text>
            <Text style={[s.emptyDesc, isDark && s.metaDark]}>
              No uncommitted or modified files in this session.
            </Text>
          </View>
        ) : (
          <BottomSheetScrollView contentContainerStyle={s.list}>
            {diffs.map((d, idx) => {
              const fileName = d.file || d.path || `File #${idx + 1}`
              const isItemExpanded = !!expanded[idx]

              return (
                <View key={idx} style={[s.fileCard, isDark && s.fileCardDark]}>
                  <TouchableOpacity
                    style={s.fileHeader}
                    onPress={() => toggleExpand(idx)}
                    activeOpacity={0.7}
                  >
                    <View style={s.fileTitleRow}>
                      <Ionicons
                        name={isItemExpanded ? "chevron-down" : "chevron-forward"}
                        size={16}
                        color={isDark ? "#888888" : "#666666"}
                      />
                      <Text style={[s.fileName, isDark && s.textWhite]} numberOfLines={1}>
                        {fileName}
                      </Text>
                    </View>
                    <View style={s.fileStats}>
                      {d.additions !== undefined && d.additions > 0 && (
                        <Text style={s.fileAdd}>+{d.additions}</Text>
                      )}
                      {d.deletions !== undefined && d.deletions > 0 && (
                        <Text style={s.fileDel}>-{d.deletions}</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isItemExpanded && (
                    <View style={s.diffBody}>
                      <DiffView
                        before={d.before || ""}
                        after={d.after || d.patch || ""}
                        isDark={isDark}
                        onLinePress={(line) => handleLinePress(fileName, line)}
                      />
                    </View>
                  )}
                </View>
              )
            })}
          </BottomSheetScrollView>
        )}
      </View>
    </BottomSheet>
  )
})

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

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
  statsRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  addBadge: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  delBadge: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { padding: 6 },
  list: { paddingBottom: 30 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { fontSize: 13, color: "#888888", marginTop: 10 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#0a0a0a" },
  emptyDesc: { fontSize: 13, color: "#888888", textAlign: "center", paddingHorizontal: 24 },
  fileCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
    overflow: "hidden",
  },
  fileCardDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2e2e2e",
  },
  fileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
  },
  fileTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 },
  fileName: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  fileStats: { flexDirection: "row", gap: 6, alignItems: "center" },
  fileAdd: { fontSize: 11, fontWeight: "700", color: "#16a34a", fontFamily: mono },
  fileDel: { fontSize: 11, fontWeight: "700", color: "#dc2626", fontFamily: mono },
  diffBody: { padding: 8 },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

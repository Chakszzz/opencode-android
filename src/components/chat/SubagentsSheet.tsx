import { useRef, memo } from "react"
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
} from "@gorhom/bottom-sheet"
import { type Session } from "../../lib/sdk"

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
  subagents: Session[]
  loading: boolean
  onSelectSubagent: (subagent: Session) => void
  onRefresh: () => void
}

export const SubagentsSheet = memo(function SubagentsSheet({
  isDark,
  sheetRef,
  subagents,
  loading,
  onSelectSubagent,
  onRefresh,
}: Props) {
  const prevIndex = useRef(-1)

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["50%", "80%"]}
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
          onRefresh()
        }
        prevIndex.current = idx
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons
              name="git-branch-outline"
              size={20}
              color={isDark ? "#ffffff" : "#0a0a0a"}
            />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>Child Subagents</Text>
            {subagents.length > 0 && (
              <View style={[s.countBadge, isDark && s.countBadgeDark]}>
                <Text style={[s.countText, isDark && s.textWhite]}>{subagents.length}</Text>
              </View>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={onRefresh} style={s.iconBtn} disabled={loading}>
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
        {loading && subagents.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.loadingText, isDark && s.metaDark]}>Loading subagents...</Text>
          </View>
        ) : (
          <BottomSheetFlatList<Session>
            data={subagents}
            keyExtractor={(item: Session) => item.id}
            contentContainerStyle={s.list}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Ionicons
                  name="git-network-outline"
                  size={36}
                  color={isDark ? "#444444" : "#cccccc"}
                />
                <Text style={[s.emptyTitle, isDark && s.textWhite]}>No Subagents Spawned</Text>
                <Text style={[s.emptyDesc, isDark && s.metaDark]}>
                  Subagents will appear here when the AI spawns delegate tasks in the background.
                </Text>
              </View>
            }
            renderItem={({ item }: { item: Session }) => {
              const updatedTime = item.time?.updated
                ? new Date(item.time.updated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"

              return (
                <TouchableOpacity
                  style={[s.card, isDark && s.cardDark]}
                  onPress={() => {
                    sheetRef.current?.close()
                    onSelectSubagent(item)
                  }}
                  activeOpacity={0.7}
                >
                  <View style={s.cardLeft}>
                    <View style={[s.iconBox, isDark && s.iconBoxDark]}>
                      <Ionicons
                        name="hardware-chip-outline"
                        size={16}
                        color={isDark ? "#ffffff" : "#0a0a0a"}
                      />
                    </View>
                    <View style={s.textCol}>
                      <Text style={[s.title, isDark && s.textWhite]} numberOfLines={1}>
                        {item.title || "Untitled Subagent"}
                      </Text>
                      <Text style={[s.meta, isDark && s.metaDark]} numberOfLines={1}>
                        Updated {updatedTime} • {item.directory ? item.directory.split("/").pop() : "root"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isDark ? "#666666" : "#aaaaaa"}
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
  countBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeDark: { backgroundColor: "#262626" },
  countText: { fontSize: 11, fontWeight: "700", color: "#0a0a0a" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { padding: 6 },
  list: { paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { fontSize: 13, color: "#888888", marginTop: 10 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  emptyDesc: { fontSize: 12, color: "#888888", textAlign: "center", paddingHorizontal: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 8,
  },
  cardDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2e2e2e",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 8 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxDark: { backgroundColor: "#2a2a2a" },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", color: "#0a0a0a" },
  meta: { fontSize: 12, color: "#888888", marginTop: 2, fontFamily: mono },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

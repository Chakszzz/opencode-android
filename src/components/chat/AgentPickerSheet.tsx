import { useState, useMemo, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet"
import { type Agent } from "../../lib/sdk"

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
  agents: Agent[]
  currentAgent: string
  onSelectAgent: (agentName: string) => void
}

export const AgentPickerSheet = memo(function AgentPickerSheet({
  isDark,
  sheetRef,
  agents,
  currentAgent,
  onSelectAgent,
}: Props) {
  const [search, setSearch] = useState("")

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents
    const q = search.toLowerCase()
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.mode?.toLowerCase().includes(q) ||
        a.model?.modelID?.toLowerCase().includes(q),
    )
  }, [agents, search])

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["55%", "85%"]}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#666666" : "#cccccc" }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons
              name="people-outline"
              size={20}
              color={isDark ? "#ffffff" : "#0a0a0a"}
            />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>Select Agent</Text>
            {agents.length > 0 && (
              <View style={[s.countBadge, isDark && s.countBadgeDark]}>
                <Text style={[s.countText, isDark && s.textWhite]}>{agents.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.iconBtn}>
            <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>
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
            placeholder="Search agents..."
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

        {/* List */}
        <BottomSheetFlatList<Agent>
          data={filteredAgents}
          keyExtractor={(item: Agent) => item.name}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons
                name="person-outline"
                size={36}
                color={isDark ? "#444444" : "#cccccc"}
              />
              <Text style={[s.emptyTitle, isDark && s.textWhite]}>No Agents Found</Text>
              <Text style={[s.emptyDesc, isDark && s.metaDark]}>
                {search ? "No agents match your search filter." : "No agents available on this server."}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Agent }) => {
            const isSelected = item.name === currentAgent
            const agentDotColor = item.color || (isDark ? "#ffffff" : "#0a0a0a")

            return (
              <TouchableOpacity
                style={[
                  s.agentCard,
                  isDark && s.agentCardDark,
                  isSelected && (isDark ? s.agentCardSelectedDark : s.agentCardSelected),
                ]}
                onPress={() => {
                  onSelectAgent(item.name)
                  sheetRef.current?.close()
                }}
                activeOpacity={0.7}
              >
                <View style={s.agentCardHeader}>
                  <View style={s.nameRow}>
                    <View style={[s.dot, { backgroundColor: agentDotColor }]} />
                    <Text style={[s.agentName, isDark && s.textWhite]}>{item.name}</Text>
                    {item.mode && (
                      <View style={[s.modeBadge, isDark && s.modeBadgeDark]}>
                        <Text style={[s.modeText, isDark && s.modeTextDark]}>{item.mode}</Text>
                      </View>
                    )}
                    {item.native && (
                      <View style={[s.nativeBadge, isDark && s.nativeBadgeDark]}>
                        <Text style={[s.nativeText, isDark && s.textWhite]}>native</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={isDark ? "#ffffff" : "#0a0a0a"}
                    />
                  )}
                </View>

                {item.description ? (
                  <Text style={[s.agentDesc, isDark && s.metaDark]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {item.model?.modelID ? (
                  <View style={s.modelRow}>
                    <Ionicons
                      name="hardware-chip-outline"
                      size={12}
                      color={isDark ? "#888888" : "#666666"}
                    />
                    <Text style={[s.modelText, isDark && s.metaDark]}>
                      {item.model.providerID ? `${item.model.providerID}/` : ""}
                      {item.model.modelID}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )
          }}
        />
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
  iconBtn: { padding: 6 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchBoxDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2e2e2e",
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0a0a0a",
  },
  searchInputDark: { color: "#ffffff" },
  clearBtn: { padding: 4 },
  list: { paddingBottom: 30 },
  agentCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 8,
  },
  agentCardDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2e2e2e",
  },
  agentCardSelected: {
    borderColor: "#0a0a0a",
    backgroundColor: "#f0f0f0",
  },
  agentCardSelectedDark: {
    borderColor: "#ffffff",
    backgroundColor: "#222222",
  },
  agentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  agentName: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  modeBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modeBadgeDark: { backgroundColor: "#2e2e2e" },
  modeText: { fontSize: 10, fontWeight: "600", color: "#4b5563" },
  modeTextDark: { color: "#9ca3af" },
  nativeBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nativeBadgeDark: { backgroundColor: "#1e3a8a" },
  nativeText: { fontSize: 10, fontWeight: "600", color: "#1e40af" },
  agentDesc: { fontSize: 12, color: "#666666", marginTop: 4 },
  modelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  modelText: { fontSize: 11, color: "#888888", fontFamily: mono },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  emptyDesc: { fontSize: 12, color: "#888888", textAlign: "center", paddingHorizontal: 20 },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

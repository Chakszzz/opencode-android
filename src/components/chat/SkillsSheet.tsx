import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react"
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
  BottomSheetTextInput,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet"
import { useConnections } from "../../stores/connections"

export interface Skill {
  name: string
  description?: string
  location?: string
}

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
  onSelectSkill?: (skill: Skill) => void
}

export const SkillsSheet = memo(function SkillsSheet({ isDark, sheetRef, onSelectSkill }: Props) {
  const client = useConnections((s) => s.client)
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const prevIndex = useRef(-1)

  const loadSkills = useCallback(async () => {
    if (!client) return
    setLoading(true)
    try {
      const res = await client.skills()
      const list: Skill[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.skills)
        ? (res as any).skills
        : []
      setSkills(list)
    } catch (err) {
      console.log("[SkillsSheet] Failed to load skills:", err)
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return skills
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    )
  }, [skills, search])

  const handleSelect = (skill: Skill) => {
    sheetRef.current?.close()
    if (onSelectSkill) {
      onSelectSkill(skill)
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["60%", "85%"]}
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
        if (prevIndex.current === -1 && idx !== -1) {
          loadSkills()
        }
        prevIndex.current = idx
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons name="library-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>Available Skills</Text>
            {skills.length > 0 && (
              <View style={[s.countBadge, isDark && s.countBadgeDark]}>
                <Text style={[s.countText, isDark && s.textWhite]}>{skills.length}</Text>
              </View>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={loadSkills} style={s.iconBtn} disabled={loading}>
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

        {/* Search */}
        <View style={[s.searchBar, isDark && s.searchBarDark]}>
          <Ionicons name="search-outline" size={16} color={isDark ? "#888888" : "#999999"} />
          <BottomSheetTextInput
            style={[s.searchInput, isDark && s.textWhite]}
            placeholder="Search skills..."
            placeholderTextColor={isDark ? "#666666" : "#999999"}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {loading && skills.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.loadingText, isDark && s.metaDark]}>Loading skills from server...</Text>
          </View>
        ) : (
          <BottomSheetFlatList<Skill>
            data={filteredSkills}
            keyExtractor={(item: Skill) => item.name}
            contentContainerStyle={s.list}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Ionicons
                  name="file-tray-outline"
                  size={36}
                  color={isDark ? "#444444" : "#cccccc"}
                />
                <Text style={[s.emptyTitle, isDark && s.textWhite]}>
                  {search ? "No matching skills" : "No skills found"}
                </Text>
                <Text style={[s.emptyDesc, isDark && s.metaDark]}>
                  {search
                    ? "Try a different search term."
                    : "Add skills in your project's .agents/skills or .opencode/skills directory."}
                </Text>
              </View>
            }
            renderItem={({ item }: { item: Skill }) => (
              <TouchableOpacity
                style={[s.skillCard, isDark && s.skillCardDark]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={s.cardTop}>
                  <View style={s.nameRow}>
                    <Text style={[s.skillName, isDark && s.textWhite]}>{item.name}</Text>
                  </View>
                  <View style={[s.useBtn, isDark && s.useBtnDark]}>
                    <Text style={[s.useBtnText, isDark && s.useBtnTextDark]}>Use</Text>
                    <Ionicons
                      name="arrow-up-circle-outline"
                      size={14}
                      color={isDark ? "#0a0a0a" : "#ffffff"}
                    />
                  </View>
                </View>
                {item.description ? (
                  <Text style={[s.skillDesc, isDark && s.metaDark]} numberOfLines={3}>
                    {item.description}
                  </Text>
                ) : null}
                {item.location ? (
                  <Text style={[s.skillLocation, isDark && s.metaDark]} numberOfLines={1}>
                    📁 {item.location}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
    gap: 6,
  },
  searchBarDark: { backgroundColor: "#222222" },
  searchInput: { flex: 1, fontSize: 14, color: "#0a0a0a" },
  list: { paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { fontSize: 13, color: "#888888", marginTop: 10 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  emptyDesc: { fontSize: 12, color: "#888888", textAlign: "center", paddingHorizontal: 20 },
  skillCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 10,
  },
  skillCardDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2e2e2e",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  nameRow: { flex: 1, marginRight: 8 },
  skillName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  useBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  useBtnDark: { backgroundColor: "#ffffff" },
  useBtnText: { fontSize: 12, fontWeight: "600", color: "#ffffff" },
  useBtnTextDark: { color: "#0a0a0a" },
  skillDesc: { fontSize: 13, color: "#4b5563", lineHeight: 18, marginBottom: 6 },
  skillLocation: { fontSize: 11, color: "#888888", marginTop: 2 },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

import { useState, useCallback, useRef, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { useConnections } from "../../stores/connections"
import { useCatalog } from "../../stores/catalog"

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
}

export const OpenCodeSettingsSheet = memo(function OpenCodeSettingsSheet({ isDark, sheetRef }: Props) {
  const client = useConnections((s) => s.client)
  const loadCatalog = useCatalog((s) => s.load)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"general" | "instructions" | "raw">("general")
  const prevIndex = useRef(-1)

  // Config fields
  const [username, setUsername] = useState("")
  const [defaultModel, setDefaultModel] = useState("")
  const [smallModel, setSmallModel] = useState("")
  const [defaultAgent, setDefaultAgent] = useState("")
  const [subagentDepth, setSubagentDepth] = useState("1")
  const [snapshot, setSnapshot] = useState(true)
  const [instructions, setInstructions] = useState("")
  const [rawJson, setRawJson] = useState("")

  const loadConfig = useCallback(async () => {
    if (!client) return
    setLoading(true)
    try {
      const res = await client.config.get()
      if (res) {
        setUsername((res.username as string) || "")
        setDefaultModel((res.model as string) || "")
        setSmallModel((res.small_model as string) || "")
        setDefaultAgent((res.default_agent as string) || "")
        setSubagentDepth(String(res.subagent_depth ?? 1))
        setSnapshot(res.snapshot !== false)
        setInstructions(Array.isArray(res.instructions) ? res.instructions.join("\n") : (res.instructions as string) || "")
        setRawJson(JSON.stringify(res, null, 2))
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load server configuration")
    } finally {
      setLoading(false)
    }
  }, [client])

  const handleSave = useCallback(async () => {
    if (!client) return
    setSaving(true)
    try {
      let payload: Record<string, any> = {}
      if (activeTab === "raw") {
        try {
          payload = JSON.parse(rawJson)
        } catch {
          Alert.alert("Invalid JSON", "Please check your JSON format before saving.")
          setSaving(false)
          return
        }
      } else {
        payload = {
          ...(username.trim() ? { username: username.trim() } : {}),
          ...(defaultModel.trim() ? { model: defaultModel.trim() } : {}),
          ...(smallModel.trim() ? { small_model: smallModel.trim() } : {}),
          ...(defaultAgent.trim() ? { default_agent: defaultAgent.trim() } : {}),
          subagent_depth: Math.max(0, parseInt(subagentDepth, 10) || 1),
          snapshot,
          ...(instructions.trim()
            ? { instructions: instructions.split("\n").map((s) => s.trim()).filter(Boolean) }
            : {}),
        }
      }

      await client.config.update(payload)
      await loadCatalog()
      Alert.alert("Success", "OpenCode server configuration updated successfully!")
      sheetRef.current?.close()
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Failed to update configuration")
    } finally {
      setSaving(false)
    }
  }, [client, activeTab, rawJson, username, defaultModel, smallModel, defaultAgent, subagentDepth, snapshot, instructions, loadCatalog, sheetRef])

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["65%", "90%"]}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#666666" : "#cccccc" }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (prevIndex.current === -1 && idx !== -1) loadConfig()
        prevIndex.current = idx
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons name="settings-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>OpenCode Server Settings</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={[s.saveHeaderBtn, isDark && s.saveHeaderBtnDark, saving && s.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={isDark ? "#0a0a0a" : "#ffffff"} />
              ) : (
                <Text style={[s.saveHeaderBtnText, isDark && s.saveHeaderBtnTextDark]}>Save</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.closeHeaderBtn}
              onPress={() => sheetRef.current?.close()}
            >
              <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Segmented Controls */}
        <View style={[s.tabBar, isDark && s.tabBarDark]}>
          <TouchableOpacity
            style={[s.tabItem, activeTab === "general" && (isDark ? s.tabItemActiveDark : s.tabItemActive)]}
            onPress={() => setActiveTab("general")}
          >
            <Text style={[s.tabText, activeTab === "general" ? (isDark ? s.textWhite : s.tabTextActive) : (isDark && s.metaDark)]}>
              General
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabItem, activeTab === "instructions" && (isDark ? s.tabItemActiveDark : s.tabItemActive)]}
            onPress={() => setActiveTab("instructions")}
          >
            <Text style={[s.tabText, activeTab === "instructions" ? (isDark ? s.textWhite : s.tabTextActive) : (isDark && s.metaDark)]}>
              Instructions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabItem, activeTab === "raw" && (isDark ? s.tabItemActiveDark : s.tabItemActive)]}
            onPress={() => setActiveTab("raw")}
          >
            <Text style={[s.tabText, activeTab === "raw" ? (isDark ? s.textWhite : s.tabTextActive) : (isDark && s.metaDark)]}>
              opencode.json
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={isDark ? "#ffffff" : "#0a0a0a"} size="large" />
          </View>
        ) : (
          <BottomSheetScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {activeTab === "general" && (
              <View style={s.section}>
                {/* Username */}
                <Text style={[s.label, isDark && s.metaDark]}>User Display Name (username)</Text>
                <BottomSheetTextInput
                  style={[s.input, isDark && s.inputDark, isDark && s.textWhite]}
                  placeholder="e.g. dzianis"
                  placeholderTextColor={isDark ? "#666666" : "#999999"}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />

                {/* Default Model */}
                <Text style={[s.label, isDark && s.metaDark]}>Default Model (model)</Text>
                <BottomSheetTextInput
                  style={[s.input, isDark && s.inputDark, isDark && s.textWhite]}
                  placeholder="e.g. anthropic/claude-3-5-sonnet"
                  placeholderTextColor={isDark ? "#666666" : "#999999"}
                  value={defaultModel}
                  onChangeText={setDefaultModel}
                  autoCapitalize="none"
                />

                {/* Small Model */}
                <Text style={[s.label, isDark && s.metaDark]}>Small Model (small_model)</Text>
                <BottomSheetTextInput
                  style={[s.input, isDark && s.inputDark, isDark && s.textWhite]}
                  placeholder="e.g. opencode/deepseek-v4-flash-free"
                  placeholderTextColor={isDark ? "#666666" : "#999999"}
                  value={smallModel}
                  onChangeText={setSmallModel}
                  autoCapitalize="none"
                />

                {/* Default Agent */}
                <Text style={[s.label, isDark && s.metaDark]}>Default Agent (default_agent)</Text>
                <BottomSheetTextInput
                  style={[s.input, isDark && s.inputDark, isDark && s.textWhite]}
                  placeholder="e.g. build, plan"
                  placeholderTextColor={isDark ? "#666666" : "#999999"}
                  value={defaultAgent}
                  onChangeText={setDefaultAgent}
                  autoCapitalize="none"
                />

                {/* Subagent Depth */}
                <Text style={[s.label, isDark && s.metaDark]}>Subagent Nesting Depth (subagent_depth)</Text>
                <BottomSheetTextInput
                  style={[s.input, isDark && s.inputDark, isDark && s.textWhite]}
                  placeholder="1"
                  placeholderTextColor={isDark ? "#666666" : "#999999"}
                  value={subagentDepth}
                  onChangeText={setSubagentDepth}
                  keyboardType="numeric"
                />

                {/* Snapshot Tracking */}
                <View style={[s.switchRow, isDark && s.switchRowDark]}>
                  <View style={s.switchTextCol}>
                    <Text style={[s.switchTitle, isDark && s.textWhite]}>Snapshot Tracking</Text>
                    <Text style={[s.switchDesc, isDark && s.metaDark]}>
                      Record file snapshots for undo/revert actions.
                    </Text>
                  </View>
                  <Switch
                    value={snapshot}
                    onValueChange={setSnapshot}
                    trackColor={{ false: "#767577", true: isDark ? "#ffffff" : "#0a0a0a" }}
                  />
                </View>
              </View>
            )}

            {activeTab === "instructions" && (
              <View style={s.section}>
                <Text style={[s.label, isDark && s.metaDark]}>Custom System Instructions (instructions)</Text>
                <Text style={[s.helperText, isDark && s.metaDark]}>
                  Rules and instructions automatically injected into agent system prompts. One per line.
                </Text>
                <BottomSheetTextInput
                  style={[s.textArea, isDark && s.inputDark, isDark && s.textWhite]}
                  placeholder="e.g. Always write tests for new functions.&#10;Follow PEP8 conventions."
                  placeholderTextColor={isDark ? "#666666" : "#999999"}
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  scrollEnabled={false}
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </View>
            )}

            {activeTab === "raw" && (
              <View style={s.section}>
                <Text style={[s.label, isDark && s.metaDark]}>Raw opencode.json Configuration</Text>
                <BottomSheetTextInput
                  style={[s.codeArea, isDark && s.inputDark, isDark && s.textWhite]}
                  value={rawJson}
                  onChangeText={setRawJson}
                  multiline
                  scrollEnabled={false}
                  numberOfLines={14}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlignVertical="top"
                />
              </View>
            )}

            <TouchableOpacity
              style={[s.saveBtn, isDark && s.saveBtnDark, saving && s.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={isDark ? "#0a0a0a" : "#ffffff"} size="small" />
              ) : (
                <Text style={[s.saveBtnText, isDark && s.saveBtnTextDark]}>Save Configuration</Text>
              )}
            </TouchableOpacity>
          </BottomSheetScrollView>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveHeaderBtn: {
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveHeaderBtnDark: {
    backgroundColor: "#ffffff",
  },
  saveHeaderBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  saveHeaderBtnTextDark: { color: "#0a0a0a" },
  closeHeaderBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  tabBarDark: { backgroundColor: "#222222" },
  tabItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
  },
  tabItemActive: { backgroundColor: "#ffffff", elevation: 1 },
  tabItemActiveDark: { backgroundColor: "#333333" },
  tabText: { fontSize: 12, fontWeight: "500", color: "#4b5563" },
  tabTextActive: { color: "#0a0a0a", fontWeight: "700" },
  scroll: { paddingBottom: 50 },
  section: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#4b5563", marginBottom: 6, marginTop: 8 },
  helperText: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: "#0a0a0a",
    marginBottom: 8,
  },
  inputDark: {
    backgroundColor: "#1f1f1f",
    borderColor: "#333333",
  },
  textArea: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 13,
    color: "#0a0a0a",
    marginBottom: 8,
  },
  codeArea: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    minHeight: 220,
    fontFamily: "monospace",
    fontSize: 12,
    color: "#0a0a0a",
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 8,
    marginBottom: 8,
  },
  switchRowDark: {
    backgroundColor: "#1f1f1f",
    borderColor: "#333333",
  },
  switchTextCol: { flex: 1, marginRight: 12 },
  switchTitle: { fontSize: 14, fontWeight: "600", color: "#0a0a0a" },
  switchDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  saveBtn: {
    backgroundColor: "#0a0a0a",
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  saveBtnDark: {
    backgroundColor: "#ffffff",
  },
  saveBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  saveBtnTextDark: { color: "#0a0a0a" },
  btnDisabled: { opacity: 0.6 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

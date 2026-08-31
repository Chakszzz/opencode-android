import { useState, useEffect, useCallback, useRef, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"
import { useConnections } from "../../stores/connections"

interface McpEntry {
  name: string
  status: "connected" | "disconnected" | "connecting" | "error"
  error?: string
}

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
}

export const McpSheet = memo(function McpSheet({ isDark, sheetRef }: Props) {
  const { t } = useTranslation()
  const client = useConnections((s) => s.client)
  const [mcps, setMcps] = useState<McpEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const prevIndex = useRef(-1)

  const loadMcps = useCallback(async () => {
    if (!client) return
    setLoading(true)
    try {
      const res = await client.mcp.status()
      const list: McpEntry[] = Object.entries(res || {}).map(([name, data]) => ({
        name,
        status: data.status,
        error: data.error,
      }))
      setMcps(list)
    } catch (err) {
      console.warn("Failed to load MCPs:", err)
      setMcps([])
    } finally {
      setLoading(false)
    }
  }, [client])

  const toggleMcp = useCallback(
    async (mcp: McpEntry) => {
      if (!client) return
      setActionInProgress(mcp.name)
      try {
        if (mcp.status === "connected") {
          await client.mcp.disconnect(mcp.name)
        } else {
          await client.mcp.connect(mcp.name)
        }
        await loadMcps()
      } catch (err: any) {
        Alert.alert("MCP Error", err.message || "Failed to toggle MCP")
      } finally {
        setActionInProgress(null)
      }
    },
    [client, loadMcps],
  )

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["50%", "80%"]}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      keyboardBehavior="interactive"
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#666666" : "#cccccc" }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (prevIndex.current === -1 && idx !== -1) {
          loadMcps()
        }
        prevIndex.current = idx
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons name="construct-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>MCP Servers</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={loadMcps} disabled={loading} style={s.refreshBtn}>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={isDark ? "#888888" : "#666666"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.subtitle, isDark && s.metaDark]}>
          Model Context Protocol extensions enable tools like GitHub, DBs, and search.
        </Text>

        {loading && mcps.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator color={isDark ? "#ffffff" : "#0a0a0a"} size="large" />
          </View>
        ) : mcps.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="cube-outline" size={40} color={isDark ? "#444444" : "#cccccc"} />
            <Text style={[s.emptyText, isDark && s.metaDark]}>No MCP servers configured on backend</Text>
            <Text style={[s.emptySubtext, isDark && s.metaDark]}>
              Add MCP servers in your opencode.json config file.
            </Text>
          </View>
        ) : (
          <BottomSheetFlatList<McpEntry>
            data={mcps}
            keyExtractor={(item: McpEntry) => item.name}
            contentContainerStyle={s.list}
            renderItem={({ item }: { item: McpEntry }) => {
              const isBusy = actionInProgress === item.name
              const isConnected = item.status === "connected"
              return (
                <View style={[s.mcpCard, isDark && s.mcpCardDark]}>
                  <View style={s.mcpInfo}>
                    <View style={s.mcpNameRow}>
                      <Text style={[s.mcpName, isDark && s.textWhite]}>{item.name}</Text>
                      <View
                        style={[
                          s.statusDot,
                          {
                            backgroundColor: isConnected
                              ? "#22c55e"
                              : item.status === "error"
                                ? "#ef4444"
                                : "#6b7280",
                          },
                        ]}
                      />
                      <Text
                        style={[
                          s.statusText,
                          {
                            color: isConnected
                              ? "#22c55e"
                              : item.status === "error"
                                ? "#ef4444"
                                : isDark
                                  ? "#888888"
                                  : "#666666",
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    {item.error && (
                      <Text style={s.errorText} numberOfLines={2}>
                        {item.error}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      s.toggleBtn,
                      isConnected ? s.disconnectBtn : s.connectBtn,
                      isBusy && s.btnDisabled,
                    ]}
                    onPress={() => toggleMcp(item)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={isConnected ? "#ef4444" : "#ffffff"} />
                    ) : (
                      <Text
                        style={[
                          s.toggleBtnText,
                          isConnected ? s.disconnectBtnText : s.connectBtnText,
                        ]}
                      >
                        {isConnected ? "Disable" : "Enable"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
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
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#0a0a0a" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  refreshBtn: { padding: 4 },
  closeBtn: { padding: 4 },
  subtitle: { fontSize: 12, color: "#666666", marginTop: 8, marginBottom: 12 },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: "500", marginTop: 12, color: "#666666" },
  emptySubtext: { fontSize: 12, color: "#888888", marginTop: 4, textAlign: "center" },
  list: { paddingBottom: 30 },
  mcpCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  mcpCardDark: {
    backgroundColor: "#1f1f1f",
    borderColor: "#2e2e2e",
  },
  mcpInfo: { flex: 1, marginRight: 8 },
  mcpNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mcpName: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  statusText: { fontSize: 11, textTransform: "capitalize" },
  errorText: { fontSize: 11, color: "#ef4444", marginTop: 4 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  connectBtn: { backgroundColor: "#0a0a0a" },
  disconnectBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#ef4444" },
  connectBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  disconnectBtnText: { color: "#ef4444", fontSize: 12, fontWeight: "600" },
  toggleBtnText: { fontSize: 12, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
})

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { useConnections } from "../../stores/connections"
import { useEvents } from "../../stores/events"
import { useSessions } from "../../stores/sessions"
import { useCatalog } from "../../stores/catalog"
import type { HealthResponse } from "../../lib/sdk"
import {
  estimateSessionContextBreakdown,
  type SessionContextBreakdownKey,
  type SessionContextBreakdownSegment,
} from "./context-breakdown"

const BREAKDOWN_COLORS: Record<SessionContextBreakdownKey, string> = {
  system: "#3b82f6",
  user: "#16a34a",
  assistant: "#888888",
  tool: "#d97706",
  other: "#555555",
}

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
}

export const StatusSheet = memo(function StatusSheet({ isDark, sheetRef }: Props) {
  const activeConnection = useConnections((s) => s.activeConnection)
  const client = useConnections((s) => s.client)
  const isSseConnected = useEvents((s) => s.connected)
  const reconnectAttempts = useEvents((s) => s.reconnectAttempts)
  const currentSession = useSessions((s) => s.currentSession)
  const messages = useSessions((s) => s.messages) || []
  const parts = useSessions((s) => s.parts) || {}
  const agent = useCatalog((s) => s.agent)
  const model = useCatalog((s) => s.model)
  const variant = useCatalog((s) => s.variant)

  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const prevIndex = useRef(-1)

  const loadHealth = useCallback(async () => {
    if (!client) return
    setLoadingHealth(true)
    try {
      const t0 = Date.now()
      const res = await client.global.health(5000)
      const rtt = Date.now() - t0
      setLatencyMs(rtt)
      setHealth(res)
    } catch {
      setHealth(null)
      setLatencyMs(null)
    } finally {
      setLoadingHealth(false)
    }
  }, [client])

  // Token and cost aggregates
  const stats = useMemo(() => {
    let inputTokens = 0
    let outputTokens = 0
    let reasoningTokens = 0
    let totalCost = 0

    for (const msg of messages) {
      if (msg.tokens) {
        inputTokens += msg.tokens.input || 0
        outputTokens += msg.tokens.output || 0
        reasoningTokens += msg.tokens.reasoning || 0
      }
      if (msg.cost) {
        totalCost += msg.cost
      }
    }

    return {
      inputTokens,
      outputTokens,
      reasoningTokens,
      totalTokens: inputTokens + outputTokens,
      totalCost,
    }
  }, [messages])

  // Context Breakdown estimation
  const systemPrompt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === "user" && (msg as any).system) {
        return (msg as any).system
      }
    }
    return undefined
  }, [messages])

  const breakdown = useMemo(() => {
    return estimateSessionContextBreakdown({
      messages,
      parts,
      input: stats.inputTokens || stats.totalTokens || 1,
      systemPrompt,
    })
  }, [messages, parts, stats.inputTokens, stats.totalTokens, systemPrompt])

  const copyDiagnostic = useCallback(async () => {
    const text = [
      `=== OpenCode System Status ===`,
      `Server: ${activeConnection?.name || "None"} (${activeConnection?.url || "N/A"})`,
      `Latency (RTT): ${latencyMs !== null ? `${latencyMs}ms` : "N/A"}`,
      `Health: ${health?.healthy ? "Healthy" : "Unknown"} (v${health?.version || "unknown"})`,
      `SSE Stream: ${isSseConnected ? "Connected" : `Disconnected (reconnects: ${reconnectAttempts})`}`,
      `Session ID: ${currentSession?.id || "None"}`,
      `Directory: ${currentSession?.directory || "N/A"}`,
      `Agent: ${agent || "build"}`,
      `Model: ${model ? `${model.providerID}/${model.modelID}` : "default"}${variant ? ` (${variant})` : ""}`,
      `Messages: ${messages.length}`,
      `Total Tokens: ${stats.totalTokens.toLocaleString()} (in: ${stats.inputTokens.toLocaleString()}, out: ${stats.outputTokens.toLocaleString()})`,
      `Total Cost: $${stats.totalCost.toFixed(4)}`,
    ].join("\n")

    await Clipboard.setStringAsync(text)
    Alert.alert("Copied", "Status details copied to clipboard!")
  }, [activeConnection, latencyMs, health, isSseConnected, reconnectAttempts, currentSession, agent, model, variant, messages, stats])

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["60%", "85%"]}
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
        if (prevIndex.current === -1 && idx !== -1) loadHealth()
        prevIndex.current = idx
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons name="information-circle-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>System Status</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={copyDiagnostic} style={[s.copyBtn, isDark && s.copyBtnDark]}>
              <Ionicons name="copy-outline" size={16} color={isDark ? "#ffffff" : "#0a0a0a"} />
              <Text style={[s.copyBtnText, isDark && s.textWhite]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.iconBtn}>
              <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
            </TouchableOpacity>
          </View>
        </View>

        <BottomSheetScrollView contentContainerStyle={s.scroll}>
          {/* Section 1: Server Connection */}
          <Text style={[s.sectionLabel, isDark && s.metaDark]}>SERVER CONNECTION</Text>
          <View style={[s.card, isDark && s.cardDark]}>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Active Server</Text>
              <Text style={[s.rowVal, isDark && s.textWhite]}>{activeConnection?.name || "None"}</Text>
            </View>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Network Latency</Text>
              {loadingHealth ? (
                <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#0a0a0a"} />
              ) : latencyMs !== null ? (
                <View style={s.badgeRow}>
                  <View
                    style={[
                      s.statusDot,
                      {
                        backgroundColor:
                          latencyMs < 100 ? "#22c55e" : latencyMs < 300 ? "#f59e0b" : "#ef4444",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      s.badgeText,
                      {
                        color:
                          latencyMs < 100 ? "#22c55e" : latencyMs < 300 ? "#f59e0b" : "#ef4444",
                      },
                    ]}
                  >
                    {latencyMs}ms ({latencyMs < 100 ? "Fast" : latencyMs < 300 ? "Good" : "Slow"})
                  </Text>
                </View>
              ) : (
                <Text style={[s.rowVal, isDark && s.metaDark]}>Unavailable</Text>
              )}
            </View>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Backend Version</Text>
              {loadingHealth ? (
                <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#0a0a0a"} />
              ) : (
                <Text style={[s.rowVal, isDark && s.textWhite]}>
                  {health ? `v${health.version}` : "Unknown"}
                </Text>
              )}
            </View>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Real-time Stream</Text>
              <View style={s.badgeRow}>
                <View
                  style={[
                    s.statusDot,
                    { backgroundColor: isSseConnected ? "#22c55e" : "#ef4444" },
                  ]}
                />
                <Text
                  style={[
                    s.badgeText,
                    { color: isSseConnected ? "#22c55e" : "#ef4444" },
                  ]}
                >
                  {isSseConnected ? "Connected" : `Reconnecting (${reconnectAttempts})`}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 2: Current Session */}
          <Text style={[s.sectionLabel, isDark && s.metaDark]}>CURRENT SESSION</Text>
          <View style={[s.card, isDark && s.cardDark]}>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Session ID</Text>
              <Text style={[s.rowValMono, isDark && s.textWhite]} numberOfLines={1}>
                {currentSession?.id || "None"}
              </Text>
            </View>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Workspace / Dir</Text>
              <Text style={[s.rowValMono, isDark && s.textWhite]} numberOfLines={1}>
                {currentSession?.directory || "Default"}
              </Text>
            </View>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Agent Mode</Text>
              <Text style={[s.rowVal, isDark && s.textWhite]}>{agent || "build"}</Text>
            </View>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Active Model</Text>
              <Text style={[s.rowVal, isDark && s.textWhite]}>
                {model ? `${model.providerID}/${model.modelID}` : "default"}
              </Text>
            </View>
            {variant && (
              <View style={s.row}>
                <Text style={[s.rowLabel, isDark && s.metaDark]}>Reasoning Variant</Text>
                <Text style={[s.rowVal, isDark && s.textWhite]}>{variant}</Text>
              </View>
            )}
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Total Messages</Text>
              <Text style={[s.rowVal, isDark && s.textWhite]}>{messages.length}</Text>
            </View>
          </View>

          {/* Section 3: Token Usage & Cost */}
          <Text style={[s.sectionLabel, isDark && s.metaDark]}>TOKEN CONSUMPTION</Text>
          <View style={[s.card, isDark && s.cardDark]}>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Input Tokens</Text>
              <Text style={[s.rowVal, isDark && s.textWhite]}>
                {stats.inputTokens.toLocaleString()}
              </Text>
            </View>
            <View style={s.row}>
              <Text style={[s.rowLabel, isDark && s.metaDark]}>Output Tokens</Text>
              <Text style={[s.rowVal, isDark && s.textWhite]}>
                {stats.outputTokens.toLocaleString()}
              </Text>
            </View>
            {stats.reasoningTokens > 0 && (
              <View style={s.row}>
                <Text style={[s.rowLabel, isDark && s.metaDark]}>Reasoning Tokens</Text>
                <Text style={[s.rowVal, isDark && s.textWhite]}>
                  {stats.reasoningTokens.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={[s.row, s.totalRow]}>
              <Text style={[s.totalLabel, isDark && s.textWhite]}>Total Tokens</Text>
              <Text style={[s.totalVal, isDark && s.textWhite]}>
                {stats.totalTokens.toLocaleString()}
              </Text>
            </View>
            {stats.totalCost > 0 && (
              <View style={s.row}>
                <Text style={[s.rowLabel, isDark && s.metaDark]}>Estimated Cost</Text>
                <Text style={[s.rowVal, { color: "#22c55e", fontWeight: "600" }]}>
                  ${stats.totalCost.toFixed(4)}
                </Text>
              </View>
            )}
          </View>

          {/* Section 4: Context Breakdown & Distribution */}
          {breakdown.length > 0 && (
            <>
              <Text style={[s.sectionLabel, isDark && s.metaDark]}>CONTEXT DISTRIBUTION</Text>
              <View style={[s.card, isDark && s.cardDark, { paddingVertical: 12 }]}>
                {/* Visual segmented bar */}
                <View style={[s.breakdownBar, isDark && s.breakdownBarDark]}>
                  {breakdown.map((segment) => (
                    <View
                      key={segment.key}
                      style={{
                        width: `${segment.width}%`,
                        backgroundColor: BREAKDOWN_COLORS[segment.key],
                        height: "100%",
                      }}
                    />
                  ))}
                </View>

                {/* Legend and metrics */}
                <View style={s.legendContainer}>
                  {breakdown.map((segment) => {
                    const label =
                      segment.key === "system"
                        ? "System Prompt"
                        : segment.key === "user"
                        ? "User Prompts"
                        : segment.key === "assistant"
                        ? "Assistant Replies"
                        : segment.key === "tool"
                        ? "Tool Payloads"
                        : "Other / Overhead"

                    return (
                      <View key={segment.key} style={s.legendItem}>
                        <View
                          style={[
                            s.legendDot,
                            { backgroundColor: BREAKDOWN_COLORS[segment.key] },
                          ]}
                        />
                        <Text style={[s.legendKey, isDark && s.textWhite]}>{label}</Text>
                        <Text style={[s.legendVal, isDark && s.metaDark]}>
                          {segment.tokens.toLocaleString()} tok ({segment.percent}%)
                        </Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            </>
          )}
        </BottomSheetScrollView>
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { padding: 6 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnDark: {
    backgroundColor: "#2a2a2a",
  },
  copyBtnText: { fontSize: 12, color: "#0a0a0a", fontWeight: "600" },
  scroll: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cardDark: {
    backgroundColor: "#1f1f1f",
    borderColor: "#2e2e2e",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  rowLabel: { fontSize: 13, color: "#4b5563" },
  rowVal: { fontSize: 13, fontWeight: "500", color: "#0a0a0a" },
  rowValMono: { fontSize: 12, fontFamily: "monospace", color: "#0a0a0a", maxWidth: "60%" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  totalRow: { borderBottomWidth: 0, paddingTop: 10, paddingBottom: 6 },
  totalLabel: { fontSize: 13, fontWeight: "700", color: "#0a0a0a" },
  totalVal: { fontSize: 14, fontWeight: "700", color: "#0a0a0a" },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },

  // Context breakdown styles
  breakdownBar: {
    height: 10,
    width: "100%",
    borderRadius: 5,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 12,
  },
  breakdownBarDark: {
    backgroundColor: "#2a2a2a",
  },
  legendContainer: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendKey: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0a0a0a",
    flex: 1,
  },
  legendVal: {
    fontSize: 12,
    color: "#6b7280",
  },
})

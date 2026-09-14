import { useState, useCallback, useMemo, memo } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"
import { useCatalog, type Provider } from "../../stores/catalog"
import { useConnections } from "../../stores/connections"
import { openLink } from "../../lib/openLink"

const PROVIDER_PRIORITY: Record<string, number> = {
  opencode: 0,
  "opencode-go": 1,
  openai: 2,
  "github-copilot": 3,
  anthropic: 4,
  google: 5,
  deepseek: 6,
  groq: 7,
  openrouter: 8,
  mistral: 9,
}

const PROVIDER_DOCS: Record<string, { desc: string; url?: string }> = {
  opencode: {
    desc: "OpenCode Zen gives you access to the best coding models with a single API key.",
    url: "https://opencode.ai/zen",
  },
  "opencode-go": {
    desc: "OpenCode Go is a subscription providing reliable access to open models.",
    url: "https://opencode.ai/go",
  },
  openai: {
    desc: "Connect OpenAI using an API key from your OpenAI platform dashboard.",
    url: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    desc: "Connect Claude models with an API key from Anthropic Console.",
    url: "https://console.anthropic.com/settings/keys",
  },
  google: {
    desc: "Connect Gemini models using an API key from Google AI Studio.",
    url: "https://aistudio.google.com/app/apikey",
  },
  deepseek: {
    desc: "Connect DeepSeek models using an API key from DeepSeek Platform.",
    url: "https://platform.deepseek.com/api_keys",
  },
  groq: {
    desc: "Ultra-fast inference for open-source models using Groq Cloud API.",
    url: "https://console.groq.com/keys",
  },
  openrouter: {
    desc: "Access hundreds of AI models via OpenRouter unified API.",
    url: "https://openrouter.ai/keys",
  },
}

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
}

export const ConnectProviderSheet = memo(function ConnectProviderSheet({ isDark, sheetRef }: Props) {
  const { t } = useTranslation()
  const allProviders = useCatalog((s) => s.allProviders)
  const loadCatalog = useCatalog((s) => s.load)
  const client = useConnections((s) => s.client)

  const [search, setSearch] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customID, setCustomID] = useState("")
  const [customName, setCustomName] = useState("")
  const [customBaseURL, setCustomBaseURL] = useState("")
  const [customApiKey, setCustomApiKey] = useState("")
  const [customModels, setCustomModels] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sort and filter providers
  const filteredProviders = useMemo(() => {
    const list = [...allProviders]
    const q = search.toLowerCase().trim()

    return list
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
      .sort((a, b) => {
        // Connected providers first
        if (a.connected !== b.connected) return a.connected ? -1 : 1
        // Then priority ranking
        const prioA = PROVIDER_PRIORITY[a.id] ?? 99
        const prioB = PROVIDER_PRIORITY[b.id] ?? 99
        if (prioA !== prioB) return prioA - prioB
        return a.name.localeCompare(b.name)
      })
  }, [allProviders, search])

  const handleSelectProvider = useCallback((provider: Provider) => {
    setSelectedProvider(provider)
    setIsCustomMode(false)
    setApiKey("")
    setShowKey(false)
  }, [])

  const handleOpenCustomMode = useCallback(() => {
    setIsCustomMode(true)
    setSelectedProvider(null)
    setCustomID("")
    setCustomName("")
    setCustomBaseURL("")
    setCustomApiKey("")
    setCustomModels("")
  }, [])

  const handlePasteKey = useCallback(async () => {
    const text = await Clipboard.getStringAsync()
    if (text) setApiKey(text.trim())
  }, [])

  const handleSaveKey = useCallback(async () => {
    if (!selectedProvider || !client) return
    if (!apiKey.trim()) {
      Alert.alert("Error", "Please enter a valid API key")
      return
    }

    setIsSubmitting(true)
    try {
      await client.auth.set({
        providerID: selectedProvider.id,
        auth: {
          type: "api",
          key: apiKey.trim(),
        },
      })
      await loadCatalog()
      Alert.alert("Success", `Connected to ${selectedProvider.name} successfully!`)
      setSelectedProvider(null)
      setApiKey("")
    } catch (err: any) {
      Alert.alert("Connection Failed", err.message || "Failed to save API key")
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedProvider, client, apiKey, loadCatalog])

  const handleDisconnect = useCallback(async () => {
    if (!selectedProvider || !client) return

    Alert.alert(
      "Disconnect Provider",
      `Are you sure you want to disconnect ${selectedProvider.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true)
            try {
              await client.auth.remove(selectedProvider.id)
              await loadCatalog()
              Alert.alert("Disconnected", `${selectedProvider.name} has been disconnected.`)
              setSelectedProvider(null)
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to disconnect provider")
            } finally {
              setIsSubmitting(false)
            }
          },
        },
      ],
    )
  }, [selectedProvider, client, loadCatalog])

  const handleSaveCustomProvider = useCallback(async () => {
    if (!client) return
    const id = customID.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
    const name = customName.trim() || id
    const baseURL = customBaseURL.trim()
    if (!id) {
      Alert.alert("Error", "Please enter a Provider ID (e.g. ollama, openrouter, vllm)")
      return
    }
    if (!baseURL) {
      Alert.alert("Error", "Please enter a Base URL (e.g. http://localhost:11434/v1)")
      return
    }

    setIsSubmitting(true)
    try {
      if (customApiKey.trim()) {
        await client.auth.set({
          providerID: id,
          auth: {
            type: "api",
            key: customApiKey.trim(),
          },
        })
      }

      const modelNames = customModels
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)

      const modelsRecord: Record<string, { id: string; name: string }> = {}
      if (modelNames.length === 0) {
        modelsRecord["default"] = { id: "default", name: "Default Model" }
      } else {
        modelNames.forEach((m) => {
          modelsRecord[m] = { id: m, name: m }
        })
      }

      await client.config.update({
        provider: {
          [id]: {
            name,
            baseURL,
            models: modelsRecord,
          },
        },
      })

      await loadCatalog()
      Alert.alert("Success", `Custom provider ${name} added successfully!`)
      setIsCustomMode(false)
      setCustomID("")
      setCustomName("")
      setCustomBaseURL("")
      setCustomApiKey("")
      setCustomModels("")
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save custom provider")
    } finally {
      setIsSubmitting(false)
    }
  }, [client, customID, customName, customBaseURL, customApiKey, customModels, loadCatalog])

  const info = selectedProvider ? PROVIDER_DOCS[selectedProvider.id] : null

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
      android_keyboardInputMode="adjustResize"
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#666666" : "#cccccc" }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (idx === -1) {
          setSearch("")
          setSelectedProvider(null)
          setIsCustomMode(false)
          setApiKey("")
        }
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          {selectedProvider ? (
            <TouchableOpacity style={s.backBtn} onPress={() => setSelectedProvider(null)}>
              <Ionicons name="arrow-back" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
              <Text style={[s.headerTitle, isDark && s.textWhite]}>{selectedProvider.name}</Text>
            </TouchableOpacity>
          ) : isCustomMode ? (
            <TouchableOpacity style={s.backBtn} onPress={() => setIsCustomMode(false)}>
              <Ionicons name="arrow-back" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
              <Text style={[s.headerTitle, isDark && s.textWhite]}>Add Custom Provider</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.headerTitleRow}>
              <Ionicons name="key-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
              <Text style={[s.headerTitle, isDark && s.textWhite]}>Connect AI Provider</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>
        </View>

        {/* View 1: Provider List */}
        {!selectedProvider && !isCustomMode && (
          <>
            <View style={[s.searchContainer, isDark && s.searchContainerDark]}>
              <Ionicons name="search" size={16} color={isDark ? "#888888" : "#666666"} />
              <BottomSheetTextInput
                style={[s.searchInput, isDark && s.textWhite]}
                placeholder="Search 75+ AI providers..."
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

            {/* Custom Provider Button */}
            <TouchableOpacity
              style={[s.customProviderBtn, isDark && s.customProviderBtnDark]}
              onPress={handleOpenCustomMode}
            >
              <View style={s.customBtnIconRow}>
                <Ionicons name="add-circle-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
                <View>
                  <Text style={[s.customBtnTitle, isDark && s.textWhite]}>Add Custom Provider</Text>
                  <Text style={[s.customBtnSubtitle, isDark && s.metaDark]}>
                    Ollama, vLLM, LMStudio, Local Gateway, OpenRouter
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#666666" : "#aaaaaa"} />
            </TouchableOpacity>

            <BottomSheetFlatList<Provider>
              data={filteredProviders}
              keyExtractor={(item: Provider) => item.id}
              contentContainerStyle={s.list}
              renderItem={({ item }: { item: Provider }) => {
                const isPriority = item.id in PROVIDER_PRIORITY
                return (
                  <TouchableOpacity
                    style={[s.providerRow, isDark && s.providerRowDark]}
                    onPress={() => handleSelectProvider(item)}
                  >
                    <View style={s.providerInfo}>
                      <View style={s.providerNameRow}>
                        <Text style={[s.providerName, isDark && s.textWhite]}>{item.name}</Text>
                        {item.connected && (
                          <View style={s.connectedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                            <Text style={s.connectedText}>Connected</Text>
                          </View>
                        )}
                        {isPriority && !item.connected && (
                          <View style={[s.priorityBadge, isDark && s.priorityBadgeDark]}>
                            <Text style={[s.priorityText, isDark && s.textWhite]}>Popular</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.providerModels, isDark && s.metaDark]}>
                        {item.models.length} model{item.models.length !== 1 ? "s" : ""} available
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={isDark ? "#444444" : "#cccccc"} />
                  </TouchableOpacity>
                )
              }}
            />
          </>
        )}

        {/* View 2: Custom Provider Form */}
        {isCustomMode && (
          <BottomSheetScrollView
            contentContainerStyle={s.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[s.infoBox, isDark && s.infoBoxDark]}>
              <Text style={[s.infoDesc, isDark && s.textWhite]}>
                Configure any OpenAI-compatible endpoint such as Ollama, LocalAI, vLLM, or LMStudio running locally or on your remote network.
              </Text>
            </View>

            <Text style={[s.inputLabel, isDark && s.metaDark]}>Provider ID</Text>
            <View style={[s.inputWrapper, isDark && s.inputWrapperDark]}>
              <BottomSheetTextInput
                style={[s.textInput, isDark && s.textWhite]}
                placeholder="e.g. ollama, my-gateway, vllm"
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                value={customID}
                onChangeText={setCustomID}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[s.inputLabel, isDark && s.metaDark]}>Provider Display Name</Text>
            <View style={[s.inputWrapper, isDark && s.inputWrapperDark]}>
              <BottomSheetTextInput
                style={[s.textInput, isDark && s.textWhite]}
                placeholder="e.g. Ollama Local"
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                value={customName}
                onChangeText={setCustomName}
              />
            </View>

            <Text style={[s.inputLabel, isDark && s.metaDark]}>Base URL</Text>
            <View style={[s.inputWrapper, isDark && s.inputWrapperDark]}>
              <BottomSheetTextInput
                style={[s.textInput, isDark && s.textWhite]}
                placeholder="e.g. http://localhost:11434/v1"
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                value={customBaseURL}
                onChangeText={setCustomBaseURL}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[s.inputLabel, isDark && s.metaDark]}>API Key (Optional)</Text>
            <View style={[s.inputWrapper, isDark && s.inputWrapperDark]}>
              <BottomSheetTextInput
                style={[s.textInput, isDark && s.textWhite]}
                placeholder="Enter API key if required..."
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                value={customApiKey}
                onChangeText={setCustomApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[s.inputLabel, isDark && s.metaDark]}>Model IDs (Comma-separated)</Text>
            <View style={[s.inputWrapper, isDark && s.inputWrapperDark]}>
              <BottomSheetTextInput
                style={[s.textInput, isDark && s.textWhite]}
                placeholder="e.g. llama3.3, qwen2.5-coder:32b, deepseek-r1"
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                value={customModels}
                onChangeText={setCustomModels}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, isSubmitting && s.btnDisabled]}
              onPress={handleSaveCustomProvider}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={s.primaryBtnText}>Save Custom Provider</Text>
              )}
            </TouchableOpacity>
          </BottomSheetScrollView>
        )}

        {/* View 3: API Key Configuration for Selected Preset Provider */}
        {selectedProvider && (
          <BottomSheetScrollView
            contentContainerStyle={s.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            {info && (
              <View style={[s.infoBox, isDark && s.infoBoxDark]}>
                <Text style={[s.infoDesc, isDark && s.textWhite]}>{info.desc}</Text>
                {info.url && (
                  <TouchableOpacity
                    style={s.linkRow}
                    onPress={() => info.url && void openLink(info.url)}
                  >
                    <Text style={[s.linkText, isDark && s.textWhite]}>Get API Key</Text>
                    <Ionicons name="open-outline" size={14} color={isDark ? "#ffffff" : "#0a0a0a"} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={[s.inputLabel, isDark && s.metaDark]}>API Key</Text>
            <View style={[s.inputWrapper, isDark && s.inputWrapperDark]}>
              <BottomSheetTextInput
                style={[s.textInput, isDark && s.textWhite]}
                placeholder={`Enter ${selectedProvider.name} API key...`}
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowKey(!showKey)} style={s.inputActionBtn}>
                <Ionicons
                  name={showKey ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={isDark ? "#888888" : "#666666"}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePasteKey} style={s.inputActionBtn}>
                <Ionicons name="clipboard-outline" size={18} color={isDark ? "#ffffff" : "#0a0a0a"} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, isSubmitting && s.btnDisabled]}
              onPress={handleSaveKey}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={s.primaryBtnText}>
                  {selectedProvider.connected ? "Update API Key" : "Connect Provider"}
                </Text>
              )}
            </TouchableOpacity>

            {selectedProvider.connected && (
              <TouchableOpacity
                style={[s.dangerBtn, isDark && s.dangerBtnDark]}
                onPress={handleDisconnect}
                disabled={isSubmitting}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={s.dangerBtnText}>Disconnect Provider</Text>
              </TouchableOpacity>
            )}
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
    marginBottom: 12,
  },
  closeBtn: { padding: 4 },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
    gap: 6,
  },
  searchContainerDark: { backgroundColor: "#222222" },
  searchInput: { flex: 1, fontSize: 14, color: "#0a0a0a" },
  list: { paddingBottom: 30 },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
  },
  providerRowDark: {},
  providerInfo: { flex: 1 },
  providerNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerName: { fontSize: 15, fontWeight: "500", color: "#0a0a0a" },
  providerModels: { fontSize: 12, color: "#666666", marginTop: 2 },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  connectedText: { fontSize: 11, color: "#22c55e", fontWeight: "600" },
  priorityBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeDark: { backgroundColor: "#2e2e2e" },
  priorityText: { fontSize: 11, color: "#555555", fontWeight: "600" },
  formContainer: { paddingTop: 10, paddingBottom: 40 },
  infoBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#0a0a0a",
  },
  infoBoxDark: { backgroundColor: "#1e1e1e", borderLeftColor: "#ffffff" },
  infoDesc: { fontSize: 13, color: "#1f2937", lineHeight: 18 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  linkText: { fontSize: 13, color: "#0a0a0a", fontWeight: "600" },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#4b5563", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  inputWrapperDark: {
    backgroundColor: "#1f1f1f",
    borderColor: "#333333",
  },
  textInput: { flex: 1, fontSize: 14, color: "#0a0a0a" },
  inputActionBtn: { padding: 6 },
  primaryBtn: {
    backgroundColor: "#0a0a0a",
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  dangerBtnDark: {
    borderColor: "#7f1d1d",
    backgroundColor: "#450a0a",
  },
  dangerBtnText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  customProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  customProviderBtnDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2a2a2a",
  },
  customBtnIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  customBtnTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  customBtnSubtitle: {
    fontSize: 11,
    color: "#666666",
    marginTop: 1,
  },
})

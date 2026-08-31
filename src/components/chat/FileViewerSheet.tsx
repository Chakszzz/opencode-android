import { useState, useEffect, useCallback, memo } from "react"
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
import { CodeBlock } from "../markdown/CodeBlock"
import { type Client } from "../../lib/sdk"

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
  filePath: string | null
  client: Client | null
  onClose?: () => void
}

export const FileViewerSheet = memo(function FileViewerSheet({
  isDark,
  sheetRef,
  filePath,
  client,
  onClose,
}: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback(async () => {
    if (!client || !filePath) return
    setLoading(true)
    setError(null)
    try {
      const text = await client.file.content(filePath)
      setContent(text)
    } catch (err) {
      console.log("[FileViewerSheet] Failed to load file:", err)
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [client, filePath])

  useEffect(() => {
    if (filePath) {
      loadFile()
    } else {
      setContent(null)
      setError(null)
    }
  }, [filePath, loadFile])

  const copyPath = async () => {
    if (!filePath) return
    try {
      await Clipboard.setStringAsync(filePath)
      Alert.alert("Copied", "File path copied to clipboard.")
    } catch {}
  }

  const getLanguage = (path: string | null): string => {
    if (!path) return "text"
    const ext = path.split(".").pop()?.toLowerCase()
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      go: "go",
      rs: "rust",
      json: "json",
      md: "markdown",
      sh: "bash",
      yml: "yaml",
      yaml: "yaml",
      sql: "sql",
      html: "html",
      css: "css",
    }
    return map[ext || ""] || ext || "text"
  }

  const fileName = filePath ? filePath.split("/").pop() : "File"
  const lang = getLanguage(filePath)

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
      onClose={onClose}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={isDark ? "#ffffff" : "#0a0a0a"}
            />
            <View style={s.titleCol}>
              <Text style={[s.fileName, isDark && s.textWhite]} numberOfLines={1}>
                {fileName}
              </Text>
              {filePath && (
                <TouchableOpacity onPress={copyPath} hitSlop={6}>
                  <Text style={[s.filePath, isDark && s.metaDark]} numberOfLines={1}>
                    {filePath}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={loadFile} style={s.iconBtn} disabled={loading}>
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
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.loadingText, isDark && s.metaDark]}>Reading file content...</Text>
          </View>
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
            <Text style={[s.errorTitle, isDark && s.textWhite]}>Failed to Load File</Text>
            <Text style={[s.errorMsg, isDark && s.metaDark]}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadFile}>
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : content !== null ? (
          <BottomSheetScrollView contentContainerStyle={s.scroll}>
            <CodeBlock code={content} language={lang} />
          </BottomSheetScrollView>
        ) : (
          <View style={s.center}>
            <Text style={[s.meta, isDark && s.metaDark]}>No file selected</Text>
          </View>
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 10 },
  titleCol: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  filePath: { fontSize: 11, color: "#888888", fontFamily: mono, marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { padding: 6 },
  scroll: { paddingBottom: 30 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  loadingText: { fontSize: 13, color: "#888888" },
  errorTitle: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  errorMsg: { fontSize: 12, color: "#888888", textAlign: "center", paddingHorizontal: 20 },
  retryBtn: {
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  retryText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  meta: { fontSize: 13, color: "#888888" },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

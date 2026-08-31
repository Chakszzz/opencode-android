import { useState, useCallback, useMemo, memo } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"

interface Props {
  sheetRef: React.RefObject<BottomSheet | null>
  currentDirectory?: string
  recentDirectories: string[]
  serverHome: string | null
  isDark: boolean
  isCreating: boolean
  onCreate: (directory?: string) => void
  onBrowse: () => void
}

export const NewSessionSheet = memo(function NewSessionSheet({
  sheetRef,
  currentDirectory,
  recentDirectories,
  serverHome,
  isDark,
  isCreating,
  onCreate,
  onBrowse,
}: Props) {
  const { t } = useTranslation()
  const [customPath, setCustomPath] = useState("")

  const handleSelect = useCallback(
    (dir?: string) => {
      sheetRef.current?.close()
      setCustomPath("")
      onCreate(dir)
    },
    [onCreate, sheetRef],
  )

  const handleCustomSubmit = useCallback(() => {
    const dir = customPath.trim()
    if (!dir) return
    handleSelect(dir)
  }, [customPath, handleSelect])

  const handleBrowsePress = useCallback(() => {
    sheetRef.current?.close()
    onBrowse()
  }, [onBrowse, sheetRef])

  const currentFolderShort = useMemo(() => {
    if (!currentDirectory) return null
    return currentDirectory.split("/").filter(Boolean).pop() || currentDirectory
  }, [currentDirectory])

  // Filter recents to exclude currentDirectory
  const filteredRecents = useMemo(() => {
    return recentDirectories.filter((dir) => dir && dir !== currentDirectory)
  }, [recentDirectories, currentDirectory])

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
      android_keyboardInputMode="adjustResize"
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#666666" : "#cccccc" }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (idx === -1) setCustomPath("")
      }}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTextWrap}>
            <Text style={[s.title, isDark && s.textWhite]}>{t("sessionsList.newSessionModal.title")}</Text>
            <Text style={[s.subtitle, isDark && s.textMuted]}>
              {t("sessionsList.newSessionModal.currentProjectLabel")}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.closeBtn, isDark && s.closeBtnDark]}
            onPress={() => sheetRef.current?.close()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          >
            <Ionicons name="close" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current / Active Project Quick Start Card */}
          <TouchableOpacity
            style={[s.currentCard, isDark && s.currentCardDark]}
            onPress={() => handleSelect(currentDirectory)}
            activeOpacity={0.7}
            disabled={isCreating}
          >
            <View style={s.currentCardHeader}>
              <View style={[s.folderIconWrap, isDark && s.folderIconWrapDark]}>
                <Ionicons name="folder" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
              </View>
              <View style={s.currentCardTextWrap}>
                <View style={s.currentCardTitleRow}>
                  <Text style={[s.currentCardTitle, isDark && s.textWhite]} numberOfLines={1}>
                    {currentFolderShort || t("sessionsList.newSessionModal.serverDefault")}
                  </Text>
                  <View style={[s.badge, isDark && s.badgeDark]}>
                    <Text style={[s.badgeText, isDark && s.badgeTextDark]}>Current</Text>
                  </View>
                </View>
                <Text style={[s.currentCardPath, isDark && s.textMuted]} numberOfLines={1}>
                  {currentDirectory || t("sessionsList.newSessionModal.serverDefault")}
                </Text>
              </View>
            </View>
            <View style={s.currentCardAction}>
              {isCreating ? (
                <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#0a0a0a"} />
              ) : (
                <View style={s.startBtnRow}>
                  <Text style={[s.startBtnText, isDark && s.textWhite]}>Start</Text>
                  <Ionicons name="arrow-forward-circle" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Browse Server Filesystem Action */}
          <TouchableOpacity
            style={[s.actionRow, isDark && s.actionRowDark]}
            onPress={handleBrowsePress}
            activeOpacity={0.7}
          >
            <View style={[s.actionIconWrap, isDark && s.actionIconWrapDark]}>
              <Ionicons name="folder-open-outline" size={18} color={isDark ? "#ffffff" : "#0a0a0a"} />
            </View>
            <View style={s.actionTextWrap}>
              <Text style={[s.actionTitle, isDark && s.textWhite]}>
                {t("sessionsList.newSessionModal.browseFoldersLabel")}
              </Text>
              <Text style={[s.actionSubtitle, isDark && s.textMuted]}>
                {t("sessionsList.newSessionModal.browseFoldersHint")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? "#666666" : "#999999"} />
          </TouchableOpacity>

          {/* Recent Projects List */}
          {filteredRecents.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, isDark && s.textMuted]}>
                {t("sessionsList.newSessionModal.recentProjectsLabel")}
              </Text>
              {filteredRecents.map((dir) => {
                const shortName = dir.split("/").filter(Boolean).pop() || dir
                return (
                  <TouchableOpacity
                    key={dir}
                    style={[s.recentRow, isDark && s.recentRowDark]}
                    onPress={() => handleSelect(dir)}
                    activeOpacity={0.7}
                    disabled={isCreating}
                  >
                    <Ionicons name="folder-outline" size={18} color={isDark ? "#888888" : "#666666"} />
                    <View style={s.recentTextWrap}>
                      <Text style={[s.recentName, isDark && s.textWhite]} numberOfLines={1}>
                        {shortName}
                      </Text>
                      <Text style={[s.recentPath, isDark && s.textMuted]} numberOfLines={1}>
                        {dir}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={isDark ? "#666666" : "#aaaaaa"} />
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {/* Manual Path Input */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, isDark && s.textMuted]}>
              {t("sessionsList.newSessionModal.enterPathLabel")}
            </Text>
            <View style={[s.inputContainer, isDark && s.inputContainerDark]}>
              <BottomSheetTextInput
                style={[s.input, isDark && s.inputDark]}
                placeholder={serverHome ? `${serverHome}/...` : "/path/to/project"}
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                value={customPath}
                onChangeText={(text) => {
                  if (serverHome && text === "~") setCustomPath(serverHome)
                  else if (serverHome && text.startsWith("~/")) setCustomPath(serverHome + text.slice(1))
                  else setCustomPath(text)
                }}
                onSubmitEditing={handleCustomSubmit}
                returnKeyType="go"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {customPath.trim().length > 0 && (
                <TouchableOpacity
                  style={[s.submitBtn, isDark && s.submitBtnDark]}
                  onPress={handleCustomSubmit}
                  disabled={isCreating}
                >
                  <Ionicons name="arrow-forward" size={18} color={isDark ? "#0a0a0a" : "#ffffff"} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  )
})

const s = StyleSheet.create({
  sheet: { backgroundColor: "#ffffff" },
  sheetDark: { backgroundColor: "#141414" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700", color: "#0a0a0a" },
  subtitle: { fontSize: 12, color: "#666666", marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    marginLeft: 12,
  },
  closeBtnDark: { backgroundColor: "#222222" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  textWhite: { color: "#ffffff" },
  textMuted: { color: "#888888" },

  // Current project card
  currentCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#0a0a0a",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentCardDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#404040",
  },
  currentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  folderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  folderIconWrapDark: { backgroundColor: "#262626" },
  currentCardTextWrap: { flex: 1 },
  currentCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  currentCardTitle: { fontSize: 15, fontWeight: "700", color: "#0a0a0a" },
  badge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDark: { backgroundColor: "#333333" },
  badgeText: { fontSize: 10, fontWeight: "600", color: "#374151" },
  badgeTextDark: { color: "#d1d5db" },
  currentCardPath: { fontSize: 12, color: "#666666", marginTop: 2 },
  currentCardAction: { marginLeft: 8 },
  startBtnRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  startBtnText: { fontSize: 13, fontWeight: "700", color: "#0a0a0a" },

  // Action row (Browse folders)
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  actionRowDark: {
    backgroundColor: "#1a1a1a",
    borderColor: "#262626",
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionIconWrapDark: {
    backgroundColor: "#262626",
    borderColor: "#333333",
  },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: "600", color: "#0a0a0a" },
  actionSubtitle: { fontSize: 11, color: "#666666", marginTop: 1 },

  // Sections
  section: { marginTop: 4 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Recents
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 6,
    gap: 10,
  },
  recentRowDark: {
    backgroundColor: "#181818",
    borderColor: "#262626",
  },
  recentTextWrap: { flex: 1 },
  recentName: { fontSize: 13, fontWeight: "600", color: "#0a0a0a" },
  recentPath: { fontSize: 11, color: "#888888", marginTop: 1 },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
  },
  inputContainerDark: {
    backgroundColor: "#1a1a1a",
    borderColor: "#262626",
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: "#0a0a0a",
  },
  inputDark: { color: "#ffffff" },
  submitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  submitBtnDark: { backgroundColor: "#ffffff" },
})

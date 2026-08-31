import { memo, useCallback, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"

interface Props {
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
  onClose?: () => void
}

export const SetupGuideSheet = memo(function SetupGuideSheet({
  isDark,
  sheetRef,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const snapPoints = useMemo(() => ["65%", "90%"], [])

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  )

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text)
      Alert.alert(t("common.copied", "Tersalin"), `${label} ${t("common.copiedToClipboard", "disalin ke papan klip.")}`)
    } catch {}
  }

  const handleClose = useCallback(() => {
    sheetRef.current?.close()
    onClose?.()
  }, [onClose, sheetRef])

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.sheetBg, isDark && styles.sheetBgDark]}
      handleIndicatorStyle={[styles.indicator, isDark && styles.indicatorDark]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconWrap, isDark && styles.headerIconWrapDark]}>
            <Ionicons name="server-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
          </View>
          <Text style={[styles.title, isDark && styles.textDark]}>
            {t("setupGuide.title", "Panduan Menyiapkan Server")}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.closeButton, isDark && styles.closeButtonDark]}
          onPress={handleClose}
          accessibilityLabel="Tutup panduan"
        >
          <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Install CLI */}
        <View style={[styles.stepCard, isDark && styles.stepCardDark]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, isDark && styles.stepNumberDark]}>
              <Text style={[styles.stepNumberText, isDark && styles.stepNumberTextDark]}>1</Text>
            </View>
            <Text style={[styles.stepTitle, isDark && styles.textDark]}>
              {t("setupGuide.step1.title", "Install OpenCode di Komputer")}
            </Text>
          </View>
          <Text style={[styles.stepDesc, isDark && styles.hintDark]}>
            {t("setupGuide.step1.desc", "Jalankan perintah berikut di Terminal Mac, Linux, atau Windows (WSL):")}
          </Text>
          <TouchableOpacity
            style={[styles.codeBox, isDark && styles.codeBoxDark]}
            onPress={() => copyToClipboard("npm i -g opencode", "Perintah npm")}
            activeOpacity={0.7}
          >
            <Text style={[styles.codeText, isDark && styles.codeTextDark]}>npm i -g opencode</Text>
            <Ionicons name="copy-outline" size={16} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>
        </View>

        {/* Step 2: Start Server */}
        <View style={[styles.stepCard, isDark && styles.stepCardDark]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, isDark && styles.stepNumberDark]}>
              <Text style={[styles.stepNumberText, isDark && styles.stepNumberTextDark]}>2</Text>
            </View>
            <Text style={[styles.stepTitle, isDark && styles.textDark]}>
              {t("setupGuide.step2.title", "Jalankan Server")}
            </Text>
          </View>
          <Text style={[styles.stepDesc, isDark && styles.hintDark]}>
            {t("setupGuide.step2.desc", "Buka folder proyek Anda di terminal, lalu jalankan:")}
          </Text>
          <TouchableOpacity
            style={[styles.codeBox, isDark && styles.codeBoxDark]}
            onPress={() => copyToClipboard("opencode serve --hostname 0.0.0.0 --port 4096", "Perintah serve")}
            activeOpacity={0.7}
          >
            <Text style={[styles.codeText, isDark && styles.codeTextDark]}>
              opencode serve --hostname 0.0.0.0 --port 4096
            </Text>
            <Ionicons name="copy-outline" size={16} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>
          <View style={styles.tipRow}>
            <Ionicons name="information-circle-outline" size={15} color={isDark ? "#9ca3af" : "#4b5563"} />
            <Text style={[styles.tipText, isDark && styles.hintDark]}>
              Flag <Text style={styles.inlineMono}>--hostname 0.0.0.0</Text> mengizinkan HP Anda terhubung melalui WiFi/LAN lokal atau Tailscale.
            </Text>
          </View>
        </View>

        {/* Step 3: Find IP */}
        <View style={[styles.stepCard, isDark && styles.stepCardDark]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, isDark && styles.stepNumberDark]}>
              <Text style={[styles.stepNumberText, isDark && styles.stepNumberTextDark]}>3</Text>
            </View>
            <Text style={[styles.stepTitle, isDark && styles.textDark]}>
              {t("setupGuide.step3.title", "Temukan Alamat IP")}
            </Text>
          </View>
          
          <View style={styles.osLabelRow}>
            <Ionicons name="logo-apple" size={14} color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[styles.subLabel, isDark && styles.textDark]}>macOS / Linux:</Text>
          </View>
          <TouchableOpacity
            style={[styles.codeBox, isDark && styles.codeBoxDark]}
            onPress={() => copyToClipboard("ipconfig getifaddr en0", "Perintah cek IP")}
            activeOpacity={0.7}
          >
            <Text style={[styles.codeText, isDark && styles.codeTextDark]}>ipconfig getifaddr en0</Text>
            <Ionicons name="copy-outline" size={16} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>

          <View style={[styles.osLabelRow, { marginTop: 10 }]}>
            <Ionicons name="logo-windows" size={14} color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[styles.subLabel, isDark && styles.textDark]}>Windows (CMD/PowerShell):</Text>
          </View>
          <TouchableOpacity
            style={[styles.codeBox, isDark && styles.codeBoxDark]}
            onPress={() => copyToClipboard("ipconfig", "Perintah ipconfig")}
            activeOpacity={0.7}
          >
            <Text style={[styles.codeText, isDark && styles.codeTextDark]}>ipconfig</Text>
            <Ionicons name="copy-outline" size={16} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>
        </View>

        {/* Step 4: Tailscale Alternative */}
        <View style={[styles.stepCard, isDark && styles.stepCardDark]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, isDark && styles.stepNumberDark]}>
              <Text style={[styles.stepNumberText, isDark && styles.stepNumberTextDark]}>4</Text>
            </View>
            <Text style={[styles.stepTitle, isDark && styles.textDark]}>
              {t("setupGuide.step4.title", "Koneksi Jarak Jauh (Tailscale)")}
            </Text>
          </View>
          <Text style={[styles.stepDesc, isDark && styles.hintDark]}>
            {t("setupGuide.step4.desc", "Untuk tersambung saat di luar rumah tanpa konfigurasi port forwarding, gunakan Tailscale di komputer dan HP Anda:")}
          </Text>
          <View style={[styles.codeBox, isDark && styles.codeBoxDark]}>
            <Text style={[styles.codeText, isDark && styles.codeTextDark]}>
              http://100.64.12.34:4096\nhttp://my-pc.tailnet.ts.net:4096
            </Text>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#ffffff",
  },
  sheetBgDark: {
    backgroundColor: "#141414",
  },
  indicator: {
    backgroundColor: "#cccccc",
  },
  indicatorDark: {
    backgroundColor: "#444444",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconWrapDark: {
    backgroundColor: "#222222",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0a0a0a",
    flex: 1,
  },
  textDark: {
    color: "#ffffff",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonDark: {
    backgroundColor: "#222222",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  stepCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  stepCardDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2a2a2a",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberDark: {
    backgroundColor: "#ffffff",
  },
  stepNumberText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  stepNumberTextDark: {
    color: "#0a0a0a",
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0a0a0a",
    flex: 1,
  },
  stepDesc: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 19,
    marginBottom: 8,
  },
  hintDark: {
    color: "#9ca3af",
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 4,
  },
  codeBoxDark: {
    backgroundColor: "#141414",
    borderColor: "#2a2a2a",
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#0969da",
    flex: 1,
    marginRight: 8,
  },
  codeTextDark: {
    color: "#58a6ff",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
  },
  tipText: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
    flex: 1,
  },
  osLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  inlineMono: {
    fontFamily: "monospace",
    fontWeight: "600",
    color: "#0969da",
  },
})


import { useMemo, useCallback, memo } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"

interface VariantOption {
  id: string | null
  label: string
  description: string
}

interface Props {
  variants: Record<string, { reasoningEffort?: string }> | undefined
  selected: string | null
  isDark: boolean
  onSelect: (variant: string | null) => void
  sheetRef: React.RefObject<BottomSheet | null>
}

export const VariantPicker = memo(function VariantPicker({ variants, selected, isDark, onSelect, sheetRef }: Props) {
  const { t } = useTranslation()

  const options: VariantOption[] = useMemo(() => {
    const effortDescriptions: Record<string, string> = {
      low: t("chat.variantPicker.effort.low"),
      medium: t("chat.variantPicker.effort.medium"),
      high: t("chat.variantPicker.effort.high"),
    }
    const autoOption: VariantOption = {
      id: null,
      label: t("chat.variantPicker.autoLabel"),
      description: t("chat.variantPicker.autoDescription"),
    }
    return [
      autoOption,
      ...Object.keys(variants || {}).map((id) => ({
        id,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        description: effortDescriptions[id] ?? id,
      })),
    ]
  }, [variants, t])

  const handleSelect = useCallback((id: string | null) => {
    onSelect(id)
    sheetRef.current?.close()
  }, [onSelect, sheetRef])

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["32%", "52%"]}
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
      <View style={s.header}>
        <View style={s.headerTitleRow}>
          <MaterialCommunityIcons
            name="brain"
            size={20}
            color={isDark ? "#ffffff" : "#0a0a0a"}
          />
          <Text style={[s.title, isDark && s.textWhite]}>{t("chat.variantPicker.title")}</Text>
        </View>
        <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.closeBtn}>
          <Ionicons name="close" size={18} color={isDark ? "#888888" : "#666666"} />
        </TouchableOpacity>
      </View>
      <BottomSheetFlatList
        data={options}
        keyExtractor={(item: VariantOption) => item.id ?? "auto"}
        renderItem={({ item }: { item: VariantOption }) => {
          const active = item.id === selected
          return (
            <TouchableOpacity
              style={[
                s.row,
                isDark && s.rowDark,
                active && (isDark ? s.rowSelectedDark : s.rowSelected),
              ]}
              onPress={() => handleSelect(item.id)}
              testID={`variant-option-${item.id ?? "auto"}`}
              activeOpacity={0.7}
            >
              <View style={[s.iconBox, isDark && s.iconBoxDark, active && (isDark ? s.iconBoxActiveDark : s.iconBoxActive)]}>
                {item.id === null ? (
                  <Ionicons
                    name="sparkles-outline"
                    size={16}
                    color={active ? (isDark ? "#ffffff" : "#0a0a0a") : (isDark ? "#888888" : "#666666")}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="brain"
                    size={16}
                    color={active ? (isDark ? "#ffffff" : "#0a0a0a") : (isDark ? "#888888" : "#666666")}
                  />
                )}
              </View>
              <View style={s.rowText}>
                <View style={s.nameRow}>
                  <Text style={[s.rowName, isDark && s.textWhite, active && s.rowNameActive]}>
                    {item.label}
                  </Text>
                  {item.id && (
                    <View style={[s.effortBadge, isDark && s.effortBadgeDark]}>
                      <Text style={[s.effortBadgeText, isDark && s.textWhite]}>
                        {item.id.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[s.rowDesc, isDark && s.metaDark]}>{item.description}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />}
            </TouchableOpacity>
          )
        }}
        contentContainerStyle={s.content}
      />
    </BottomSheet>
  )
})

const s = StyleSheet.create({
  sheet: { backgroundColor: "#ffffff" },
  sheetDark: { backgroundColor: "#141414" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: "700", color: "#0a0a0a" },
  closeBtn: { padding: 4 },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
  content: { paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  rowDark: { borderBottomColor: "#222222" },
  rowSelected: { backgroundColor: "#f5f5f5" },
  rowSelectedDark: { backgroundColor: "#1f1f1f" },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxDark: { backgroundColor: "#262626" },
  iconBoxActive: { backgroundColor: "#e5e5e5" },
  iconBoxActiveDark: { backgroundColor: "#333333" },
  rowText: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowName: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  rowNameActive: { fontWeight: "700" },
  effortBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  effortBadgeDark: {
    backgroundColor: "#2a2a2a",
  },
  effortBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#666666",
  },
  rowDesc: { fontSize: 12, color: "#888888", marginTop: 2 },
})

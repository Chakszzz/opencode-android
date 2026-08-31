import { useMemo, memo } from "react"
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"

export interface SlashCommand {
  trigger: string
  title: string
  description?: string
  icon: string
  type: "builtin" | "custom"
}

interface Props {
  query: string
  commands: SlashCommand[]
  isDark: boolean
  onSelect: (cmd: SlashCommand) => void
}

export const SlashPopover = memo(function SlashPopover({ query, commands, isDark, onSelect }: Props) {
  const { t } = useTranslation()
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return commands.filter((c) => c.trigger.toLowerCase().startsWith(q) || c.title.toLowerCase().includes(q))
  }, [query, commands])

  if (filtered.length === 0) return null

  return (
    <View style={[s.popover, isDark && s.popoverDark]}>
      <ScrollView keyboardShouldPersistTaps="always" style={s.scroll} bounces={false}>
        {filtered.map((cmd, idx) => (
          <TouchableOpacity
            key={`${cmd.type}-${cmd.trigger}-${idx}`}
            style={[s.item, isDark && s.itemDark]}
            onPress={() => onSelect(cmd)}
            activeOpacity={0.7}
          >
            <View style={[s.iconBox, isDark && s.iconBoxDark]}>
              <Ionicons
                name={cmd.icon as any}
                size={14}
                color={isDark ? "#ffffff" : "#0a0a0a"}
              />
            </View>
            <View style={s.textRow}>
              <Text style={[s.trigger, isDark && s.textWhite]}>/{cmd.trigger}</Text>
              {cmd.description && (
                <Text style={[s.desc, isDark && s.metaDark]} numberOfLines={1}>
                  {cmd.description}
                </Text>
              )}
            </View>
            {cmd.type === "custom" && (
              <View style={[s.badge, isDark && s.badgeDark]}>
                <Text style={[s.badgeText, isDark && s.badgeTextDark]}>
                  {t("chat.slashPopover.customBadge") || "Custom"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
})

const s = StyleSheet.create({
  popover: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    maxHeight: 190,
  },
  popoverDark: {
    backgroundColor: "#161616",
    borderTopColor: "#262626",
  },
  scroll: { paddingVertical: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
    gap: 10,
  },
  itemDark: {
    borderBottomColor: "#222222",
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxDark: {
    backgroundColor: "#262626",
  },
  textRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trigger: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  textWhite: { color: "#ffffff" },
  desc: {
    flex: 1,
    fontSize: 12,
    color: "#777777",
  },
  metaDark: { color: "#888888" },
  badge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDark: {
    backgroundColor: "#2a2a2a",
  },
  badgeText: {
    fontSize: 10,
    color: "#555555",
    fontWeight: "600",
  },
  badgeTextDark: {
    color: "#cccccc",
  },
})

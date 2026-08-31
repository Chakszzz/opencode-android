import { useMemo, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { Message, Part } from "../../lib/sdk"
import { getSuggestedFollowups } from "./followup-extract"

interface Props {
  messages: Message[]
  parts: Record<string, Part[]>
  isSending: boolean
  isBusy?: boolean
  isDark: boolean
  onSelectFollowup: (text: string, immediateSend?: boolean) => void
}

export const FollowupDock = memo(function FollowupDock({
  messages,
  parts,
  isSending,
  isBusy,
  isDark,
  onSelectFollowup,
}: Props) {
  const suggestions = useMemo(() => {
    if (isSending || isBusy) return []
    return getSuggestedFollowups(messages, parts)
  }, [messages, parts, isSending, isBusy])

  if (isSending || isBusy || suggestions.length === 0) return null

  return (
    <View style={s.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        <View style={[s.leadIcon, isDark && s.leadIconDark]}>
          <Ionicons
            name="sparkles-outline"
            size={12}
            color={isDark ? "#888888" : "#666666"}
          />
        </View>

        {suggestions.map((item, idx) => (
          <TouchableOpacity
            key={`followup-${idx}`}
            style={[s.chip, isDark && s.chipDark]}
            onPress={() => onSelectFollowup(item, false)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, isDark && s.textWhite]} numberOfLines={1}>
              {item}
            </Text>
            <TouchableOpacity
              style={s.sendMiniBtn}
              onPress={() => onSelectFollowup(item, true)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name="arrow-up"
                size={11}
                color={isDark ? "#ffffff" : "#0a0a0a"}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 6,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leadIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  leadIconDark: {
    backgroundColor: "#222222",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
  },
  chipDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#2a2a2a",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0a0a0a",
  },
  sendMiniBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  textWhite: {
    color: "#ffffff",
  },
})

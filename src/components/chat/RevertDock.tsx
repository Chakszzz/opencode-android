import { useState, useMemo, memo, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import type { Message } from "../../lib/sdk"

interface Props {
  revertMessageID: string
  messages: Message[]
  isDark: boolean
  onUnrevert: () => Promise<void>
}

export const RevertDock = memo(function RevertDock({
  revertMessageID,
  messages,
  isDark,
  onUnrevert,
}: Props) {
  const { t } = useTranslation()
  const [restoring, setRestoring] = useState(false)

  const hiddenCount = useMemo(() => {
    return messages.filter(
      (m) => !m.id.startsWith("temp-") && m.id >= revertMessageID,
    ).length
  }, [messages, revertMessageID])

  const handleRestore = useCallback(async () => {
    setRestoring(true)
    try {
      await onUnrevert()
    } finally {
      setRestoring(false)
    }
  }, [onUnrevert])

  return (
    <View style={[s.container, isDark && s.containerDark]}>
      <View style={s.leftCol}>
        <View style={[s.iconBox, isDark && s.iconBoxDark]}>
          <Ionicons
            name="arrow-undo-outline"
            size={16}
            color={isDark ? "#ffffff" : "#0a0a0a"}
          />
        </View>
        <View style={s.textCol}>
          <Text style={[s.title, isDark && s.textWhite]}>
            Session Rolled Back
          </Text>
          <Text style={[s.subtitle, isDark && s.metaDark]} numberOfLines={1}>
            {hiddenCount > 0
              ? `${hiddenCount} message${hiddenCount > 1 ? "s" : ""} hidden until next prompt`
              : "Revert state is active"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.restoreBtn, isDark && s.restoreBtnDark]}
        onPress={handleRestore}
        disabled={restoring}
        activeOpacity={0.7}
      >
        {restoring ? (
          <ActivityIndicator size="small" color={isDark ? "#0a0a0a" : "#ffffff"} />
        ) : (
          <>
            <Ionicons
              name="refresh-outline"
              size={13}
              color={isDark ? "#0a0a0a" : "#ffffff"}
            />
            <Text style={[s.restoreBtnText, isDark && s.textBlack]}>
              Restore
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fef3c7", // subtle amber background in light mode
    borderWidth: 1,
    borderColor: "#fde68a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerDark: {
    backgroundColor: "#1c1917",
    borderColor: "#292524",
  },
  leftCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxDark: {
    backgroundColor: "#292524",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  subtitle: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 1,
  },
  textWhite: {
    color: "#f5f5f4",
  },
  metaDark: {
    color: "#a8a29e",
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  restoreBtnDark: {
    backgroundColor: "#ffffff",
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  textBlack: {
    color: "#0a0a0a",
  },
})

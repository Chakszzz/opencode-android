import { useState, useEffect, memo, useMemo, useRef, useCallback } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, LayoutAnimation, Vibration } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import { useTranslation } from "react-i18next"

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

interface Props {
  text: string
  isDark: boolean
  streaming?: boolean
}

export const ReasoningBlock = memo(function ReasoningBlock({ text, isDark, streaming }: Props) {
  const { t } = useTranslation()
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null)
  const expanded = userExpanded !== null ? userExpanded : Boolean(streaming)
  const [copied, setCopied] = useState(false)
  const startTimeRef = useRef<number>(Date.now())
  const [elapsedSec, setElapsedSec] = useState<number>(0)

  useEffect(() => {
    if (!streaming) return
    const timer = setInterval(() => {
      setElapsedSec(Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)))
    }, 1000)
    return () => clearInterval(timer)
  }, [streaming])

  const label = useMemo(() => {
    if (streaming) {
      return elapsedSec > 0
        ? t("chat.reasoningBlock.thinkingWithDuration", { duration: elapsedSec, defaultValue: `Thinking (${elapsedSec}s)...` })
        : t("chat.reasoningBlock.thinking", { defaultValue: "Thinking..." })
    }
    if (elapsedSec > 0) {
      return t("chat.reasoningBlock.thoughtWithDuration", { duration: elapsedSec, defaultValue: `Thought for ${elapsedSec}s` })
    }
    return t("chat.reasoningBlock.thoughtProcess", { defaultValue: "Thought process" })
  }, [streaming, elapsedSec, t])

  const toggle = useCallback(() => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      Vibration.vibrate(8)
    } catch {}
    setUserExpanded((prev) => (prev !== null ? !prev : !expanded))
  }, [expanded])

  const handleCopy = useCallback(async () => {
    if (!text) return
    try {
      Vibration.vibrate(20)
    } catch {}
    await Clipboard.setStringAsync(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={[s.header, isDark ? s.headerDark : s.headerLight]}
        onPress={toggle}
        onLongPress={handleCopy}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Tap to expand thought process. Long press to copy."
      >
        <View style={s.headerLeft}>
          {streaming ? (
            <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#0a0a0a"} style={s.spinner} />
          ) : (
            <Ionicons name="bulb-outline" size={13} color={isDark ? "#a3a3a3" : "#525252"} />
          )}
          <Text style={[s.label, isDark && s.textWhite]}>{label}</Text>
        </View>

        <View style={s.headerRight}>
          {copied && (
            <View style={[s.copiedBadge, isDark && s.copiedBadgeDark]}>
              <Text style={s.copiedBadgeText}>Copied</Text>
            </View>
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={13}
            color={isDark ? "#737373" : "#a3a3a3"}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[s.content, isDark ? s.contentDark : s.contentLight]}>
          <Text style={[s.text, isDark && s.textDark]} selectable>
            {text}
          </Text>
        </View>
      )}
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginTop: 2,
  },
  header: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  headerLight: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  headerDark: {
    backgroundColor: "#161616",
    borderColor: "#262626",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  spinner: {
    transform: [{ scale: 0.65 }],
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    fontFamily: mono,
  },
  textWhite: {
    color: "#ffffff",
  },
  copiedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: "#dcfce7",
  },
  copiedBadgeDark: {
    backgroundColor: "#064e3b",
  },
  copiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16a34a",
    fontFamily: mono,
  },
  content: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    marginLeft: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  contentLight: {
    borderLeftColor: "#e5e7eb",
  },
  contentDark: {
    borderLeftColor: "#333333",
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    color: "#525252",
    fontStyle: "italic",
    fontFamily: mono,
  },
  textDark: {
    color: "#a3a3a3",
  },
})

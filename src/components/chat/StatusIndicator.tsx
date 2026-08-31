import { memo, useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, Animated, Platform } from "react-native"
import { useTranslation } from "react-i18next"
import { useEvents } from "../../stores/events"
import { useSessions } from "../../stores/sessions"

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

interface Props {
  sessionID: string
  isDark: boolean
}

export const StatusIndicator = memo(function StatusIndicator({ sessionID, isDark }: Props) {
  const { t } = useTranslation()
  const status = useEvents((s) => s.sessionStatus[sessionID])
  const text = useEvents((s) => s.statusText[sessionID])
  const optimistic = useSessions((s) => s.sending[sessionID])

  const [elapsedSec, setElapsedSec] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const pulseAnim = useRef(new Animated.Value(0.4)).current

  const sseBusy = status && status.type !== "idle"
  const busy = sseBusy || (optimistic && !status)

  useEffect(() => {
    if (!busy) {
      setElapsedSec(0)
      return
    }

    startTimeRef.current = Date.now()
    setElapsedSec(0)

    const interval = setInterval(() => {
      setElapsedSec(Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)))
    }, 1000)

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()

    return () => {
      clearInterval(interval)
      loop.stop()
    }
  }, [busy, pulseAnim])

  if (!busy) return null

  const rawLabel =
    status?.type === "retry"
      ? t("chat.statusIndicator.retrying", { attempt: status.attempt })
      : text || t("chat.statusIndicator.working", "Working")

  const cleanLabel = rawLabel.replace(/\.+$/, "")
  const durationStr = elapsedSec > 0 ? ` (${elapsedSec}s)` : "..."

  return (
    <View style={[s.container, isDark ? s.containerDark : s.containerLight]}>
      <Animated.View style={[s.dotsWrap, { opacity: pulseAnim }]}>
        <View style={[s.dot, isDark ? s.dotDark : s.dotLight]} />
        <View style={[s.dot, isDark ? s.dotDark : s.dotLight, { opacity: 0.8 }]} />
        <View style={[s.dot, isDark ? s.dotDark : s.dotLight, { opacity: 0.6 }]} />
      </Animated.View>
      <Text style={[s.text, isDark && s.textDark]} numberOfLines={1}>
        {cleanLabel}{durationStr}
      </Text>
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  containerLight: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  containerDark: {
    backgroundColor: "#161616",
    borderColor: "#262626",
  },
  dotsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotLight: {
    backgroundColor: "#0a0a0a",
  },
  dotDark: {
    backgroundColor: "#ffffff",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    fontFamily: mono,
  },
  textDark: {
    color: "#d1d5db",
  },
})

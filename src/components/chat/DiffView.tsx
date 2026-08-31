import { memo, useMemo, useCallback } from "react"
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity, Alert } from "react-native"
import * as Clipboard from "expo-clipboard"
import { WIDE_CONTENT_SCROLL_CONFIG } from "../../lib/scroll-config"
import { computeDiff, parsePatchDiff, type DiffLine } from "./diff-compute"

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

interface Props {
  before?: string
  after?: string
  patch?: string
  isDark: boolean
  onLinePress?: (line: DiffLine, idx: number) => void
}

export const DiffView = memo(function DiffView({ before = "", after = "", patch, isDark, onLinePress }: Props) {
  const lines = useMemo(() => {
    if (patch) return parsePatchDiff(patch)
    return computeDiff(before, after)
  }, [before, after, patch])

  const handleLineTap = useCallback(
    async (line: DiffLine, idx: number) => {
      if (onLinePress) {
        onLinePress(line, idx)
        return
      }
      // Default: copy line text to clipboard
      await Clipboard.setStringAsync(line.text)
    },
    [onLinePress],
  )

  if (lines.length === 0) return null

  return (
    <View style={[s.container, isDark && s.containerDark]}>
      <ScrollView {...WIDE_CONTENT_SCROLL_CONFIG} testID="diff-view-scroll">
        <View>
          {lines.map((line, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => handleLineTap(line, idx)}
              style={[
                s.line,
                line.type === "add" && (isDark ? s.addDark : s.add),
                line.type === "remove" && (isDark ? s.removeDark : s.remove),
              ]}
            >
              <Text style={[s.prefix, isDark && s.prefixDark]}>
                {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
              </Text>
              <Text
                style={[
                  s.text,
                  isDark && s.textDark,
                  line.type === "add" && s.addText,
                  line.type === "remove" && s.removeText,
                ]}
                selectable
              >
                {line.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f8f8f8",
    marginTop: 6,
  },
  containerDark: { backgroundColor: "#1a1a1a" },

  line: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  add: { backgroundColor: "#dcfce7" },
  addDark: { backgroundColor: "#052e16" },
  remove: { backgroundColor: "#fee2e2" },
  removeDark: { backgroundColor: "#2a0a0a" },

  prefix: {
    width: 16,
    fontSize: 12,
    fontFamily: mono,
    color: "#999999",
    lineHeight: 20,
  },
  prefixDark: { color: "#666666" },

  text: {
    fontSize: 12,
    fontFamily: mono,
    color: "#0a0a0a",
    lineHeight: 20,
  },
  textDark: { color: "#e5e5e5" },
  addText: { color: "#16a34a" },
  removeText: { color: "#dc2626" },
})

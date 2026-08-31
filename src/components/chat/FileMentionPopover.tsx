import { useState, useEffect, useMemo, memo } from "react"
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { Client, FileEntry } from "../../lib/sdk"

interface Props {
  query: string
  client: Client | null
  directory?: string | null
  isDark: boolean
  onSelect: (filePath: string) => void
}

export const FileMentionPopover = memo(function FileMentionPopover({
  query,
  client,
  isDark,
  onSelect,
}: Props) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!client) return
    let active = true
    setLoading(true)

    // Fetch immediate files and subdirectories from workspace root
    client.file
      .list({ path: "." })
      .then((entries) => {
        if (active) {
          setFiles(entries)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setFiles([])
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [client])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return files.slice(0, 15)
    return files
      .filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 15)
  }, [files, query])

  if (!loading && filtered.length === 0) return null

  return (
    <View style={[s.popover, isDark && s.popoverDark]}>
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#0a0a0a"} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="always" style={s.scroll} bounces={false}>
          {filtered.map((item) => {
            const isDir = item.type === "directory"
            return (
              <TouchableOpacity
                key={item.path}
                style={[s.item, isDark && s.itemDark]}
                onPress={() => onSelect(item.path)}
                activeOpacity={0.7}
              >
                <View style={[s.iconBox, isDark && s.iconBoxDark]}>
                  <Ionicons
                    name={isDir ? "folder-outline" : "document-text-outline"}
                    size={14}
                    color={isDark ? "#ffffff" : "#0a0a0a"}
                  />
                </View>
                <View style={s.textRow}>
                  <Text style={[s.fileName, isDark && s.textWhite]} numberOfLines={1}>
                    @{item.name}
                  </Text>
                  {item.path !== item.name && (
                    <Text style={[s.filePath, isDark && s.metaDark]} numberOfLines={1}>
                      {item.path}
                    </Text>
                  )}
                </View>
                {isDir && (
                  <View style={[s.dirBadge, isDark && s.dirBadgeDark]}>
                    <Text style={[s.dirBadgeText, isDark && s.dirBadgeTextDark]}>dir</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
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
  loadingContainer: {
    paddingVertical: 12,
    alignItems: "center",
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
  fileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  filePath: {
    fontSize: 11,
    color: "#3b82f6",
    flex: 1,
  },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#60a5fa" },
  dirBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
  },
  dirBadgeDark: {
    backgroundColor: "#262626",
  },
  dirBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
  },
  dirBadgeTextDark: {
    color: "#888888",
  },
})

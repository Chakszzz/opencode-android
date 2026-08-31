import { useState, useMemo, memo, useCallback, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Keyboard,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import type { Part } from "../../lib/sdk"
import type { TodoItem } from "./TodoSheet"
import { extractTodosFromParts } from "./todo-extract"

interface Props {
  parts: Record<string, Part[]>
  isDark: boolean
  onOpenSheet: () => void
}

export const TodoDock = memo(function TodoDock({ parts, isDark, onOpenSheet }: Props) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  // Automatically collapse TodoDock when keyboard opens to preserve screen space
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setCollapsed(true)
    })
    return () => {
      showSub.remove()
    }
  }, [])

  const todos = useMemo(() => extractTodosFromParts(parts), [parts])

  const counts = useMemo(() => {
    const total = todos.length
    const completed = todos.filter((x) => x.status === "completed").length
    const inProgress = todos.filter((x) => x.status === "in_progress").length
    const pending = todos.filter((x) => x.status === "pending").length
    return { total, completed, inProgress, pending }
  }, [todos])

  const activeTodo = useMemo(() => {
    return (
      todos.find((x) => x.status === "in_progress") ||
      todos.find((x) => x.status === "pending") ||
      todos[todos.length - 1]
    )
  }, [todos])

  const toggleCollapse = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCollapsed((prev) => !prev)
  }, [])

  if (todos.length === 0) return null

  const isAllDone = counts.completed === counts.total && counts.total > 0

  return (
    <View style={[s.container, isDark && s.containerDark]}>
      {/* Header Bar */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={toggleCollapse}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <View style={[s.iconBox, isAllDone && s.iconBoxDone, isDark && s.iconBoxDark]}>
            <Ionicons
              name={isAllDone ? "checkmark-done" : "checkbox-outline"}
              size={15}
              color={isAllDone ? "#22c55e" : isDark ? "#ffffff" : "#0a0a0a"}
            />
          </View>

          <View style={[s.countBadge, isDark && s.countBadgeDark]}>
            <Text style={[s.countText, isDark && s.textWhite]}>
              {counts.completed}/{counts.total}
            </Text>
          </View>

          {activeTodo && (
            <Text
              style={[
                s.previewText,
                isDark && s.textWhite,
                activeTodo.status === "completed" && s.strikethrough,
              ]}
              numberOfLines={1}
            >
              {activeTodo.content}
            </Text>
          )}
        </View>

        <View style={s.headerRight}>
          <TouchableOpacity onPress={onOpenSheet} style={s.expandIconBtn}>
            <Ionicons
              name="open-outline"
              size={15}
              color={isDark ? "#888888" : "#666666"}
            />
          </TouchableOpacity>
          <Ionicons
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={16}
            color={isDark ? "#888888" : "#666666"}
          />
        </View>
      </TouchableOpacity>

      {/* Expandable Task List */}
      {!collapsed && (
        <View style={[s.listContainer, isDark && s.listContainerDark]}>
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={s.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {todos.map((item, index) => {
              const isCompleted = item.status === "completed"
              const isInProgress = item.status === "in_progress"
              const isCancelled = item.status === "cancelled"

              return (
                <View key={item.id || `todo-${index}`} style={s.todoRow}>
                  <View style={s.todoIconBox}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    ) : isInProgress ? (
                      <View style={[s.inProgressDot, isDark && s.inProgressDotDark]} />
                    ) : isCancelled ? (
                      <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                    ) : (
                      <Ionicons
                        name="ellipse-outline"
                        size={15}
                        color={isDark ? "#666666" : "#aaaaaa"}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      s.todoText,
                      isDark && s.textWhite,
                      (isCompleted || isCancelled) && s.todoTextCompleted,
                      isInProgress && s.todoTextInProgress,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  containerDark: {
    backgroundColor: "#161616",
    borderColor: "#262626",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
  iconBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxDark: {
    backgroundColor: "#222222",
  },
  iconBoxDone: {
    backgroundColor: "#dcfce7",
  },
  countBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countBadgeDark: {
    backgroundColor: "#2a2a2a",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  previewText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#4b5563",
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandIconBtn: {
    padding: 2,
  },

  // List
  listContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    maxHeight: 160,
  },
  listContainerDark: {
    borderTopColor: "#262626",
    backgroundColor: "#111111",
  },
  scrollView: {
    maxHeight: 160,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  todoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  todoIconBox: {
    marginTop: 2,
  },
  inProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0a0a0a",
    marginHorizontal: 4,
    marginTop: 4,
  },
  inProgressDotDark: {
    backgroundColor: "#ffffff",
  },
  todoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#0a0a0a",
  },
  todoTextCompleted: {
    textDecorationLine: "line-through",
    color: "#888888",
  },
  todoTextInProgress: {
    fontWeight: "600",
  },
  textWhite: {
    color: "#ffffff",
  },
})

import { useState, useMemo, memo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"
import type { Part } from "../../lib/sdk"

export interface TodoItem {
  id?: string
  content: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority?: "low" | "medium" | "high"
}

interface Props {
  parts: Record<string, Part[]>
  isDark: boolean
  sheetRef: React.RefObject<BottomSheet | null>
}

export const TodoSheet = memo(function TodoSheet({ parts, isDark, sheetRef }: Props) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")

  // Extract latest todos from todowrite tool parts in conversation history
  const todos = useMemo<TodoItem[]>(() => {
    let latestTodos: TodoItem[] = []
    const allParts: Part[] = Object.values(parts).flat()

    for (const part of allParts) {
      if (part.type === "tool" && part.tool === "todowrite") {
        const input = part.state?.input as { todos?: TodoItem[] } | undefined
        const output = part.state?.output
        const metadata = (part.state as any)?.metadata as { todos?: TodoItem[] } | undefined

        if (Array.isArray(metadata?.todos)) {
          latestTodos = metadata.todos
        } else if (Array.isArray(input?.todos)) {
          latestTodos = input.todos
        } else if (typeof output === "string") {
          try {
            const parsed = JSON.parse(output)
            if (Array.isArray(parsed)) latestTodos = parsed
          } catch {}
        }
      }
    }

    return latestTodos
  }, [parts])

  const counts = useMemo(() => {
    const total = todos.length
    const completed = todos.filter((x) => x.status === "completed").length
    const inProgress = todos.filter((x) => x.status === "in_progress").length
    const pending = todos.filter((x) => x.status === "pending").length
    return { total, completed, inProgress, pending }
  }, [todos])

  const filteredTodos = useMemo(() => {
    if (filter === "completed") return todos.filter((x) => x.status === "completed")
    if (filter === "active") return todos.filter((x) => x.status !== "completed")
    return todos
  }, [todos, filter])

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["60%", "85%"]}
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
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Ionicons name="checkbox-outline" size={20} color={isDark ? "#ffffff" : "#0a0a0a"} />
            <Text style={[s.headerTitle, isDark && s.textWhite]}>
              {t("chat.todo.title", "Tasks & Todos")}
            </Text>
            {counts.total > 0 && (
              <View style={[s.countBadge, isDark && s.countBadgeDark]}>
                <Text style={[s.countBadgeText, isDark && s.textWhite]}>
                  {counts.completed}/{counts.total}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => sheetRef.current?.close()} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={isDark ? "#888888" : "#666666"} />
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={[s.filterBar, isDark && s.filterBarDark]}>
          <TouchableOpacity
            style={[s.filterPill, filter === "all" && (isDark ? s.filterPillActiveDark : s.filterPillActive)]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                s.filterPillText,
                filter === "all" && (isDark ? s.filterPillTextActiveDark : s.filterPillTextActive),
              ]}
            >
              All ({counts.total})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.filterPill, filter === "active" && (isDark ? s.filterPillActiveDark : s.filterPillActive)]}
            onPress={() => setFilter("active")}
          >
            <Text
              style={[
                s.filterPillText,
                filter === "active" && (isDark ? s.filterPillTextActiveDark : s.filterPillTextActive),
              ]}
            >
              Active ({counts.inProgress + counts.pending})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.filterPill, filter === "completed" && (isDark ? s.filterPillActiveDark : s.filterPillActive)]}
            onPress={() => setFilter("completed")}
          >
            <Text
              style={[
                s.filterPillText,
                filter === "completed" && (isDark ? s.filterPillTextActiveDark : s.filterPillTextActive),
              ]}
            >
              Completed ({counts.completed})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {filteredTodos.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="clipboard-outline" size={42} color={isDark ? "#444444" : "#cccccc"} />
            <Text style={[s.emptyTitle, isDark && s.textWhite]}>
              {todos.length === 0 ? t("chat.todo.emptyTitle", "No tasks tracked yet") : t("chat.todo.noMatch", "No matching tasks")}
            </Text>
            <Text style={[s.emptyDesc, isDark && s.metaDark]}>
              {todos.length === 0
                ? t("chat.todo.emptyDesc", "OpenCode creates and tracks task checklists automatically when planning complex changes.")
                : ""}
            </Text>
          </View>
        ) : (
          <BottomSheetFlatList<TodoItem>
            data={filteredTodos}
            keyExtractor={(_item: TodoItem, index: number) => String(index)}
            contentContainerStyle={s.list}
            renderItem={({ item }: { item: TodoItem }) => {
              const isDone = item.status === "completed"
              const isRunning = item.status === "in_progress"

              return (
                <View style={[s.todoItem, isDark && s.todoItemDark, isDone && s.todoItemDone]}>
                  <View style={s.iconWrapper}>
                    {isDone ? (
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    ) : isRunning ? (
                      <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#0a0a0a"} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={isDark ? "#666666" : "#999999"} />
                    )}
                  </View>
                  <View style={s.textWrapper}>
                    <Text
                      style={[
                        s.todoText,
                        isDark && s.textWhite,
                        isDone && s.todoTextDone,
                      ]}
                    >
                      {item.content}
                    </Text>
                    {item.priority && item.priority !== "medium" && (
                      <View style={[s.priorityBadge, isDark && s.priorityBadgeDark]}>
                        <Text style={[s.priorityText, isDark && s.metaDark]}>
                          {item.priority}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            }}
          />
        )}
      </View>
    </BottomSheet>
  )
})

const s = StyleSheet.create({
  sheet: { backgroundColor: "#ffffff" },
  sheetDark: { backgroundColor: "#141414" },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  countBadgeDark: {
    backgroundColor: "#262626",
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  closeBtn: {
    padding: 4,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterBarDark: {
    borderBottomColor: "#222222",
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
  },
  filterPillActive: {
    backgroundColor: "#0a0a0a",
  },
  filterPillActiveDark: {
    backgroundColor: "#ffffff",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666666",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  filterPillTextActiveDark: {
    color: "#0a0a0a",
  },
  list: {
    paddingVertical: 10,
    gap: 8,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eeeeee",
    gap: 10,
  },
  todoItemDark: {
    backgroundColor: "#1c1c1c",
    borderColor: "#262626",
  },
  todoItemDone: {
    opacity: 0.65,
  },
  iconWrapper: {
    paddingTop: 1,
  },
  textWrapper: {
    flex: 1,
    gap: 4,
  },
  todoText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#0a0a0a",
  },
  todoTextDone: {
    textDecorationLine: "line-through",
    color: "#888888",
  },
  priorityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "#eeeeee",
  },
  priorityBadgeDark: {
    backgroundColor: "#2a2a2a",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    lineHeight: 17,
  },
  textWhite: { color: "#ffffff" },
  metaDark: { color: "#888888" },
})

import { useMemo, isValidElement, cloneElement, memo, type ReactNode } from "react"
import { View, Text, useColorScheme, Platform, type StyleProp, type ViewStyle, type TextStyle } from "react-native"
import { useMarkdown, Renderer } from "react-native-marked"
import { CodeBlock } from "./CodeBlock"

// react-native-marked's base Renderer hardcodes `selectable` on every plain
// text node it produces (text/strong/em/del/heading/codespan). On Android,
// selectable <Text> nested inside a FlatList row has a long-standing,
// still-unresolved RN bug (facebook/react-native#46999, a reopened
// regression of #28952's fix) where the underlying view's selectable state
// — and, per our own diff-scroll flow (issue #104), its exposure to the
// accessibility tree Maestro/UiAutomator reads from — never gets applied
// correctly. Chat messages here are rendered as rows of the session screen's
// own FlatList (app/session/[id].tsx), so every markdown text node hits
// this. Code content is still copyable via CodeBlock's explicit Copy
// button, so dropping `selectable` on plain text costs little.
class CustomRenderer extends Renderer {
  private plainText(children: string | ReactNode[], styles?: StyleProp<TextStyle>): ReactNode {
    return (
      <Text key={this.getKey()} style={styles}>
        {children}
      </Text>
    )
  }

  code(text: string, language?: string, containerStyle?: ViewStyle, _textStyle?: TextStyle) {
    return (
      <View key={this.getKey()} style={containerStyle}>
        <CodeBlock code={text} language={language} />
      </View>
    )
  }

  text(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(text, styles)
  }

  strong(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(children, styles)
  }

  em(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(children, styles)
  }

  del(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(children, styles)
  }

  heading(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(text, styles)
  }

  codespan(text: string, styles?: TextStyle): ReactNode {
    return this.plainText(text, [styles, { fontStyle: "normal", fontWeight: "normal" }])
  }
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

const lightTheme = {
  text: { color: "#0a0a0a", fontSize: 15, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  h1: { fontSize: 21, fontWeight: "700" as const, color: "#0a0a0a", marginBottom: 8, marginTop: 12, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: "600" as const, color: "#0a0a0a", marginBottom: 6, marginTop: 10, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: "600" as const, color: "#0a0a0a", marginBottom: 4, marginTop: 8 },
  link: { color: "#0969da", textDecorationLine: "none" as const },
  blockquote: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderLeftWidth: 3,
    borderLeftColor: "#d4d4d8",
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 6,
    borderRadius: 2,
  },
  code: {
    backgroundColor: "#f4f4f5",
    color: "#18181b",
    fontFamily: mono,
    fontSize: 13,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  codespan: {
    backgroundColor: "#f4f4f5",
    color: "#18181b",
    fontFamily: mono,
    fontSize: 13,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  list: { marginBottom: 6 },
  li: { marginBottom: 3 },
  hr: { backgroundColor: "#e4e4e7", height: 1, marginVertical: 12 },
  strong: { fontWeight: "700" as const },
  em: { fontStyle: "italic" as const },
  strikethrough: { textDecorationLine: "line-through" as const },
  image: { borderRadius: 8 },
}

const darkTheme = {
  ...lightTheme,
  text: { ...lightTheme.text, color: "#f4f4f5" },
  h1: { ...lightTheme.h1, color: "#ffffff" },
  h2: { ...lightTheme.h2, color: "#ffffff" },
  h3: { ...lightTheme.h3, color: "#ffffff" },
  link: { color: "#58a6ff", textDecorationLine: "none" as const },
  blockquote: {
    ...lightTheme.blockquote,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderLeftColor: "#3f3f46",
  },
  code: {
    ...lightTheme.code,
    backgroundColor: "#18181b",
    color: "#f4f4f5",
    borderColor: "#27272a",
  },
  codespan: {
    ...lightTheme.codespan,
    backgroundColor: "#18181b",
    color: "#f4f4f5",
    borderColor: "#27272a",
  },
  hr: { ...lightTheme.hr, backgroundColor: "#27272a" },
}

interface Props {
  children: string
}

export const Markdown = memo(
  function Markdown({ children }: Props) {
    const isDark = useColorScheme() === "dark"
    const theme = isDark ? darkTheme : lightTheme
    const content = children ?? ""

    // A module-scope singleton renderer would share one CustomRenderer (and
    // its underlying github-slugger) across every Markdown instance and every
    // streamed token forever. github-slugger never resets, so its heading-slug
    // keys only ever climb — which fed into useMarkdown's memoized parser and
    // made the emitted React keys change on every token, remounting the whole
    // subtree (resetting code-block scroll position, flashing content). Scoping
    // the renderer to `children` resets the slugger per parse, so keys are
    // deterministic (and stable) for a given value, while re-renders with an
    // unchanged value stay memoized instead of creating a new renderer.
    const renderer = useMemo(() => new CustomRenderer(), [content])

    // react-native-marked's default <RNMarkdown> export renders blocks inside a
    // FlatList. Chat messages are rendered inside app/session/[id].tsx's own
    // *inverted* FlatList (each row a MessageBubble) — nesting one
    // VirtualizedList inside another, especially an inverted one, is a known
    // React Native footgun where the inner list's content can fail to lay out
    // (renders zero height) instead of just warning. We already force
    // scrollEnabled: false and a large initialNumToRender here, which defeats
    // virtualization anyway, so there's nothing to lose by rendering the parsed
    // blocks directly with the useMarkdown hook instead (issue #104).
    const elements = useMarkdown(content, {
      renderer,
      styles: theme,
      colorScheme: isDark ? "dark" : "light",
    })

    if (!content.trim()) return null

    return (
      <View style={{ backgroundColor: "transparent" }}>
        {elements.map((el, i) =>
          // react-native-marked returns block elements that already have keys
          // from the slugger, but React warns about missing keys at the array
          // level. cloneElement injects a stable index key without adding an
          // extra View layout node that would affect paragraph spacing.
          // eslint-disable-next-line react/no-array-index-key
          isValidElement(el) ? cloneElement(el, { key: i }) : el
        )}
      </View>
    )
  },
  (prev, next) => prev.children === next.children,
)

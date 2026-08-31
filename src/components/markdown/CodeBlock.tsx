import { useState, useMemo, useCallback, memo } from "react"
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Platform, ScrollView } from "react-native"
import * as Clipboard from "expo-clipboard"
import { WIDE_CONTENT_SCROLL_CONFIG } from "../../lib/scroll-config"

interface Props {
  code: string
  language?: string
}

type TokenType =
  | "comment"
  | "string"
  | "keyword"
  | "number"
  | "function"
  | "operator"
  | "tag"
  | "plain"

interface Token {
  type: TokenType
  value: string
}

const KEYWORDS = new Set<string>([
  // JS/TS
  "if", "else", "for", "while", "do", "return", "function", "const", "let",
  "var", "class", "extends", "import", "export", "new", "this", "async",
  "await", "try", "catch", "finally", "throw", "true", "false", "null",
  "undefined", "super", "yield", "break", "continue", "default", "case",
  "switch", "instanceof", "typeof", "void", "delete", "in", "of", "as",
  "enum", "interface", "type", "namespace", "module", "private", "public",
  "protected", "static", "abstract", "implements", "readonly", "declare",
  // Python
  "def", "self", "lambda", "print", "elif", "except", "pass", "global",
  "nonlocal", "with", "None", "True", "False", "is", "not", "and", "or",
  "raise", "from", "import",
  // Shell / Bash
  "echo", "local", "then", "fi", "done", "esac", "source", "set", "unset",
  "chmod", "chown", "mkdir", "cd", "rm", "cp", "mv",
  // Go
  "func", "struct", "package", "chan", "defer", "map", "select", "go",
  "range", "var", "const", "type", "interface", "nil",
  // Rust
  "fn", "mut", "impl", "trait", "match", "move", "ref", "pub", "use",
  "struct", "enum", "crate", "self", "Self", "mod", "where",
  // SQL
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "UPDATE", "DELETE", "JOIN",
  "LEFT", "RIGHT", "INNER", "OUTER", "CREATE", "TABLE", "DROP", "ALTER",
  "GROUP", "ORDER", "BY", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL",
  "select", "from", "where", "insert", "into", "update", "delete", "join",
])

function tokenize(code: string, _language?: string): Token[] {
  const tokens: Token[] = []
  let pos = 0

  const patterns: { type: TokenType; regex: RegExp }[] = [
    { type: "comment", regex: /^\/\*[\s\S]*?\*\/|^\/\/.*$|^#.*$/ },
    { type: "string", regex: /^`(?:[^`\\]|\\.)*`|^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
    { type: "number", regex: /^\b(?:\d+\.?\d*|0x[0-9a-fA-F]+)(?:[eE][+-]?\d+)?\b/ },
    { type: "operator", regex: /^(?:===|==|!==|!=|=>|<=|>=|&&|\|\||\+\+|\-\-|\*\*|<<|>>|[+\-*/%<>=!&|^~]=?)/ },
    { type: "tag", regex: /^<\/?[\w-]+(?:\s[^>]*)?>/ },
    { type: "keyword", regex: /^[a-zA-Z_]\w*/ },
  ]

  while (pos < code.length) {
    let matched = false

    for (const { type, regex } of patterns) {
      const m = code.slice(pos).match(regex)
      if (m) {
        const value = m[0]
        if (type === "keyword" && KEYWORDS.has(value)) {
          tokens.push({ type: "keyword", value })
        } else if (type === "keyword") {
          // Check if it's a function call: identifier followed by (
          const nextIdx = pos + value.length
          const nextChar = code[nextIdx]
          if (nextChar === "(") {
            tokens.push({ type: "function", value })
          } else {
            tokens.push({ type: "plain", value })
          }
        } else {
          tokens.push({ type, value })
        }
        pos += value.length
        matched = true
        break
      }
    }

    if (!matched) {
      tokens.push({ type: "plain", value: code[pos] })
      pos++
    }
  }

  return tokens
}

function renderTokens(tokens: Token[], isDark: boolean, baseStyle: any): any {
  const styleMap: Record<TokenType, any> = {
    comment: isDark ? styles.commentDark : styles.comment,
    string: isDark ? styles.stringDark : styles.string,
    keyword: isDark ? styles.keywordDark : styles.keyword,
    number: isDark ? styles.numberDark : styles.number,
    function: isDark ? styles.functionDark : styles.function,
    operator: isDark ? styles.operatorDark : styles.operator,
    tag: isDark ? styles.tagDark : styles.tag,
    plain: isDark ? styles.codeDark : styles.code,
  }

  return tokens.map((token, i) => {
    const style = token.type === "plain" ? baseStyle : [baseStyle, styleMap[token.type]]
    return (
      <Text key={i} style={style}>
        {token.value}
      </Text>
    )
  })
}

export const CodeBlock = memo(function CodeBlock({ code, language }: Props) {
  const isDark = useColorScheme() === "dark"
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [code])

  const lines = useMemo(() => code.split("\n"), [code])
  const showLineNumbers = lines.length > 1
  const gutterWidth = lines.length >= 100 ? 32 : lines.length >= 10 ? 24 : 16
  const tokenizedLines = useMemo(() => lines.map((line) => tokenize(line, language)), [lines, language])

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.language, isDark && styles.languageDark]}>{language || "code"}</Text>
        <TouchableOpacity onPress={copy} hitSlop={8}>
          <Text style={[styles.copyBtn, isDark && styles.copyBtnDark]}>{copied ? "Copied!" : "Copy"}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView {...WIDE_CONTENT_SCROLL_CONFIG} testID="code-block-scroll" contentContainerStyle={styles.codeScroll}>
        <View style={styles.codeWrap}>
          {tokenizedLines.map((tokens, i) => (
            <View key={i} style={styles.lineRow}>
              {showLineNumbers && (
                <Text style={[styles.lineNumber, isDark && styles.lineNumberDark, { width: gutterWidth }]}>
                  {i + 1}
                </Text>
              )}
              <Text style={[styles.code, isDark && styles.codeDark]}>
                {renderTokens(tokens, isDark, [styles.code, isDark && styles.codeDark])}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
})

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6f8fa",
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e1e4e8",
    overflow: "hidden",
  },
  containerDark: {
    backgroundColor: "#161b22",
    borderColor: "#30363d",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#eaeef2",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
  },
  headerDark: {
    backgroundColor: "#21262d",
    borderBottomColor: "#30363d",
  },
  language: {
    fontSize: 11,
    fontWeight: "700",
    color: "#57606a",
    fontFamily: mono,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  languageDark: {
    color: "#8b949e",
  },
  copyBtn: {
    fontSize: 11,
    color: "#0969da",
    fontWeight: "600",
  },
  copyBtnDark: {
    color: "#58a6ff",
  },
  codeScroll: {
    padding: 10,
  },
  codeWrap: {
    flexDirection: "column",
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lineNumber: {
    fontFamily: mono,
    fontSize: 12,
    lineHeight: 20,
    color: "#8c959f",
    textAlign: "right",
    marginRight: 12,
    paddingRight: 4,
    borderRightWidth: 1,
    borderRightColor: "#e1e4e8",
  },
  lineNumberDark: {
    color: "#484f58",
    borderRightColor: "#30363d",
  },
  code: {
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 20,
    color: "#1f2328",
    flexShrink: 0,
  },
  codeDark: {
    color: "#e6edf3",
  },
  comment: { color: "#6e7781", fontStyle: "italic" },
  commentDark: { color: "#8b949e", fontStyle: "italic" },
  string: { color: "#0a7038" },
  stringDark: { color: "#7ee787" },
  keyword: { color: "#cf222e", fontWeight: "600" },
  keywordDark: { color: "#ff7b72", fontWeight: "600" },
  number: { color: "#0550ae" },
  numberDark: { color: "#79c0ff" },
  function: { color: "#0969da" },
  functionDark: { color: "#58a6ff" },
  operator: { color: "#cf222e" },
  operatorDark: { color: "#ff7b72" },
  tag: { color: "#0550ae" },
  tagDark: { color: "#7ee787" },
})

import { memo } from "react"
import { View, Text, StyleSheet, Platform } from "react-native"
import Svg, { Path } from "react-native-svg"

const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
})

/**
 * Authentic OpenCode CLI / TUI ASCII Wordmark.
 */
export const OPENCODE_ASCII_CLEAN = [
  "█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█",
  "█  █ █  █ █▀▀▀ █  █ █    █  █ █  █ █▀▀▀",
  "▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀",
]

export const OPENCODE_ASCII_TUI = [
  "                              ▄     ",
  "█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█",
  "█__█ █__█ █^^^ █__█ █___ █__█ █__█ █^^^",
  "▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀~~▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀",
]

interface MarkProps {
  size?: number
  isDark?: boolean
  color?: string
}

/**
 * Authentic OpenCode 'O' Icon (Vector SVG from official OpenCode brand asset).
 */
export const OpenCodeMark = memo(function OpenCodeMark({
  size = 20,
  isDark = false,
  color,
}: MarkProps) {
  const fillColor = color || (isDark ? "#ffffff" : "#0a0a0a")

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 6H8v12h8V6zm4 16H4V2h16v20z"
        fill={fillColor}
        fillRule="evenodd"
      />
    </Svg>
  )
})

interface WordmarkProps {
  height?: number
  isDark?: boolean
  color?: string
}

/**
 * Official vectorized OpenCode Typography / Wordmark.
 * Native SVG paths matching the exact opencode brand typography.
 */
export const OpenCodeWordmark = memo(function OpenCodeWordmark({
  height = 18,
  isDark = false,
  color,
}: WordmarkProps) {
  const fillColor = color || (isDark ? "#ffffff" : "#0a0a0a")
  // Aspect ratio is 138:24
  const width = (height * 138) / 24

  return (
    <Svg width={width} height={height} viewBox="0 0 138 24" fill={fillColor} fillRule="evenodd">
      <Path d="M12.429 17.143H5.57v-6.857h6.858v6.857z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M12.428 6.857H5.571v10.286h6.857V6.857zm3.43 13.715H2.142V3.429h13.714v17.143z" fillOpacity={isDark ? 0.9 : 0.75} />
      <Path d="M29.571 17.143h-6.857v-6.857h6.857v6.857z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M22.714 17.143h6.858V6.857h-6.858v10.286zM33 20.572H22.714V24h-3.428V3.43H33v17.143z" fillOpacity={isDark ? 0.9 : 0.75} />
      <Path d="M50.143 13.714v3.429H39.857v-3.429h10.286z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M50.143 13.714H39.857v3.429h10.286v3.429H36.429V3.429h13.714v10.285zm-10.286-3.428h6.857V6.857h-6.857v3.429z" fillOpacity={isDark ? 0.9 : 0.75} />
      <Path d="M63.857 20.571H57V10.286h6.857V20.57z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M63.857 6.857H57v13.715h-3.429V3.429h10.286v3.428zm3.429 13.715h-3.429V6.857h3.429v13.715z" fillOpacity={isDark ? 0.9 : 0.75} />
      <Path d="M84.428 17.143H74.144v-6.857h10.285v6.857z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M84.428 6.857H74.144v10.286h10.285v3.429H70.715V3.429H84.43v3.428z" />
      <Path d="M98.143 17.143h-6.857v-6.857h6.857v6.857z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M98.143 6.857h-6.857v10.286h6.857V6.857zm3.428 13.715H87.857V3.429h13.714v17.143z" />
      <Path d="M115.286 17.143h-6.857v-6.857h6.857v6.857z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M115.286 6.857h-6.857v10.286h6.857V6.857zm3.428 13.714H105V3.43h10.286V0h3.428v20.571z" />
      <Path d="M135.857 13.714v3.429h-10.286v-3.429h10.286z" fillOpacity={isDark ? 0.35 : 0.25} />
      <Path d="M125.571 6.857v3.429h6.858V6.857h-6.858zm10.286 6.857h-10.286v3.429h10.286v3.429h-13.714V3.429h13.714v10.285z" />
    </Svg>
  )
})

interface LogoProps {
  height?: number
  showBadge?: boolean
  badgeText?: string
  isDark?: boolean
}

/**
 * Complete Official OpenCode Logo:
 * Vectorized official typography + "Mobile" badge.
 */
export const OpenCodeLogo = memo(function OpenCodeLogo({
  height = 18,
  showBadge = true,
  badgeText = "Mobile",
  isDark = false,
}: LogoProps) {
  return (
    <View style={s.container}>
      <OpenCodeWordmark height={height} isDark={isDark} />
      {showBadge && (
        <View style={[s.badge, isDark ? s.badgeDark : s.badgeLight]}>
          <Text style={[s.badgeText, isDark && s.badgeTextDark]}>{badgeText}</Text>
        </View>
      )}
    </View>
  )
})

interface BannerProps {
  isDark?: boolean
  showMobileBadge?: boolean
  variant?: "tui" | "clean"
}

/**
 * Full ASCII OpenCode Wordmark Banner (from OpenCode CLI).
 */
export const OpenCodeAsciiBanner = memo(function OpenCodeAsciiBanner({
  isDark = false,
  showMobileBadge = true,
  variant = "clean",
}: BannerProps) {
  const color = isDark ? "#ffffff" : "#0a0a0a"
  const lines = variant === "tui" ? OPENCODE_ASCII_TUI : OPENCODE_ASCII_CLEAN

  return (
    <View style={s.bannerWrap}>
      <Text style={[s.bannerAscii, { color }]}>
        {lines.join("\n")}
      </Text>
      {showMobileBadge && (
        <View style={[s.badge, isDark ? s.badgeDark : s.badgeLight, { alignSelf: "center", marginTop: 10 }]}>
          <Text style={[s.badgeText, isDark && s.badgeTextDark]}>MOBILE</Text>
        </View>
      )}
    </View>
  )
})

interface HeroLogoProps {
  height?: number
  isDark?: boolean
  showBadge?: boolean
  badgeText?: string
}

/**
 * Centered, crisp Hero Logo for Empty States & Welcome Screens.
 * Uses official SVG Vector paths rather than platform-dependent monospace ASCII fonts.
 */
export const OpenCodeHeroLogo = memo(function OpenCodeHeroLogo({
  height = 36,
  isDark = false,
  showBadge = true,
  badgeText = "MOBILE",
}: HeroLogoProps) {
  return (
    <View style={s.heroWrap}>
      <OpenCodeWordmark height={height} isDark={isDark} />
      {showBadge && (
        <View style={[s.badge, isDark ? s.badgeDark : s.badgeLight, { marginTop: 12 }]}>
          <Text style={[s.badgeText, isDark && s.badgeTextDark]}>{badgeText}</Text>
        </View>
      )}
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  bannerWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  bannerAscii: {
    fontFamily: monoFont,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeLight: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  badgeDark: {
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontFamily: monoFont,
  },
  badgeTextDark: {
    color: "#9ca3af",
  },
})


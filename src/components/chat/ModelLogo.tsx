import { memo } from "react"
import { View, StyleSheet } from "react-native"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { getProviderBrand } from "./model-brand"
import { OpenCodeMark } from "../OpenCodeLogo"

export interface ModelLogoProps {
  providerID?: string
  modelID?: string
  size?: number
  isDark?: boolean
}

export const ModelLogo = memo(function ModelLogo({
  providerID,
  modelID,
  size = 18,
  isDark = false,
}: ModelLogoProps) {
  const brand = getProviderBrand(providerID, modelID)
  const iconColor = isDark ? "#ffffff" : "#0a0a0a"

  if (brand.label === "OpenCode") {
    return (
      <View
        style={[
          s.container,
          { width: size + 8, height: size + 8 },
          isDark ? s.containerDark : s.containerLight,
        ]}
      >
        <OpenCodeMark size={size} isDark={isDark} />
      </View>
    )
  }

  return (
    <View
      style={[
        s.container,
        { width: size + 8, height: size + 8 },
        isDark ? s.containerDark : s.containerLight,
      ]}
    >
      {brand.iconType === "mci" ? (
        <MaterialCommunityIcons name={brand.iconName} size={size} color={iconColor} />
      ) : (
        <Ionicons name={brand.iconName} size={size} color={iconColor} />
      )}
    </View>
  )
})

const s = StyleSheet.create({
  container: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  containerLight: {
    backgroundColor: "#f0f0f0",
  },
  containerDark: {
    backgroundColor: "#222222",
  },
})

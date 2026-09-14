import { Linking } from "react-native"
import * as WebBrowser from "expo-web-browser"
import { useSettings } from "../stores/settings"

export type LinkOpenMode = "inApp" | "external"

export async function openLink(url: string, mode?: LinkOpenMode): Promise<void> {
  if (!url) return
  let target = url.trim()
  if (!target) return

  // Basic validation – require http/https
  const isHttp = /^https?:\/\//i.test(target)
  if (!isHttp) {
    // Allow mailto, tel etc to go via Linking directly
    try {
      await Linking.openURL(target)
    } catch (e) {
      console.warn("openLink: failed to open url", target, e)
    }
    return
  }

  // Resolve mode from settings store if not explicitly provided
  let resolved: LinkOpenMode = mode ?? "inApp"
  if (!mode) {
    try {
      const stored = useSettings.getState().linkOpenMode as LinkOpenMode | undefined
      if (stored === "inApp" || stored === "external") resolved = stored
    } catch {
      // fallback to default
    }
  }

  if (resolved === "external") {
    try {
      await Linking.openURL(target)
    } catch (e) {
      console.warn("openLink external failed", target, e)
    }
    return
  }

  // inApp – try WebBrowser, fallback to Linking
  try {
    await WebBrowser.openBrowserAsync(target, {
      // Use system chrome custom tab on Android, SFSafariVC on iOS
      // Keep toolbar light/dark neutral – system handles it.
      // Dismiss button stays default.
      enableBarCollapsing: true,
    } as WebBrowser.WebBrowserOpenOptions)
  } catch (e) {
    console.warn("openLink inApp failed, falling back to external", e)
    try {
      await Linking.openURL(target)
    } catch (err) {
      console.warn("openLink fallback failed", target, err)
    }
  }
}

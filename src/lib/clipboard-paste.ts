import * as Clipboard from "expo-clipboard"

export interface PasteContent {
  image?: { uri: string; width: number; height: number }
  text?: string
  error?: string
}

export async function readClipboardContent(
  currentAttachmentsCount = 0,
  maxAttachments = 10,
): Promise<PasteContent> {
  try {
    const hasImage = await Clipboard.hasImageAsync()
    if (hasImage) {
      if (currentAttachmentsCount >= maxAttachments) {
        return { error: `You can attach up to ${maxAttachments} images per message.` }
      }
      const img = await Clipboard.getImageAsync({ format: "png" })
      if (img?.data) {
        const uri = img.data.startsWith("data:") ? img.data : `data:image/png;base64,${img.data}`
        return {
          image: {
            uri,
            width: img.size?.width || 800,
            height: img.size?.height || 600,
          },
        }
      }
    }

    const hasText = await Clipboard.hasStringAsync()
    if (hasText) {
      const text = await Clipboard.getStringAsync()
      if (text && text.length > 0) {
        return { text }
      }
    }

    return { error: "Clipboard is empty or contains unsupported content." }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to read clipboard." }
  }
}

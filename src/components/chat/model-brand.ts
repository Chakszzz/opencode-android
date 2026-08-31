export type ProviderBrand = {
  iconType: "mci" | "ion"
  iconName: string
  label: string
}

export function getProviderBrand(providerID = "", modelID = ""): ProviderBrand {
  const p = providerID.toLowerCase()
  const m = modelID.toLowerCase()

  if (m.includes("claude") || p.includes("anthropic")) {
    return { iconType: "mci", iconName: "star-three-points-outline", label: "Anthropic" }
  }
  if (m.includes("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || p.includes("openai")) {
    return { iconType: "mci", iconName: "creation-outline", label: "OpenAI" }
  }
  if (m.includes("gemini") || m.includes("gemma") || p.includes("google")) {
    return { iconType: "mci", iconName: "google", label: "Google" }
  }
  if (m.includes("deepseek") || p.includes("deepseek")) {
    return { iconType: "mci", iconName: "water-outline", label: "DeepSeek" }
  }
  if (m.includes("llama") || p.includes("meta")) {
    return { iconType: "mci", iconName: "infinity", label: "Meta" }
  }
  if (
    m.includes("codestral") ||
    m.includes("mixtral") ||
    m.includes("devstral") ||
    m.includes("ministral") ||
    m.includes("mistral") ||
    p.includes("mistral")
  ) {
    return { iconType: "mci", iconName: "weather-windy", label: "Mistral" }
  }
  if (m.includes("qwen") || p.includes("qwen")) {
    return { iconType: "mci", iconName: "cloud-outline", label: "Qwen" }
  }
  if (p.includes("github") || p.includes("copilot")) {
    return { iconType: "mci", iconName: "github", label: "GitHub" }
  }
  if (p.includes("ollama")) {
    return { iconType: "mci", iconName: "server-network", label: "Ollama" }
  }
  if (p.includes("groq")) {
    return { iconType: "mci", iconName: "lightning-bolt-outline", label: "Groq" }
  }
  if (p.includes("openrouter")) {
    return { iconType: "mci", iconName: "transit-connection-variant", label: "OpenRouter" }
  }
  if (p.includes("neosantara") || m.includes("neosantara")) {
    return { iconType: "mci", iconName: "island", label: "Neosantara" }
  }
  if (p.includes("opencode") || m.includes("opencode")) {
    return { iconType: "mci", iconName: "code-braces", label: "OpenCode" }
  }

  return { iconType: "ion", iconName: "hardware-chip-outline", label: "AI" }
}

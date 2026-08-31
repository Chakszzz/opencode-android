import { test } from "node:test"
import assert from "node:assert/strict"
import { getProviderBrand } from "./model-brand.ts"

test("getProviderBrand maps known AI providers and model IDs correctly", () => {
  assert.equal(getProviderBrand("anthropic", "claude-3-7-sonnet").label, "Anthropic")
  assert.equal(getProviderBrand("openai", "gpt-4.1").label, "OpenAI")
  assert.equal(getProviderBrand("openai", "o3-mini").label, "OpenAI")
  assert.equal(getProviderBrand("google", "gemini-2.5-pro").label, "Google")
  assert.equal(getProviderBrand("deepseek", "deepseek-v3").label, "DeepSeek")
  assert.equal(getProviderBrand("meta", "llama-3.3-70b").label, "Meta")
  assert.equal(getProviderBrand("mistral", "codestral-2501").label, "Mistral")
  assert.equal(getProviderBrand("github-copilot", "claude-3-5-sonnet").label, "Anthropic")
  assert.equal(getProviderBrand("github-copilot", "gpt-4o").label, "OpenAI")
  assert.equal(getProviderBrand("ollama", "qwen2.5-coder").label, "Qwen")
  assert.equal(getProviderBrand("opencode", "opencode-zen").label, "OpenCode")
  assert.equal(getProviderBrand("unknown", "custom-model").label, "AI")
})

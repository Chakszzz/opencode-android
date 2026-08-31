# OpenCode Android

> Open-source React Native / Expo mobile client for the [OpenCode](https://github.com/sst/opencode) AI coding agent.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green?logo=android)](https://github.com/Chakszzz/opencode-android)
[![Framework: Expo](https://img.shields.io/badge/Framework-Expo%20%2F%20React%20Native-black?logo=expo)](https://expo.dev)

Connect to your self-hosted OpenCode server over your local network, Tailscale, Cloudflare Tunnel, or ngrok — write, review, and execute code directly from your Android device.

---

## ✨ Features

- ⚡ **Real-Time Streaming Chat** — Token-by-token streaming responses with live tool call execution.
- 📁 **Project & Session Drawer** — 1-tap quick start in active workspace, browse recent projects, or explore server filesystem.
- 🛠️ **T3-Style Tool Call Groups** — Clean, collapsible activity logs with smooth animations and haptic feedback.
- 💡 **Compact Reasoning Block** — Sleek thought duration viewer (`Thought for 4s`) with expandable breakdown.
- 📋 **Image & Long Text Paste** — Direct clipboard image attachments and unlimited text paste support.
- 🔍 **Interactive Diff Viewer** — Visual line-by-line Git diffs with direct tap-to-quote into chat.
- ⌨️ **Slash Commands & Mentions** — Native `/` command palette (`/review`, `/diff`, `/todo`, `/status`, `/connect`, `/mcps`, `/settings`) and `@` file mentions.
- 🔐 **Biometric Security** — Fingerprint / Face ID protection for app access and prompt execution.
- 🌐 **Multi-Language (i18n)** — Full support for English, Bahasa Indonesia, and Simplified Chinese (简体中文).

---

## 🚀 Quick Start

### 1. Start OpenCode Server on your machine

```bash
# Install opencode
npm install -g opencode-ai

# Start server
OPENCODE_SERVER_PASSWORD=yourpassword opencode serve --hostname 0.0.0.0 --port 4096
```

### 2. Connect from the App

1. Open OpenCode Android.
2. Tap **Add Connection**.
3. Enter your server URL (e.g. `http://192.168.1.100:4096` or your Tailscale / Tunnel URL) and password.
4. Tap **Connect** and start coding!

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on Android emulator / connected device
npx expo run:android
```

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.

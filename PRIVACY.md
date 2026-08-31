# Privacy Policy for OpenCode Android

**Effective Date:** August 30, 2026  
**Repository:** [https://github.com/Chakszzz/opencode-android](https://github.com/Chakszzz/opencode-android)

---

## 1. Overview & Core Privacy Promise

OpenCode Android is an open-source mobile client for self-hosted [OpenCode](https://github.com/sst/opencode) servers.

- **Zero Data Collection on Code & Chats:** We do **NOT** collect, store, transmit, or inspect your source code, file trees, terminal commands, AI prompts, or responses.
- **Direct P2P / Client-to-Server Communication:** All network communication occurs directly between your Android device and your specified OpenCode server instance (over your local network, Tailscale, Cloudflare Tunnel, or ngrok). No third-party proxy or intermediary servers are used.
- **On-Device Keystore:** Server connection URLs and passwords/tokens are stored exclusively on your device using encrypted OS-level secure storage (`expo-secure-store` backed by Android Keystore / Keyguard).

---

## 2. Information We Do NOT Collect

- Your code, repositories, or workspace files.
- Your AI model prompts, chat messages, or tool execution history.
- Your server credentials, API keys, or IP addresses.
- Your personal identity, account credentials, or location data.
- Photos, microphone, or camera data (media attachments travel directly to your own self-hosted server).

---

## 3. Optional Diagnostics (Crash Reporting)

OpenCode Android includes optional, opt-in crash diagnostic reporting via Sentry to help identify and fix stability issues:

- **Disabled by Default / Opt-in:** Crash reporting is only enabled if you explicitly grant permission in the app's settings or onboarding modal.
- **URL & Secret Scrubbing:** Before any crash trace is sent, all server URLs, authorization headers, IP addresses, and sensitive parameters are stripped and redacted on-device.
- **Revocable Anytime:** You can toggle crash reporting on or off at any time under **Settings → Privacy → Crash Reporting**.

---

## 4. Permissions Used by the App

- **INTERNET / Local Network:** To connect to your self-hosted OpenCode server.
- **USE_BIOMETRIC / FINGERPRINT:** To protect the app from unauthorized local access (processed entirely on-device by Android BiometricPrompt).
- **CAMERA / PHOTO_LIBRARY (Optional):** Only if you choose to take or attach a screenshot/photo to a coding prompt.
- **RECORD_AUDIO (Optional):** Only if you choose to use speech-to-text dictation for chat prompts.

---

## 5. Third-Party Services

OpenCode Android does not bundle advertising SDKs, tracking pixels, or third-party data brokers.

---

## 6. Open Source & Transparency

OpenCode Android is open source under the MIT License. You can inspect the entire source code, audit network calls, or build the APK yourself at:
[https://github.com/Chakszzz/opencode-android](https://github.com/Chakszzz/opencode-android)

---

## 7. Contact & Changes

If you have questions about this Privacy Policy, please open an issue on GitHub:
[https://github.com/Chakszzz/opencode-android/issues](https://github.com/Chakszzz/opencode-android/issues)

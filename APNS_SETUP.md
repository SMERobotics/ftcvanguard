# APNs Backend + iOS Setup Guide

This project now supports native Apple Push Notification service (APNs) delivery for iOS devices.

Push logic is fully implemented in backend + app. Your remaining work is only Apple account setup plus server key/config values.

## 1) Apple Developer setup (you)

1. Open Apple Developer -> Certificates, Identifiers & Profiles.
2. Create or open the App ID for your iOS app bundle id: `org.ftcvanguard.ios`.
3. Enable the **Push Notifications** capability on that App ID.
4. Create an APNs Auth Key (`.p8`) under **Keys**:
   - Enable **Apple Push Notifications service (APNs)**.
   - Download the `.p8` file once.
5. Record these values:
   - `Team ID` (Apple Developer account)
   - `Key ID` (APNs key)
   - `Topic` (your bundle id, currently `org.ftcvanguard.ios`)

Reference: Apple APNs provider authentication with token-based auth.

## 2) Backend configuration (you)

Add/update your server `data/settings.toml` with an `[apns]` block.

```toml
[apns]
enabled = true
environment = "production" # use "sandbox" for debug/dev APNs tokens
team_id = "YOUR_TEAM_ID"
key_id = "YOUR_KEY_ID"
topic = "org.ftcvanguard.ios"

# Use exactly one of these:
private_key_path = "data/AuthKey_YOUR_KEY_ID.p8"
private_key = ""
```

Notes:
- `private_key_path` points to the `.p8` file on the server.
- `private_key` can be the raw `.p8` content (or base64 of it) if you prefer secret injection.
- APNs host is chosen from `environment`:
  - `production` -> `api.push.apple.com`
  - `sandbox` -> `api.development.push.apple.com`

## 3) iOS app wiring status

Already implemented:
- iOS native push registration callbacks in `ios/App/App/AppDelegate.swift`
- Capacitor Push Notifications plugin registration in `static/assets/app.ts`
- Automatic device token sync to backend after login
- Automatic token unregister call on logout

You still need to run sync after pulling changes:

```bash
npx cap sync ios
```

### Required backend endpoint

- `POST /api/v1/notifications/ios/device`
  - Auth: `Authorization: Bearer <user-token>`
  - Body:

```json
{
  "deviceToken": "<hex-apns-token>"
}
```

### Optional unregister endpoint

- `DELETE /api/v1/notifications/ios/device`
  - Same auth
  - Body with same `deviceToken`
  - Use this on logout if you want to stop notifications for that device/account pair.

### Xcode capability checklist (still required)

1. Push Notifications capability enabled for target.
2. Background Modes -> Remote notifications enabled (recommended).

## 4) How to verify

1. Start backend with APNs enabled.
2. Log into iOS app and confirm token registration returns `status: success`.
3. Trigger a notification from backend (existing admin endpoint):
   - `POST /api/v1/admin/notifications`
4. Confirm notification appears on iOS device.

If delivery fails, check backend logs for APNs reason codes (for example `BadDeviceToken`, `Unregistered`, `DeviceTokenNotForTopic`).

## 5) Environment matching rules

- Debug/TestFlight/App Store builds can produce different token environments.
- If tokens are from sandbox but backend uses production (or vice versa), APNs rejects delivery.
- Keep `environment` aligned with how the app is built and signed.

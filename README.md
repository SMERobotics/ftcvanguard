# Vanguard

SvelteKit app with Capacitor iOS scaffolding.

## Development

Install [Bun](https://bun.sh), then run:

```sh
bun install
bun run --bun dev
```

## Web build

```sh
bun run --bun check
bun run --bun build
bun run --bun preview
```

The static adapter produces a client-rendered app in `build/`, including an
`index.html` entry point for Capacitor. The bundle runs without a SvelteKit server;
server routes and form actions require a separate backend.

## iOS

The native project lives in `ios/` and uses Swift Package Manager. Its display name
is **Vanguard** and its bundle identifier is **`org.ftcvanguard.vanguard`**.
Capacitor configuration lives in `capacitor.config.ts`.

After cloning or changing the web app, rebuild and copy its assets into the native
project:

```sh
bun run ios:sync
```

This also updates native dependency declarations. It does not open Xcode, compile
the native app, or sign it. Copied web assets and generated Capacitor configuration
are ignored by Git; native project sources and the SPM manifest are retained.

The native project was initially generated with:

```sh
bun run --bun build
bun x --bun cap add ios --packagemanager SPM
```

The `add` command is only needed when creating a new native project, not after
cloning this repository.

### GitHub Actions builds

Every push (including branches and tags) runs `.github/workflows/ios.yml`. It can
also be started manually from the Actions tab. The workflow installs locked
dependencies with Bun 1.3.14, checks the app, syncs web assets, and archives a Release
device build on a GitHub macOS runner using Xcode 26.2.

Download `Vanguard-unsigned-<commit SHA>` from the workflow run's **Artifacts**
section and extract `Vanguard-unsigned.ipa`. Artifacts are retained for 14 days.

The IPA is **unsigned**: no Apple secrets are required, but it must be signed with
an appropriate certificate and provisioning profile before installation. This
workflow does not export a signed App Store/TestFlight build or upload to Apple.
Xcode runs only on the GitHub runner.

### Build and signing handoff

On the eventual macOS build machine, install dependencies and run `bun run ios:sync`
before building `ios/App/App.xcodeproj`. That environment needs the Xcode version
required by Capacitor 8, an Apple signing team, and provisioning for
`org.ftcvanguard.vanguard`. Configure signing there, replace the template icons and
splash assets before release, and validate on an iOS device or simulator before
archiving and distributing.

See the [Capacitor iOS guide](https://capacitorjs.com/docs/ios) for native build
requirements. Local scaffolding validation covers the web build and asset sync;
native compilation, signing, and runtime validation are deferred to that machine.

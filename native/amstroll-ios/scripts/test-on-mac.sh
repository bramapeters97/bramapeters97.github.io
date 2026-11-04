#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != "Darwin" ]]; then echo "This step requires macOS and Xcode." >&2; exit 1; fi
xcode-select -p
xcrun --find swift
xcodebuild -version
if command -v node >/dev/null; then node scripts/generate-project.mjs; fi
if [[ $# -ne 1 ]]; then
  echo 'Usage: bash scripts/test-on-mac.sh SIMULATOR_UDID' >&2
  xcrun simctl list devices available
  exit 2
fi
mkdir -p Build
xcodebuild -project Amstroll.xcodeproj -scheme Amstroll -configuration Debug \
  -destination "platform=iOS Simulator,id=$1" -derivedDataPath Build/DerivedData \
  -resultBundlePath "Build/Tests-$(date +%Y%m%d-%H%M%S).xcresult" \
  CODE_SIGNING_ALLOWED=NO test

#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != "Darwin" ]]; then echo "Real native screenshots require macOS and Xcode." >&2; exit 1; fi
if [[ $# -ne 1 ]]; then echo 'Usage: bash scripts/capture-screenshots.sh SIMULATOR_UDID' >&2; xcrun simctl list devices available; exit 2; fi
if command -v node >/dev/null; then node scripts/generate-project.mjs; fi
STAMP=$(date +%Y%m%d-%H%M%S)
RESULT="Build/Screenshots-$STAMP.xcresult"
OUT="AppStore/Screenshots/$STAMP"
mkdir -p Build "$OUT"
xcrun simctl boot "$1" 2>/dev/null || true
xcrun simctl bootstatus "$1" -b
xcrun simctl status_bar "$1" override --time '9:41' --dataNetwork wifi --wifiMode active --wifiBars 3 --batteryState charged --batteryLevel 100
trap 'xcrun simctl status_bar "$1" clear >/dev/null 2>&1 || true' EXIT
xcodebuild -project Amstroll.xcodeproj -scheme Amstroll -configuration Debug \
  -destination "platform=iOS Simulator,id=$1" -derivedDataPath Build/DerivedData \
  -resultBundlePath "$RESULT" -only-testing:AmstrollUITests/AmstrollScreenshotTests \
  CODE_SIGNING_ALLOWED=NO test
xcrun xcresulttool export attachments --path "$RESULT" --output-path "$OUT"
xcrun swift scripts/flatten-screenshots.swift "$OUT" | tee "$OUT/IMAGE-METADATA.txt"
xcodebuild -version > "$OUT/TOOLCHAIN.txt"
xcrun simctl list devices -j > "$OUT/simulator-inventory.json"
printf 'Captured from Simulator UDID: %s\nUTC capture: %s\n' "$1" "$(date -u +%FT%TZ)" > "$OUT/CAPTURE.txt"
printf 'Capture command: bash scripts/capture-screenshots.sh %s\n' "$1" >> "$OUT/CAPTURE.txt"
echo "Real native captures: $OUT. Review screenshots and confirm accepted dimensions before upload."

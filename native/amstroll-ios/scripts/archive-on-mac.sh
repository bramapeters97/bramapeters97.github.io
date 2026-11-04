#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != "Darwin" ]]; then echo "Archive validation requires macOS and Xcode." >&2; exit 1; fi
if [[ -z "${AMSTROLL_TEAM_ID:-}" || -z "${AMSTROLL_BUNDLE_ID:-}" ]]; then
  echo 'Set AMSTROLL_TEAM_ID and AMSTROLL_BUNDLE_ID to your registered values.' >&2; exit 2
fi
if command -v node >/dev/null; then node scripts/generate-project.mjs; fi
mkdir -p Build
xcodebuild -project Amstroll.xcodeproj -scheme Amstroll -configuration Release \
  -destination 'generic/platform=iOS' -archivePath Build/Amstroll.xcarchive \
  AMSTROLL_DEVELOPMENT_TEAM="$AMSTROLL_TEAM_ID" AMSTROLL_BUNDLE_IDENTIFIER="$AMSTROLL_BUNDLE_ID" \
  DEVELOPMENT_TEAM="$AMSTROLL_TEAM_ID" archive
printf '\nArchive created. Validate in Xcode Organizer. This script does not upload or submit.\n'

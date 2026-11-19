#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != "Darwin" ]]; then echo "Archive validation requires macOS and Xcode." >&2; exit 1; fi
archive_day=$(date +%F)
archive_stamp=$(date '+%Y-%m-%d %H.%M.%S')
archive_root=${AMSTROLL_ARCHIVE_ROOT:-$HOME/Library/Developer/Xcode/Archives}
archive_path="$archive_root/$archive_day/Amstroll $archive_stamp.xcarchive"
signing_overrides=()
if [[ -n "${AMSTROLL_TEAM_ID:-}" ]]; then signing_overrides+=("AMSTROLL_DEVELOPMENT_TEAM=$AMSTROLL_TEAM_ID"); fi
if [[ -n "${AMSTROLL_BUNDLE_ID:-}" ]]; then signing_overrides+=("AMSTROLL_BUNDLE_IDENTIFIER=$AMSTROLL_BUNDLE_ID"); fi
if [[ -n "${AMSTROLL_BUILD_NUMBER:-}" ]]; then signing_overrides+=("AMSTROLL_BUILD_NUMBER=$AMSTROLL_BUILD_NUMBER"); fi
if [[ -n "${AMSTROLL_APP_STORE_PROFILE:-}" ]]; then signing_overrides+=("AMSTROLL_APP_STORE_PROFILE=$AMSTROLL_APP_STORE_PROFILE"); fi
if [[ -n "${AMSTROLL_DISTRIBUTION_CERTIFICATE:-}" ]]; then signing_overrides+=("AMSTROLL_DISTRIBUTION_CERTIFICATE=$AMSTROLL_DISTRIBUTION_CERTIFICATE"); fi

mkdir -p "$(dirname "$archive_path")"
xcodebuild -project Amstroll.xcodeproj -scheme Amstroll -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$archive_path" \
  ${signing_overrides[@]+"${signing_overrides[@]}"} archive
printf '\nArchive created at %s\n' "$archive_path"

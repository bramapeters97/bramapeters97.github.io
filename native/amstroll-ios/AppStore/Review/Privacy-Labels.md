# Privacy-label worksheet and manifest review

Draft, 4 November 2026. The final owner must verify provider handling and answer App Store Connect from the release build. Having no backend does not establish "Data Not Collected".

| Information | App behaviour | Release decision |
|---|---|---|
| Preferences, saved IDs, local notes | Stored in private local JSON files | No intentional server upload. Check device backups and any future sync. |
| Selected journal photo | Copied from PhotosPicker into private local storage | No photo/EXIF upload by Amstroll. Do not request broad library access. |
| Selected manual start coordinate | Sent for optional nearby/routing/weather features | A public area alone is not necessarily a person's location; disclose the service request clearly. |
| Current coordinate, if user selects it | May be sent to place/weather/route providers | Conservatively declare precise location for app functionality, unlinked and not tracking, pending provider retention review. |
| IP address and normal requests | Providers/hosts see network request metadata | Review provider retention and identifiers under Apple's collection definition; do not promise zero collection. |
| Analytics/ads/tracking IDs | No SDK or collection added | Tracking is false; no ATT request needed for the implemented app. Reassess if implementation changes. |

PrivacyInfo.xcprivacy includes the conservative precise-location/app-functionality declaration. Its accessed-API list is empty because this implementation uses local JSON/files and does not deliberately use UserDefaults, boot-time, disk-space or file-timestamp required-reason APIs. Audit the final binary and code, not just this intention. If a required-reason API is introduced, add its justified approved reason; never add arbitrary reason codes to silence a warning.

No third-party binary SDKs are included. If any are added, audit Apple's current signature/manifest requirements. The resource conversion tool Sharp is an optional development-time tool, not shipped inside the app.

The in-app policy, public policy and App Store privacy-label answers must agree. Public policy URL, controller identity and retention wording require owner review before submission.

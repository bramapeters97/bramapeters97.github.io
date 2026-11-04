# Improvements and deliberate native adaptations

These changes are design/implementation decisions, not findings from interviews or measured usability research.

| Original issue | Native decision and reason |
|---|---|
| A fake iPhone surrounds the HTML app | Render only application UI; real safe areas/status indicators prevent duplicated hardware on an actual phone. |
| Fictional Alex/profile and sample memories can look personal | Release has account-free local data. Seeded examples belong only to explicit demo/screenshot mode. |
| Open places could be read as open now | Explain open-data discovery and keep route/price/access checks visible. |
| Several external photos are one-byte placeholders | Extract valid embedded originals and preserve author/licence metadata; native app is self-contained. |
| A failed live photo could be replaced by unrelated area scenery | Use an honest unavailable state. Native remote-image loading uses an ephemeral session with bounded request/resource timeouts and cancels obsolete loads. Area photos remain explicitly contextual for authored plans. |
| A provider can fail while another succeeds | Keep successful partial data and warnings; never pad the fiftieth place or silently switch to samples. |
| Browser-storage assumptions do not translate to native | Use app-private native JSON/files and system photo selection. No login service is invented. |
| Browser look and stock native forms differ | Use native SwiftUI controls with reusable custom styles and real focus/keyboard/accessibility behaviour. |
| Web live route checks depended on an unavailable Google connection | Use only supported native route checks and identify unverified costs/access. Transit planners remain external links. |
| A prototype can look like a finished release | Keep review notes, provider boundaries and release blockers explicit. A Mac build and actual device testing remain required. |

The visual direction, catalogue, constraints, five-card browsing, manual progress and optional memory journey are preserved. The app never quietly extends selected time or budget.

Additional implementation details: forecast context stays in memory and influences indoor suggestions, then clears when the starting area changes. Discovery invalidates when GPS coordinates change even if the start identifier remains the same. Large-text time controls reflow and mood controls scroll horizontally. The floating tab controls remain available throughout the navigation journey. User photographs are downsampled through ImageIO before JPEG normalization, avoiding full-resolution rendering and removing embedded metadata. Source files and Xcode structure are checked independently; no native compilation is implied.

/** Physical tables behind the backwards-compatible records view. */
export const resourceTables: Record<string, string> = {
  profiles: "profiles",
  collections: "collections",
  providerConfigs: "provider_configs",
  mediaAssets: "media_assets",
  playbackLicenses: "playback_licenses",
  accessPolicies: "access_policies",
  consents: "consents",
  videos: "videos",
  moments: "moments",
  stories: "stories",
  transcripts: "transcripts",
  chapters: "chapters",
  channels: "channels",
  programmes: "programmes",
  premieres: "premieres",
  contributions: "contributions",
  links: "contribution_links",
  uploads: "uploads",
  notifications: "notifications",
  exports: "exports",
  billing: "billing",
  invoices: "invoices",
  history: "history",
  queues: "queues",
  settings: "settings",
  watchlists: "watchlists",
  assetOwnership: "asset_ownership",
  recovery: "recovery_records",
};
export function tableForResource(resource: string) {
  return resourceTables[resource] ?? "other_records";
}

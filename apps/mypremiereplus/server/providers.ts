/** Production provider boundaries. These adapters are inert until explicitly configured.
 * They do not inherit any resources or credentials from the original family archive. */
export interface PrivateAssetStore {
  put(key: string, body: ArrayBuffer, contentType: string): Promise<void>;
  get(
    key: string,
  ): Promise<{ body: ReadableStream; contentType: string } | null>;
  delete(key: string): Promise<void>;
}
export interface R2Binding {
  put(
    key: string,
    value: ArrayBuffer,
    options: { httpMetadata: { contentType: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(key: string): Promise<void>;
}
export class PrivateR2Assets implements PrivateAssetStore {
  constructor(
    private binding: R2Binding,
    private tenantId: string,
  ) {}
  private key(key: string) {
    if (!/^[a-f0-9]{32}$/.test(key))
      throw new Error("Invalid private asset key");
    return `${this.tenantId}/${key}`;
  }
  async put(key: string, body: ArrayBuffer, contentType: string) {
    await this.binding.put(this.key(key), body, {
      httpMetadata: { contentType },
    });
  }
  async get(key: string) {
    const result = await this.binding.get(this.key(key));
    return result
      ? {
          body: result.body,
          contentType:
            result.httpMetadata?.contentType ?? "application/octet-stream",
        }
      : null;
  }
  async delete(key: string) {
    await this.binding.delete(this.key(key));
  }
}
export interface VideoProvider {
  createUpload(
    maxDurationSeconds: number,
  ): Promise<{ uploadUrl: string; providerId: string }>;
  playback(providerId: string, expiresAt: number): Promise<string>;
  thumbnail(providerId: string, seconds: number): Promise<string>;
}
export class CloudflareStreamProvider implements VideoProvider {
  constructor(
    private config: {
      accountId: string;
      apiToken: string;
      customerHost: string;
      signingKeyId: string;
      signingPrivateKeyJwk: JsonWebKey;
    },
    private fetcher: typeof fetch = fetch,
  ) {}
  async createUpload(maxDurationSeconds: number) {
    if (
      !Number.isFinite(maxDurationSeconds) ||
      maxDurationSeconds <= 0 ||
      maxDurationSeconds > 21600
    )
      throw new Error("Invalid upload duration");
    const response = await this.fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.config.accountId)}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ maxDurationSeconds, requireSignedURLs: true }),
      },
    );
    const result = (await response.json()) as {
      success?: boolean;
      result?: { uploadURL?: string; uid?: string };
    };
    if (
      !response.ok ||
      !result.success ||
      !result.result?.uploadURL ||
      !result.result.uid
    )
      throw new Error("Video provider did not accept the upload request");
    return {
      uploadUrl: result.result.uploadURL,
      providerId: result.result.uid,
    };
  }
  private async token(providerId: string, expiresAt: number) {
    if (
      !/^[a-f0-9]{32}$/.test(providerId) ||
      expiresAt <= Date.now() / 1000 ||
      expiresAt > Date.now() / 1000 + 3600
    )
      throw new Error("Invalid protected playback request");
    const encode = (v: unknown) =>
      Buffer.from(JSON.stringify(v)).toString("base64url");
    const payload = `${encode({ alg: "RS256", kid: this.config.signingKeyId })}.${encode({ sub: providerId, kid: this.config.signingKeyId, exp: Math.floor(expiresAt) })}`;
    const key = await crypto.subtle.importKey(
      "jwk",
      this.config.signingPrivateKeyJwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(payload),
    );
    return `${payload}.${Buffer.from(signature).toString("base64url")}`;
  }
  async playback(providerId: string, expiresAt: number) {
    const token = await this.token(providerId, expiresAt);
    return `https://${this.config.customerHost}/${token}/manifest/video.m3u8`;
  }
  async thumbnail(providerId: string, seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new Error("Invalid thumbnail time");
    const token = await this.token(providerId, Date.now() / 1000 + 300);
    return `https://${this.config.customerHost}/${token}/thumbnails/thumbnail.jpg?time=${seconds}s&height=720`;
  }
}
export type CoverRequest = {
  description: string;
  keywords: string[];
  style: "classic" | "vintage" | "minimal";
  format: "cover" | "backdrop";
  consentToPrivateInputs: boolean;
};
export interface ImageProvider {
  preview(
    request: CoverRequest,
  ): Promise<{ provider: string; demo: boolean; previews: { url: string }[] }>;
}
export class DemoImageProvider implements ImageProvider {
  async preview(_request: CoverRequest) {
    return {
      provider: "demo",
      demo: true,
      previews: ["lake", "mountains", "coast"].map((name) => ({
        url: `/artwork/${name}.png`,
      })),
    };
  }
}
/** D1 exposes these prepared SQL operations; domain queries always bind tenant_id first.
 * The Node local adapter deliberately uses SQLite for independent local operation. */
export interface D1DatabaseBinding {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all(): Promise<{ results: unknown[] }>;
      first(): Promise<unknown>;
      run(): Promise<unknown>;
    };
  };
  batch(statements: unknown[]): Promise<unknown[]>;
}

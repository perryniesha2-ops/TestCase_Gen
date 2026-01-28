export type ApiMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type ApiAuthOut =
  | { type: "none" }
  | { type: "bearer"; tokenVar?: string }
  | { type: "apiKey"; headerName?: string; apiKeyVar?: string }
  | { type: "basic"; usernameVar?: string; passwordVar?: string }
  | { type: "oauth2"; tokenVar?: string };

export type ApiSpecOut = {
  method: ApiMethod;
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  auth?: ApiAuthOut;
  expectedStatus?: number;
};

const ALLOWED_METHODS = new Set<ApiMethod>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

function normalizeMethod(v: unknown): ApiMethod {
  const up = String(v ?? "")
    .trim()
    .toUpperCase();
  return ALLOWED_METHODS.has(up as ApiMethod) ? (up as ApiMethod) : "GET";
}

function normalizePath(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function safeRecord(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!k) continue;
    if (val == null) continue;
    out[k] = String(val);
  }
  return Object.keys(out).length ? out : undefined;
}

export function normalizeApiSpec(v: unknown): ApiSpecOut | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;

  const method = normalizeMethod(o.method);
  const path = normalizePath(o.path);
  const headers = safeRecord(o.headers);
  const query = safeRecord(o.query);

  const expectedStatus =
    typeof o.expectedStatus === "number" && Number.isFinite(o.expectedStatus)
      ? o.expectedStatus
      : undefined;

  return {
    method,
    path,
    headers,
    query,
    body: o.body,
    auth: (o.auth as any) ?? undefined,
    expectedStatus,
  };
}

export function isValidApiSpec(api?: ApiSpecOut) {
  if (!api) return false;
  if (!api.method) return false;
  if (!api.path || typeof api.path !== "string") return false;
  return true;
}

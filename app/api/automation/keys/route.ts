// app/api/keys/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomHex(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── GET /automation/api/keys ────────────────────────────────────────────────────────────
// Returns key metadata (masked prefix, created_at, last_used_at) — never the
// plaintext key. Used by SettingsPage on load to show key status.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("api_key, api_key_created_at, api_key_last_used_at")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Never return the full key — only whether one exists and its metadata
  const hasKey = Boolean(profile?.api_key);
  const prefix = hasKey
    ? `${profile.api_key!.slice(0, 14)}••••••••••••••••`
    : null;

  return NextResponse.json({
    has_key: hasKey,
    prefix,
    created_at: profile?.api_key_created_at ?? null,
    last_used_at: profile?.api_key_last_used_at ?? null,
  });
}

// ─── POST /automation/api/keys ───────────────────────────────────────────────────────────
// Generates a new API key, stores it, returns the plaintext ONCE.
// Overwrites any existing key — the client should warn before calling.

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = `synthqa_${randomHex(32)}`;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("user_profiles")
    .update({
      api_key: apiKey,
      api_key_created_at: now,
      api_key_last_used_at: null, // reset on rotation
      updated_at: now,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    key: apiKey, // plaintext — shown once, never again
    created_at: now,
  });
}

// ─── DELETE /automation/api/keys ─────────────────────────────────────────────────────────
// Revokes the current API key. Any CI pipelines using it will start getting 401s.

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      api_key: null,
      api_key_created_at: null,
      api_key_last_used_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

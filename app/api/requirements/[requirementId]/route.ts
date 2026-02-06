// app/api/requirements/[requirementId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

function clampString(v: unknown, max = 5000) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

async function resolveParams<T>(p: T | Promise<T>): Promise<T> {
  return typeof (p as any)?.then === "function"
    ? await (p as Promise<T>)
    : (p as T);
}

// Allow only these fields to be patched (adjust as needed)
const ALLOWED_PATCH_FIELDS = new Set([
  "title",
  "description",
  "type",
  "priority",
  "status",
  "source",
  "external_id",
  "acceptance_criteria",
  "metadata",
  "project_id",
  "requirement_type",
]);

function pickPatch(input: unknown) {
  if (!isObj(input)) return {};

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!ALLOWED_PATCH_FIELDS.has(k)) continue;

    switch (k) {
      case "title":
        out.title = clampString(v, 500);
        break;
      case "description":
        out.description = v === null ? null : clampString(v, 20_000);
        break;
      case "external_id":
      case "source":
      case "type":
      case "priority":
      case "status":
      case "requirement_type":
        out[k] = v === null ? null : clampString(v, 200);
        break;
      case "project_id":
        out.project_id = v === null ? null : String(v);
        break;
      case "acceptance_criteria":
        // stored as jsonb; allow null/array/object
        out.acceptance_criteria = v === null ? null : v;
        break;
      case "metadata":
        out.metadata = v === null ? {} : v;
        break;
      default:
        out[k] = v;
    }
  }

  // Ensure we don't write empty title if provided
  if ("title" in out && !out.title) {
    delete out.title;
  }

  return out;
}

// GET /api/requirements/:requirementId
export async function GET(
  _req: Request,
  {
    params,
  }: { params: { requirementId: string } | Promise<{ requirementId: string }> },
) {
  try {
    const resolved = await resolveParams(params);
    const requirementId = String(resolved?.requirementId ?? "").trim();

    if (!requirementId) {
      return NextResponse.json(
        { error: "Missing requirementId" },
        { status: 400 },
      );
    }
    if (!isUuid(requirementId)) {
      return NextResponse.json(
        { error: "Invalid requirementId", received: requirementId },
        { status: 400 },
      );
    }
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Requirement row
    const { data: requirement, error: reqErr } = await supabase
      .from("requirements")
      .select(
        `
        id,
        user_id,
        title,
        description,
        type,
        priority,
        status,
        source,
        external_id,
        acceptance_criteria,
        metadata,
        project_id,
        requirement_type,
        created_at,
        updated_at,
        projects:project_id(id, name, color, icon)
      `,
      )
      .eq("id", requirementId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }
    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 },
      );
    }

    // Linked tests (both types)
    const { data: links, error: linksErr } = await supabase
      .from("requirement_test_cases")
      .select(
        "id, requirement_id, test_case_id, platform_test_case_id, coverage_type, created_at",
      )
      .eq("requirement_id", requirementId);

    if (linksErr) {
      return NextResponse.json({ error: linksErr.message }, { status: 500 });
    }

    const regularIds = (links ?? [])
      .map((l: any) => l.test_case_id as string | null)
      .filter(Boolean) as string[];

    const platformIds = (links ?? [])
      .map((l: any) => l.platform_test_case_id as string | null)
      .filter(Boolean) as string[];

    // Fetch regular test cases (optional details)
    const { data: regularCases, error: regErr } = regularIds.length
      ? await supabase
          .from("test_cases")
          .select(
            "id, title, test_type, priority, status, created_at, updated_at, project_id",
          )
          .in("id", regularIds)
          .eq("user_id", user.id)
      : { data: [], error: null };

    if (regErr) {
      return NextResponse.json({ error: regErr.message }, { status: 500 });
    }

    // Fetch cross-platform test cases (optional details)
    const { data: platformCases, error: platErr } = platformIds.length
      ? await supabase
          .from("platform_test_cases")
          .select(
            "id, title, platform, framework, priority, status, created_at, updated_at, project_id",
          )
          .in("id", platformIds)
          .eq("user_id", user.id)
      : { data: [], error: null };

    if (platErr) {
      return NextResponse.json({ error: platErr.message }, { status: 500 });
    }

    // Join link -> case details for convenience
    const regMap = new Map((regularCases ?? []).map((tc: any) => [tc.id, tc]));
    const platMap = new Map(
      (platformCases ?? []).map((tc: any) => [tc.id, tc]),
    );

    const linked_tests = (links ?? []).map((l: any) => {
      const regular = l.test_case_id ? regMap.get(l.test_case_id) : null;
      const platform = l.platform_test_case_id
        ? platMap.get(l.platform_test_case_id)
        : null;

      return {
        id: l.id,
        requirement_id: l.requirement_id,
        coverage_type: l.coverage_type,
        created_at: l.created_at,
        test_case_id: l.test_case_id,
        platform_test_case_id: l.platform_test_case_id,
        test_case: regular
          ? { ...regular, _caseType: "regular" as const }
          : null,
        platform_test_case: platform
          ? { ...platform, _caseType: "cross-platform" as const }
          : null,
      };
    });

    // Coverage counts
    const regularCount = regularIds.length;
    const platformCount = platformIds.length;
    const test_case_count = regularCount + platformCount;

    return NextResponse.json(
      {
        requirement: {
          ...requirement,
          test_case_count,
          regular_test_case_count: regularCount,
          platform_test_case_count: platformCount,
        },
        linked_tests,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}

// PATCH /api/requirements/:requirementId
export async function PATCH(
  req: Request,
  {
    params,
  }: { params: { requirementId: string } | Promise<{ requirementId: string }> },
) {
  try {
    const resolved = await resolveParams(params);
    const requirementId = String(resolved?.requirementId ?? "").trim();

    if (!requirementId) {
      return NextResponse.json(
        { error: "Missing requirementId" },
        { status: 400 },
      );
    }
    if (!isUuid(requirementId)) {
      return NextResponse.json(
        { error: "Invalid requirementId", received: requirementId },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const patch = pickPatch(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("requirements")
      .update(patch)
      .eq("id", requirementId)
      .eq("user_id", user.id)
      .select(
        `
        id,
        user_id,
        title,
        description,
        type,
        priority,
        status,
        source,
        external_id,
        acceptance_criteria,
        metadata,
        project_id,
        requirement_type,
        created_at,
        updated_at,
        projects:project_id(id, name, color, icon)
      `,
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { requirement: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}

// DELETE /api/requirements/:requirementId
export async function DELETE(
  _req: Request,
  {
    params,
  }: { params: { requirementId: string } | Promise<{ requirementId: string }> },
) {
  try {
    const resolved = await resolveParams(params);
    const requirementId = String(resolved?.requirementId ?? "").trim();

    if (!requirementId) {
      return NextResponse.json(
        { error: "Missing requirementId" },
        { status: 400 },
      );
    }
    if (!isUuid(requirementId)) {
      return NextResponse.json(
        { error: "Invalid requirementId", received: requirementId },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: delete links first (if you didn't set ON DELETE CASCADE on requirement_id)
    await supabase
      .from("requirement_test_cases")
      .delete()
      .eq("requirement_id", requirementId);

    const { error } = await supabase
      .from("requirements")
      .delete()
      .eq("id", requirementId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}

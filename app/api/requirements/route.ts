// app/api/requirements/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const {
      title,
      description,
      type,
      external_id,
      acceptance_criteria,
      priority,
      source,
      status,
      project_id,
      metadata,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    const { data: requirement, error } = await supabase
      .from("requirements")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        type: type ?? "functional",
        external_id: external_id ?? null,
        acceptance_criteria: acceptance_criteria ?? null,
        priority: priority ?? "medium",
        source: source ?? "manual",
        status: status ?? "draft",
        project_id: project_id ?? null,
        metadata: metadata ?? null,
      })
      .select(
        `
        *,
        projects:project_id (
          id,
          name,
          color,
          icon
        )
      `,
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requirement }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}

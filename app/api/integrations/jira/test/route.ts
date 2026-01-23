import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JiraIntegration } from "@/lib/integration/jira-client";

export const runtime = "nodejs";

interface JiraTestBody {
  url?: string;
  email?: string;
  apiToken?: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: JiraTestBody;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const url = body.url?.trim() || "";
  const email = body.email?.trim() || "";
  const apiToken = body.apiToken?.trim() || "";

  if (!url || !email || !apiToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required fields: url, email, and apiToken are required",
      },
      { status: 400 },
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) {
      throw new Error("URL must use HTTP or HTTPS protocol");
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid Jira URL format. Expected format: https://yourcompany.atlassian.net`,
      },
      { status: 400 },
    );
  }

  try {
    const jira = new JiraIntegration({
      url,
      email,
      apiToken,
    });

    const me = await jira.testConnection();
    return NextResponse.json({ ok: true, me, baseUrl: jira.getBaseUrl() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to connect to Jira";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

import { createClient } from "@/lib/supabase/server";

export type SuiteKind = "regular" | "cross-platform";

export async function resolveSuiteKind(
  supabase: Awaited<ReturnType<typeof createClient>>,
  suiteId: string,
  userId: string,
): Promise<
  | { kind: "regular"; suite: { id: string; user_id: string } }
  | { kind: "cross-platform"; suite: { id: string; user_id: string } }
  | { kind: null; suite: null }
> {
  const { data } = await supabase
    .from("suites")
    .select("id, user_id, kind")
    .eq("id", suiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return { kind: null, suite: null };

  const kind: SuiteKind =
    data.kind === "cross-platform" ? "cross-platform" : "regular";

  return { kind, suite: { id: data.id, user_id: data.user_id } };
}

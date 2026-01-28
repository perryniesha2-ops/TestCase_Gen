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
  // 1) Regular suite
  const regular = await supabase
    .from("test_suites")
    .select("id, user_id")
    .eq("id", suiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (regular.data) return { kind: "regular", suite: regular.data };

  // 2) Cross-platform suite
  const cross = await supabase
    .from("cross_platform_test_suites")
    .select("id, user_id")
    .eq("id", suiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (cross.data) return { kind: "cross-platform", suite: cross.data };

  return { kind: null, suite: null };
}

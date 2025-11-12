// lib/usage-tracker.ts
import { createClient } from "@/lib/supabase/server";

interface UsageResult {
  allowed: boolean;
  remaining: number; // -1 means unlimited
  error?: string;
}

interface UserUsage {
  test_cases_generated: number;
  api_calls_used: number;
  monthly_limit_test_cases: number;
  monthly_limit_api_calls: number;
  month: string;
  user_id: string;
}

interface UserSubscription {
  subscription_tier: "free" | "pro" | "team" | "enterprise";
  subscription_status: string;
}

interface UsageTracker {
  canGenerateTestCases(userId: string, count: number): Promise<UsageResult>;
  recordTestCaseGeneration(userId: string, count: number): Promise<void>;
  recordApiCall(userId: string): Promise<void>;
  getUserUsage(userId: string): Promise<UserUsage | null>;
}

/** ---- Minimal, safe logging helpers ---- */
const DEBUG = process.env.DEBUG_USAGE_TRACKER === "1";

function redactId(id: string | undefined | null) {
  if (!id) return "redacted";
  // keep first 6 chars max
  return id.slice(0, 6) + "…";
}
function dlog(msg: string, meta?: Record<string, unknown>) {
  if (!DEBUG) return;
  try {
    // Only log redacted, non-PII metadata
    const safe = meta
      ? JSON.stringify(
          Object.fromEntries(
            Object.entries(meta).map(([k, v]) =>
              /id|email|token|key/i.test(k)
                ? [k, typeof v === "string" ? redactId(v) : "redacted"]
                : [k, v]
            )
          )
        )
      : "";
    // eslint-disable-next-line no-console
    console.debug(`[usage] ${msg}${safe ? " " + safe : ""}`);
  } catch {
    // swallow logging errors
  }
}

class UsageTrackerService implements UsageTracker {
  private async getCurrentUsage(userId: string): Promise<UserUsage | null> {
    const supabase = await createClient();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const { data, error } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .single();

    if (error) {
      // Avoid leaking table/column names or SQL in logs returned to clients
      dlog("getCurrentUsage error", { userId, error: error.code });
      return null;
    }
    return data;
  }

  private async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", userId)
      .single();

    if (error) {
      dlog("getUserSubscription error", { userId, error: error.code });
      return null;
    }
    return data;
  }

  async canGenerateTestCases(userId: string, count: number = 1): Promise<UsageResult> {
    try {
      const [usage, subscription] = await Promise.all([
        this.getCurrentUsage(userId),
        this.getUserSubscription(userId),
      ]);

      if (!subscription) {
        return { allowed: false, remaining: 0, error: "User not found" };
      }

      // Plan limits (promotion for free: 20)
      const planLimits: Record<UserSubscription["subscription_tier"], number> = {
        free: 20,
        pro: 500,
        team: 2000,
        enterprise: -1, // unlimited
      };

      const monthlyLimit = planLimits[subscription.subscription_tier] ?? 10;

      if (monthlyLimit === -1) {
        return { allowed: true, remaining: -1 };
      }

      const current = usage?.test_cases_generated ?? 0;
      const remaining = monthlyLimit - current;

      if (remaining >= count) {
        return { allowed: true, remaining: remaining - count };
      }

      return {
        allowed: false,
        remaining,
        error: `Monthly limit exceeded. You have ${remaining} test cases remaining.`,
      };
    } catch (e) {
      // Do not leak stack traces or DB details to callers
      dlog("canGenerateTestCases fatal", { userId: redactId(userId) });
      return { allowed: false, remaining: 0, error: "Failed to check usage limits" };
    }
  }

  async recordTestCaseGeneration(userId: string, count: number = 1): Promise<void> {
    try {
      const supabase = await createClient();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const usage = await this.getCurrentUsage(userId);

      if (usage) {
        const { error } = await supabase
          .from("user_usage")
          .update({
            test_cases_generated: usage.test_cases_generated + count,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("month", currentMonth);

        if (error) {
          dlog("recordTestCaseGeneration update error", {
            userId: redactId(userId),
            code: error.code,
          });
          throw new Error("Database update failed");
        }
      } else {
        // New month or first usage record
        const subscription = await this.getUserSubscription(userId);
        const limits = {
          free: { testCases: 20, apiCalls: 200 },
          pro: { testCases: 500, apiCalls: 5000 },
          team: { testCases: 2000, apiCalls: 20000 },
          enterprise: { testCases: -1, apiCalls: -1 },
        }[subscription?.subscription_tier ?? "free"];

        const { error } = await supabase.from("user_usage").insert({
          user_id: userId,
          month: currentMonth,
          test_cases_generated: count,
          api_calls_used: 0,
          monthly_limit_test_cases: limits.testCases,
          monthly_limit_api_calls: limits.apiCalls,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          dlog("recordTestCaseGeneration insert error", {
            userId: redactId(userId),
            code: error.code,
          });
          throw new Error("Database insert failed");
        }
      }
    } catch (e) {
      // Keep server logs minimal; let the caller handle UI messaging
      dlog("recordTestCaseGeneration fatal", { userId: redactId(userId) });
      throw new Error("Failed to record usage");
    }
  }

  async recordApiCall(userId: string): Promise<void> {
    try {
      const supabase = await createClient();
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await this.getCurrentUsage(userId);

      if (!usage) return;

      const { error } = await supabase
        .from("user_usage")
        .update({
          api_calls_used: usage.api_calls_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("month", currentMonth);

      if (error) {
        dlog("recordApiCall update error", { userId: redactId(userId), code: error.code });
        // non-fatal: don't throw to avoid breaking primary flows
      }
    } catch {
      dlog("recordApiCall fatal", { userId: redactId(userId) });
      // swallow
    }
  }

  async getUserUsage(userId: string): Promise<UserUsage | null> {
    return this.getCurrentUsage(userId);
  }
}

// Singleton
export const usageTracker = new UsageTrackerService();

/** Convenience for API handlers: enforce and increment in one call. */
export async function checkAndRecordUsage(
  userId: string,
  testCasesCount: number = 1
): Promise<UsageResult> {
  const result = await usageTracker.canGenerateTestCases(userId, testCasesCount);
  if (!result.allowed) {
    // Return a clean error up the stack—no internal details
    throw new Error(result.error || "Usage limit exceeded");
  }
  await usageTracker.recordTestCaseGeneration(userId, testCasesCount);
  return result;
}

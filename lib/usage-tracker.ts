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

function redactId(id: string | undefined | null) {
  if (!id) return "redacted";
  return id.slice(0, 6) + "…";
}
function dlog(msg: string, meta?: Record<string, unknown>) {
  try {
    const safe = meta
      ? JSON.stringify(
          Object.fromEntries(
            Object.entries(meta).map(([k, v]) =>
              /id|email|token|key/i.test(k)
                ? [k, typeof v === "string" ? redactId(v) : "redacted"]
                : [k, v],
            ),
          ),
        )
      : "";
  } catch {}
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
      dlog("getCurrentUsage error", { userId, error: error.code });
      return null;
    }
    return data;
  }

  private async getUserSubscription(
    userId: string,
  ): Promise<UserSubscription | null> {
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

  async canGenerateTestCases(
    userId: string,
    count: number = 1,
  ): Promise<UsageResult> {
    try {
      const [usage, subscription] = await Promise.all([
        this.getCurrentUsage(userId),
        this.getUserSubscription(userId),
      ]);

      if (!subscription) {
        return { allowed: false, remaining: 0, error: "User not found" };
      }

      // Plan limits
      const planLimits: Record<UserSubscription["subscription_tier"], number> =
        {
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
      dlog("canGenerateTestCases fatal", { userId: redactId(userId) });
      return {
        allowed: false,
        remaining: 0,
        error: "Failed to check usage limits",
      };
    }
  }

  async recordTestCaseGeneration(
    userId: string,
    count: number = 1,
  ): Promise<void> {
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
        dlog("recordApiCall update error", {
          userId: redactId(userId),
          code: error.code,
        });
      }
    } catch {
      dlog("recordApiCall fatal", { userId: redactId(userId) });
    }
  }

  async getUserUsage(userId: string): Promise<UserUsage | null> {
    return this.getCurrentUsage(userId);
  }
}

// Singleton
export const usageTracker = new UsageTrackerService();

export async function recordSuccessfulGeneration(
  userId: string,
  testCasesCount: number = 1,
): Promise<void> {
  await usageTracker.recordTestCaseGeneration(userId, testCasesCount);
}

// lib/usage-tracker.ts

// Create a custom error class that includes remaining count
export class UsageQuotaError extends Error {
  public remaining: number;
  public requested: number;
  public used: number;
  public limit: number;

  constructor(
    message: string,
    data: {
      remaining: number;
      requested: number;
      used: number;
      limit: number;
    },
  ) {
    super(message);
    this.name = "UsageQuotaError";
    this.remaining = data.remaining;
    this.requested = data.requested;
    this.used = data.used;
    this.limit = data.limit;
  }
}

export async function checkUsageQuota(
  userId: string,
  testCasesCount: number = 1,
): Promise<void> {
  const result = await usageTracker.canGenerateTestCases(
    userId,
    testCasesCount,
  );

  if (!result.allowed) {
    const usage = await usageTracker.getUserUsage(userId);
    const subscription = await (usageTracker as any).getUserSubscription(
      userId,
    );

    const planLimits: Record<string, number> = {
      free: 20,
      pro: 500,
      team: 2000,
      enterprise: -1,
    };

    const limit = planLimits[subscription?.subscription_tier ?? "free"] ?? 20;
    const used = usage?.test_cases_generated ?? 0;

    throw new UsageQuotaError(result.error || "Usage limit exceeded", {
      remaining: result.remaining,
      requested: testCasesCount,
      used,
      limit,
    });
  }
}

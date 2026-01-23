"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTheme as useNextTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  User,
  Settings,
  Bell,
  Shield,
  Camera,
  Trash2,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { ModelKey } from "@/lib/ai-models/config";
import { TestTypeMultiselect } from "../generator/testtype-multiselect";

type ThemeOption = "light" | "dark" | "system";

type Preferences = {
  theme: ThemeOption;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  test_case_defaults: {
    model: ModelKey;
    count: number;
    test_types: string[];
  };
};

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  preferences?: Preferences;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  notifications: { email: true, push: true, marketing: false },
  test_case_defaults: {
    model: "claude-sonnet-4-5",
    test_types: ["happy-path", "negative", "boundary"],
    count: 10,
  },
};

const MODEL_KEYS = new Set<ModelKey>([
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-opus-4-5",
  "gpt-5-mini",
  "gpt-5.2",
  "gpt-4o",
  "gpt-4o-mini",
]);

function isModelKey(v: unknown): v is ModelKey {
  return typeof v === "string" && MODEL_KEYS.has(v as ModelKey);
}

const MODEL_LABELS: Record<ModelKey, string> = {
  "claude-sonnet-4-5": "Claude Sonnet 4.5",
  "claude-haiku-4-5": "Claude Haiku 4.5",
  "claude-opus-4-5": "Claude Opus 4.5",
  "gpt-5-mini": "GPT-5 Mini",
  "gpt-5.2": "GPT-5.2",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
};

function getModelDisplayName(modelKey: string): string {
  return (MODEL_LABELS as Record<string, string>)[modelKey] ?? modelKey;
}

const MODEL_MIGRATIONS: Record<string, ModelKey> = {
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-5",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5",
  "gpt-4o-2024-11-20": "gpt-4o",
  "gpt-4o-mini-2024-07-18": "gpt-4o-mini",
};

function normalizeModel(raw: unknown): ModelKey {
  const s = typeof raw === "string" ? raw : "";
  const migrated = MODEL_MIGRATIONS[s];
  if (migrated) return migrated;

  // prefix-based normalization for dated variants
  if (s.startsWith("claude-3-5-sonnet")) return "claude-sonnet-4-5";
  if (s.startsWith("claude-3-5-haiku")) return "claude-haiku-4-5";
  if (s.startsWith("gpt-4o-mini")) return "gpt-4o-mini";
  if (s.startsWith("gpt-4o")) return "gpt-4o";

  return isModelKey(s) ? s : "claude-sonnet-4-5";
}

function safePreferences(input: unknown): Preferences {
  const p = (input ?? {}) as Partial<Preferences>;

  const theme: ThemeOption =
    p.theme === "light" || p.theme === "dark" || p.theme === "system"
      ? p.theme
      : DEFAULT_PREFERENCES.theme;

  const email = Boolean(
    p.notifications?.email ?? DEFAULT_PREFERENCES.notifications.email,
  );
  const push = Boolean(
    p.notifications?.push ?? DEFAULT_PREFERENCES.notifications.push,
  );
  const marketing = Boolean(
    p.notifications?.marketing ?? DEFAULT_PREFERENCES.notifications.marketing,
  );

  const rawTypes = (p.test_case_defaults as any)?.test_types;
  const test_types =
    Array.isArray(rawTypes) && rawTypes.every((x) => typeof x === "string")
      ? rawTypes
      : DEFAULT_PREFERENCES.test_case_defaults.test_types;

  const countRaw = p.test_case_defaults?.count;
  const count =
    typeof countRaw === "number" && Number.isFinite(countRaw) && countRaw > 0
      ? countRaw
      : DEFAULT_PREFERENCES.test_case_defaults.count;

  const model = normalizeModel(p.test_case_defaults?.model);

  return {
    theme,
    notifications: { email, push, marketing },
    test_case_defaults: { model, count, test_types },
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { setTheme: setNextTheme } = useNextTheme();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // preferences
  const [themePref, setThemePref] = useState<ThemeOption>("system");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const [defaultModel, setDefaultModel] =
    useState<ModelKey>("claude-sonnet-4-5");

  const [defaultCount, setDefaultCount] = useState(10);

  const [defaultTestTypes, setDefaultTestTypes] = useState<string[]>([
    "happy-path",
    "negative",
    "boundary",
  ]);

  useEffect(() => {
    void fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUserProfile() {
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;
      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile from user_profiles:", error);
        toast.error("Failed to load user profile");
        return;
      }

      let finalProfile = profile;

      if (!finalProfile) {
        const initialPrefs = safePreferences(
          authUser.user_metadata?.preferences ?? DEFAULT_PREFERENCES,
        );

        const { data: newProfile, error: upsertError } = await supabase
          .from("user_profiles")
          .upsert(
            {
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name ?? null,
              avatar_url: authUser.user_metadata?.avatar_url ?? null,
              preferences: initialPrefs,
            },
            { onConflict: "id" },
          )
          .select("*")
          .single();

        if (upsertError) {
          console.error("Error upserting user profile:", upsertError);
          toast.error("Failed to initialize user profile");
          return;
        }

        finalProfile = newProfile;
      }

      const prefs = safePreferences(
        finalProfile.preferences ??
          authUser.user_metadata?.preferences ??
          DEFAULT_PREFERENCES,
      );

      const userProfile: UserProfile = {
        id: authUser.id,
        email: (finalProfile.email ?? authUser.email ?? "") as string,
        full_name: (finalProfile.full_name ??
          authUser.user_metadata?.full_name ??
          "") as string,
        avatar_url: (finalProfile.avatar_url ??
          authUser.user_metadata?.avatar_url ??
          "") as string,
        created_at: (finalProfile.created_at ??
          authUser.created_at ??
          "") as string,
        preferences: prefs,
      };

      setUser(userProfile);

      // hydrate UI state
      setFullName(userProfile.full_name || "");
      setEmail(userProfile.email);
      setThemePref(prefs.theme);
      setEmailNotifications(prefs.notifications.email);
      setPushNotifications(prefs.notifications.push);
      setMarketingEmails(prefs.notifications.marketing);
      setDefaultModel(prefs.test_case_defaults.model);
      setDefaultCount(prefs.test_case_defaults.count);
      setDefaultTestTypes(prefs.test_case_defaults.test_types ?? []);

      setNextTheme(prefs.theme);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      toast.error("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl, full_name: fullName },
      });
      if (updateError) throw updateError;

      setUser((prev) =>
        prev ? { ...prev, avatar_url: data.publicUrl } : prev,
      );
      toast.success("Avatar updated successfully!");
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user?.avatar_url) return;
    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null, full_name: fullName },
      });
      if (error) throw error;

      setUser((prev) => (prev ? { ...prev, avatar_url: undefined } : prev));
      toast.success("Avatar removed successfully!");
    } catch (err) {
      console.error("Error removing avatar:", err);
      toast.error("Failed to remove avatar");
    }
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);

    try {
      const preferences: Preferences = {
        theme: themePref,
        notifications: {
          email: emailNotifications,
          push: pushNotifications,
          marketing: marketingEmails,
        },
        test_case_defaults: {
          model: defaultModel,
          count: defaultCount,
          test_types: defaultTestTypes,
        },
      };

      // 1) update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, preferences },
      });
      if (authError) throw authError;

      // 2) update user_profiles
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          full_name: fullName,
          email,
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setUser((prev) =>
        prev ? { ...prev, full_name: fullName, preferences } : prev,
      );

      // 3) apply theme
      setNextTheme(themePref);

      toast.success("Profile updated successfully!", {
        description: "Your defaults will be used in the test case generator",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    } catch (err) {
      console.error("Error updating password:", err);
      toast.error("Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  const getUserInitials = (name: string) => {
    const base = name?.trim() ? name : email;
    return base
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                Please sign in to access settings.
              </p>
              <Button onClick={() => router.push("/login")} className="mt-4">
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile details and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar_url} alt={fullName} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials(fullName)}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="avatar-upload">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadingAvatar}
                        asChild
                      >
                        <span className="cursor-pointer">
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              Upload Photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>

                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />

                    {user.avatar_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Case Defaults</CardTitle>
              <CardDescription>
                Set your default preferences for test case generation. These
                will be automatically applied when you generate test cases.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="defaultModel">Default AI Model</Label>
                  <Select
                    value={defaultModel}
                    onValueChange={(v) => {
                      if (isModelKey(v)) setDefaultModel(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-sonnet-4-5">
                        Claude Sonnet 4.5
                      </SelectItem>
                      <SelectItem value="claude-haiku-4-5">
                        Claude Haiku 4.5
                      </SelectItem>
                      <SelectItem value="claude-opus-4-5">
                        Claude Opus 4.5
                      </SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-muted-foreground">
                    Currently:{" "}
                    <span className="font-medium">
                      {getModelDisplayName(defaultModel)}
                    </span>
                  </p>
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>Default Test Types</Label>
                  <TestTypeMultiselect
                    value={defaultTestTypes}
                    onChange={(value: string[]) => setDefaultTestTypes(value)}
                    placeholder="Select default test types..."
                  />
                  <p className="text-xs text-muted-foreground">
                    These will be preselected in the generator. You can still
                    override per run.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCount">Default Test Count</Label>
                  <Select
                    value={String(defaultCount)}
                    onValueChange={(v) => setDefaultCount(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select count" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 test cases</SelectItem>
                      <SelectItem value="10">10 test cases</SelectItem>
                      <SelectItem value="15">15 test cases</SelectItem>
                      <SelectItem value="20">20 test cases</SelectItem>
                      <SelectItem value="30">30 test cases</SelectItem>
                      <SelectItem value="50">50 test cases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/20 dark:border-blue-900">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> These defaults will be applied when you
                  open the test case generator. You can override them per
                  generation.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={themePref}
                  onValueChange={(value) => {
                    const v = value as ThemeOption;
                    setThemePref(v);
                    setNextTheme(v);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about test case generation and
                      account updates
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and tips
                    </p>
                  </div>
                  <Switch
                    checked={marketingEmails}
                    onCheckedChange={setMarketingEmails}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button onClick={handleChangePassword} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>

                <Dialog
                  open={showDeleteDialog}
                  onOpenChange={setShowDeleteDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently
                        delete your account and remove all associated data.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button variant="destructive">Delete Account</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Save bar */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            Account created: {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

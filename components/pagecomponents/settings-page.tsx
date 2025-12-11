"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Settings, Bell, Shield, CreditCard, Upload, Camera, Trash2, Save, Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useTheme as useNextTheme } from "next-themes"

type ThemeOption = "light" | "dark" | "system"


interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  preferences?: {
    theme: 'light' | 'dark' | 'system'
    notifications: {
      email: boolean
      push: boolean
      marketing: boolean
    }
    test_case_defaults: {
      model: string
      coverage: string
      count: number
    }
  }
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Form states
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  
  // Preferences
  const { setTheme: setNextTheme } = useNextTheme()
  const [themePref, setThemePref] = useState<ThemeOption>("system")  
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [defaultModel, setDefaultModel] = useState('claude-3-5-sonnet-20241022')
  const [defaultCoverage, setDefaultCoverage] = useState('comprehensive')
  const [defaultCount, setDefaultCount] = useState(10)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  async function fetchUserProfile() {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      router.push("/pages/login")
      return
    }

    // Default preferences – matches your DB default
    const defaultPreferences: UserProfile["preferences"] = {
      theme: "system",
      notifications: {
        email: true,
        push: true,
        marketing: false,
      },
      test_case_defaults: {
        model: "claude-3-5-sonnet-20241022",
        coverage: "comprehensive",
        count: 10,
      },
    }

    // Try to load profile; `maybeSingle` does NOT error on 0 rows
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle()

    if (error) {
      console.error("Error loading profile from user_profiles:", error)
      toast.error("Failed to load user profile")
      return
    }

    let finalProfile = profile

// If there is no profile row yet, create-or-update one using UPSERT
if (!finalProfile) {
  const { data: newProfile, error: upsertError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        id: authUser.id, // PK, FK to auth.users
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name ?? null,
        avatar_url: authUser.user_metadata?.avatar_url ?? null,
        preferences: authUser.user_metadata?.preferences ?? defaultPreferences,
      },
      {
        onConflict: "id", // matches PRIMARY KEY (id)
      },
    )
    .select("*")
    .single()

  if (upsertError) {
    console.error("Error upserting user profile:", upsertError)
    toast.error("Failed to initialize user profile")
    return
  }

  finalProfile = newProfile
}


    // Merge preferences from profile, auth metadata, and defaults
    const preferences: UserProfile["preferences"] =
      (finalProfile.preferences as UserProfile["preferences"]) ??
      (authUser.user_metadata?.preferences as UserProfile["preferences"]) ??
      defaultPreferences

    const userProfile: UserProfile = {
      id: authUser.id,
      email: finalProfile.email ?? authUser.email ?? "",
      full_name: finalProfile.full_name ?? authUser.user_metadata?.full_name ?? "",
      avatar_url: finalProfile.avatar_url ?? authUser.user_metadata?.avatar_url ?? "",
      created_at: finalProfile.created_at ?? authUser.created_at ?? "",
      preferences,
    }

    setUser(userProfile)

    // Populate form state
    setFullName(userProfile.full_name || "")
    setEmail(userProfile.email)
    setThemePref(preferences.theme)
    setEmailNotifications(preferences.notifications.email)
    setPushNotifications(preferences.notifications.push)
    setMarketingEmails(preferences.notifications.marketing)
    setDefaultModel(preferences.test_case_defaults.model)
    setDefaultCoverage(preferences.test_case_defaults.coverage)
    setDefaultCount(preferences.test_case_defaults.count)

    // Sync theme with next-themes
    setNextTheme(preferences.theme)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    toast.error("Failed to load user profile")
  } finally {
    setLoading(false)
  }
}

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image')
      return
    }

    setUploadingAvatar(true)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: data.publicUrl,
          full_name: fullName
        }
      })

      if (updateError) throw updateError

      setUser(prev => prev ? { ...prev, avatar_url: data.publicUrl } : null)
      toast.success('Avatar updated successfully!')

    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleRemoveAvatar() {
    if (!user?.avatar_url) return

    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          avatar_url: null,
          full_name: fullName
        }
      })

      if (error) throw error

      setUser(prev => prev ? { ...prev, avatar_url: undefined } : null)
      toast.success('Avatar removed successfully!')

    } catch (error) {
      console.error('Error removing avatar:', error)
      toast.error('Failed to remove avatar')
    }
  }

  async function handleSaveProfile() {
  if (!user) return

  setSaving(true)

  try {
    const preferences = {
      theme: themePref,
      notifications: {
        email: emailNotifications,
        push: pushNotifications,
        marketing: marketingEmails,
      },
      test_case_defaults: {
        model: defaultModel,
        coverage: defaultCoverage,
        count: defaultCount,
      },
    }

    // 1) keep auth metadata in sync
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        preferences,
      },
    })
    if (authError) throw authError

    // 2) persist in user_profiles
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        full_name: fullName,
        email,
        preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (profileError) throw profileError

    setUser((prev) =>
      prev
        ? {
            ...prev,
            full_name: fullName,
            preferences,
          }
        : null,
    )

    // 3) apply theme to UI immediately
    setNextTheme(themePref)

    toast.success("Profile updated successfully!")
  } catch (error) {
    console.error("Error updating profile:", error)
    toast.error("Failed to update profile")
  } finally {
    setSaving(false)
  }
}


  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      toast.success('Password updated successfully!')

    } catch (error) {
      console.error('Error updating password:', error)
      toast.error('Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading settings...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Please sign in to access settings.</p>
              <Button 
                onClick={() => router.push('/pages/login')} 
                className="mt-4"
              >
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile details and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar_url} alt={fullName} />
                  <AvatarFallback className="text-lg">
                    {fullName ? getUserInitials(fullName) : getUserInitials(email)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="avatar-upload">
                      <Button variant="outline" size="sm" disabled={uploadingAvatar} asChild>
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

              {/* Profile Fields */}
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

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Case Defaults</CardTitle>
              <CardDescription>
                Set your default preferences for test case generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultModel">Default AI Model</Label>
                  <Select value={defaultModel} onValueChange={setDefaultModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCoverage">Default Coverage</Label>
                  <Select value={defaultCoverage} onValueChange={setDefaultCoverage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                      <SelectItem value="exhaustive">Exhaustive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCount">Default Test Count</Label>
                  <Select value={defaultCount.toString()} onValueChange={(v) => setDefaultCount(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 test cases</SelectItem>
                      <SelectItem value="10">10 test cases</SelectItem>
                      <SelectItem value="15">15 test cases</SelectItem>
                      <SelectItem value="20">20 test cases</SelectItem>
                      <SelectItem value="30">30 test cases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          const v = value as ThemeOption
          setThemePref(v)
          setNextTheme(v)      // updates shadcn / next-themes immediately
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

        {/* Notifications Tab */}
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
                      Receive notifications about test case generation and account updates
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

        {/* Security Tab */}
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
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  'Update Password'
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
                
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all associated data.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive">
                        Delete Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
            
          </Card>
          
        </TabsContent>
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
  )
}
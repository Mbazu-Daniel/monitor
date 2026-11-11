"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, RoleBadge, PageHeader, formatDateTime } from "@/components/maintenance/shared";
import { Loader2, Save, KeyRound, Mail, Building, Phone, Hash } from "lucide-react";

export function ProfileView() {
  const { user, setUser } = useAppStore();
  const [name, setName] = useState(user?.name || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Name must be at least 2 characters.");
    setSavingProfile(true);
    try {
      const res = await api<{ user: typeof user }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), department, phone }),
      });
      if (res.user) setUser({ ...user, ...res.user });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return toast.error("New password must be 8+ characters with letters and numbers.");
    }
    setSavingPwd(true);
    try {
      const res = await api<{ success?: boolean; error?: string }>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="My Profile" description="Manage your personal information and password." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar name={user.name} className="h-20 w-20 text-2xl" />
            <p className="mt-3 font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2"><RoleBadge role={user.role} /></div>
            <Separator className="my-4 w-full" />
            <ul className="w-full space-y-2 text-left text-sm">
              <li className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{user.email}</span></li>
              <li className="flex items-center gap-2 text-muted-foreground"><Building className="h-4 w-4 shrink-0" /><span className="truncate">{user.department || "No department set"}</span></li>
              <li className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 shrink-0" /><span className="truncate">{user.phone || "No phone set"}</span></li>
              {user.matricNo && <li className="flex items-center gap-2 text-muted-foreground"><Hash className="h-4 w-4 shrink-0" /><span className="truncate">{user.matricNo}</span></li>}
              <li className="flex items-center gap-2 text-muted-foreground"><KeyRound className="h-4 w-4 shrink-0" />Member since {formatDateTime(user.createdAt)}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Personal information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name">Full name</Label>
                <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-dept">Department / Faculty</Label>
                <Input id="pf-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-phone">Phone</Label>
                <Input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0803 000 0000" />
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Change password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-cpwd">Current password</Label>
                <Input id="pf-cpwd" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-npwd">New password</Label>
                <Input id="pf-npwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">8+ characters, with letters and numbers.</p>
              </div>
              <Button type="submit" variant="outline" disabled={savingPwd}>
                {savingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

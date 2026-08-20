import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { navigateToAppPath } from "@/lib/appNavigation";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    setLoading(true);
    try {
      await appClient.auth.resetPassword({ resetToken, newPassword });
      navigateToAppPath('/login');
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) return <AuthLayout icon={AlertTriangle} title="Invalid reset link" subtitle="This password reset link is missing or invalid" footer={<Link to="/forgot-password" className="text-primary font-medium hover:underline">Request a new link</Link>}><p className="text-sm text-foreground text-center">The link you used appears to be incomplete. Please request a new password reset email.</p></AuthLayout>;

  return <AuthLayout icon={Lock} title="New password" subtitle="Enter your new password below">
    {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput id="password" label="New Password" value={newPassword} onChange={setNewPassword} autoFocus />
      <PasswordInput id="confirm" label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} />
      <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : "Reset password"}</Button>
    </form>
  </AuthLayout>;
}

function PasswordInput({ id, label, value, onChange, autoFocus }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id={id} type="password" autoComplete="new-password" autoFocus={autoFocus} placeholder="••••••••" value={value} onChange={e => onChange(e.target.value)} className="pl-10 h-12" required /></div></div>; }

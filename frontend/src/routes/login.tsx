import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import React, { useState } from "react";
import { authService } from "@/services/mockApi";
import { useAuthStore } from "@/stores/auth";

import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — fakebook" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("ada@fakebook.app");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await authService.login(email, password);
      signIn(user);
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };
  return <AuthShell title="Welcome back" subtitle="Sign in to your fakebook account.">
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label>Password</Label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
        </div>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
      <p className="text-center text-sm text-muted-foreground">
        New here? <Link to="/register" className="text-primary font-medium hover:underline">Create an account</Link>
      </p>
    </form>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-gradient-to-br from-primary to-fuchsia-600 text-primary-foreground p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><Sparkles className="h-5 w-5" /></div>
          <span className="font-bold text-lg">fakebook</span>
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight max-w-md">A calmer place for the people and ideas you care about.</h1>
          <p className="mt-4 text-white/80 max-w-md">fakebook is a community-first social network — built for conversations that last longer than a scroll.</p>
        </div>
        <p className="text-xs text-white/60">© fakebook 2026 — demo only.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden mb-8 inline-flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
            <span className="font-bold text-lg">fakebook</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

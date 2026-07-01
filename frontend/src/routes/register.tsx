import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { authService } from "@/services/mockApi";
import { useAuthStore } from "@/stores/auth";
import { AuthShell } from "./login";

import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — fakebook" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();
  return (
    <AuthShell title="Create your account" subtitle="Two minutes and you're in.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const { user } = await authService.register(form);
            signIn(user);
            navigate({ to: "/" });
          } catch (err: any) {
            toast.error(err.message || "Failed to create account");
          } finally {
            setLoading(false);
          }
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

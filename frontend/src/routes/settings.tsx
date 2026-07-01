import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading, refresh } = useAuth();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [nickname, setNickname] = useState("");
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirst(user.first_name);
    setLast(user.last_name);
    setNickname(user.nickname ?? "");
    setAbout(user.about_me ?? "");
    setAvatar(user.avatar ?? "");
    setIsPublic(user.is_public ?? true);
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/profile/update", {
        method: "PUT",
        body: { first_name: first, last_name: last, avatar, nickname, about_me: about },
      });
      toast.success("Saved");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const togglePrivacy = async () => {
    const next = !isPublic;
    setIsPublic(next);
    try {
      await apiFetch("/api/profile/toggle-privacy", { method: "POST", body: { is_public: next } });
      toast.success(next ? "Profile is public" : "Profile is private");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setIsPublic(!next);
    }
  };

  return (
    <AppShell>
      <h1 className="font-display text-4xl uppercase tracking-tighter">Settings</h1>
      <form onSubmit={save} className="brutalist-card p-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="First name">
            <input value={first} onChange={(e) => setFirst(e.target.value)} className="w-full brutalist-input" />
          </Labeled>
          <Labeled label="Last name">
            <input value={last} onChange={(e) => setLast(e.target.value)} className="w-full brutalist-input" />
          </Labeled>
        </div>
        <Labeled label="Nickname">
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full brutalist-input" />
        </Labeled>
        <Labeled label="Avatar URL">
          <input value={avatar} onChange={(e) => setAvatar(e.target.value)} className="w-full brutalist-input" />
        </Labeled>
        <Labeled label="About">
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} className="w-full brutalist-input" />
        </Labeled>
        <button disabled={saving} className="brutalist-btn bg-brand-acid px-6 py-2 font-display uppercase text-sm" style={{ background: "var(--brand-acid)" }}>
          {saving ? "…" : "Save"}
        </button>
      </form>

      <div className="brutalist-card p-6 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg uppercase">Privacy</h3>
          <p className="text-xs text-gray-500 mt-1">
            {isPublic ? "Anyone can see your profile & posts." : "Only accepted followers can see your profile."}
          </p>
        </div>
        <button onClick={togglePrivacy} className="brutalist-btn bg-white px-4 py-2 font-display text-xs uppercase">
          {isPublic ? "Make private" : "Make public"}
        </button>
      </div>
    </AppShell>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest mb-1">{label}</span>
      {children}
    </label>
  );
}

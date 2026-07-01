import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [nickname, setNickname] = useState("");
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          first_name: first,
          last_name: last,
          date_of_birth: dob,
          nickname: nickname || undefined,
          about_me: about || undefined,
          avatar: avatar || undefined,
        });
      }
      toast.success(mode === "login" ? "Signed in" : "Welcome");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-brand-surface">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand-black text-white" style={{ background: "var(--brand-black)" }}>
        <div className="font-display text-4xl uppercase italic tracking-tighter">
          SOCIAL/<span className="text-brand-orange">FORUM</span>
        </div>
        <div>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tighter">
            Signals<br />
            <span className="text-brand-acid">worth</span><br />
            sharing.
          </h1>
          <p className="mt-6 text-sm text-white/70 max-w-md">
            A brutalist social network. Posts, groups, events, and realtime chat — with the volume turned up.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          v1.0 • edition brutale
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="brutalist-card w-full max-w-md p-8">
          <div className="flex gap-2 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 brutalist-btn py-2 font-display text-xs uppercase ${
                  mode === m ? "bg-brand-acid" : "bg-white"
                }`}
                style={mode === m ? { background: "var(--brand-acid)" } : undefined}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full brutalist-input" />
            </Field>
            <Field label="Password">
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full brutalist-input" />
            </Field>
            {mode === "register" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name">
                    <input required value={first} onChange={(e) => setFirst(e.target.value)} className="w-full brutalist-input" />
                  </Field>
                  <Field label="Last name">
                    <input required value={last} onChange={(e) => setLast(e.target.value)} className="w-full brutalist-input" />
                  </Field>
                </div>
                <Field label="Date of birth">
                  <input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full brutalist-input" />
                </Field>
                <Field label="Nickname (optional)">
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full brutalist-input" />
                </Field>
                <Field label="Avatar URL (optional)">
                  <input value={avatar} onChange={(e) => setAvatar(e.target.value)} className="w-full brutalist-input" />
                </Field>
                <Field label="About (optional)">
                  <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={2} className="w-full brutalist-input" />
                </Field>
              </>
            )}
            <button disabled={submitting} className="w-full brutalist-btn bg-brand-black text-white py-3 font-display uppercase text-sm mt-2" style={{ background: "var(--brand-black)", color: "white" }}>
              {submitting ? "…" : mode === "login" ? "Enter" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest mb-1">{label}</span>
      {children}
    </label>
  );
}

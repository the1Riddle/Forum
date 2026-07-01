import { useEffect, useState } from "react";
import { useAuth } from "../auth";
import { apiFetch } from "../api";

export default function Settings() {
  const { user, refresh } = useAuth();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [nickname, setNickname] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    setFirst(user.first_name);
    setLast(user.last_name);
    setNickname(user.nickname ?? "");
    setAbout(user.about_me ?? "");
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await apiFetch("/profile/update", {
        method: "PUT",
        body: { first_name: first, last_name: last, nickname, about_me: about },
      });
      await refresh();
      setMsg("Saved");
    } catch (err: any) {
      setMsg(err.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <form onSubmit={save} className="card form">
        <label className="field">
          <span>First name</span>
          <input value={first} onChange={(e) => setFirst(e.target.value)} className="input" />
        </label>
        <label className="field">
          <span>Last name</span>
          <input value={last} onChange={(e) => setLast(e.target.value)} className="input" />
        </label>
        <label className="field">
          <span>Nickname</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="input" />
        </label>
        <label className="field">
          <span>About</span>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} className="input" />
        </label>
        {msg && <p className={msg === "Saved" ? "success" : "error-msg"}>{msg}</p>}
        <button disabled={busy} className="btn-primary">{busy ? "..." : "Save"}</button>
      </form>
    </div>
  );
}

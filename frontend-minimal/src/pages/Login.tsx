import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ email, password, first_name: first, last_name: last, date_of_birth: dob });
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">FORUM</h1>
        <div className="tabs">
          <button
            className={`tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            className={`tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {mode === "register" && (
            <>
              <div className="row">
                <label className="field">
                  <span>First name</span>
                  <input required value={first} onChange={(e) => setFirst(e.target.value)} />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input required value={last} onChange={(e) => setLast(e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Date of birth</span>
                <input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </label>
            </>
          )}
          <button disabled={busy} className="btn-primary" type="submit">
            {busy ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import { WorkspaceStatus } from "../lib/workspaceConfig.js";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin@talentsync.demo");
  const [password, setPassword] = useState("admin123");
  const [loginMessage, setLoginMessage] = useState("Use one of the sample accounts below.");
  const [isLoginPending, setIsLoginPending] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setIsLoginPending(true);
    setLoginMessage("Signing in...");
    try {
      await onLogin(email, password);
    } catch (error) {
      setLoginMessage(String(error));
    } finally {
      setIsLoginPending(false);
    }
  };

  return (
    <main className="loginShell">
      <section className="loginCard">
        <p className="kicker">TalentSync</p>
        <h1>Sign In</h1>
        <p className="subtitle">
          Use a simple backend login so the recruiter and candidate sides stay separate.
        </p>

        <p className={WorkspaceStatus.getClassName(loginMessage)}>{loginMessage}</p>

        <form className="loginForm" onSubmit={submitLogin}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@talentsync.demo" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="admin123" />
          </label>
          <button type="submit" disabled={isLoginPending}>Sign In</button>
        </form>

        <div className="loginGrid">
          <button className="loginOption" onClick={() => {
            setEmail("admin@talentsync.demo");
            setPassword("admin123");
          }}>
            <span className="loginRole">Recruiter Account</span>
            <strong>Recruiter Workspace</strong>
            <span>admin@talentsync.demo / admin123</span>
          </button>
          <button className="loginOption" onClick={() => {
            setEmail("candidate@talentsync.demo");
            setPassword("candidate123");
          }}>
            <span className="loginRole">Candidate Account</span>
            <strong>Candidate Workspace</strong>
            <span>candidate@talentsync.demo / candidate123</span>
          </button>
        </div>
      </section>
    </main>
  );
}

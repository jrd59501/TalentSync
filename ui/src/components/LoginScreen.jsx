import { useState } from "react";
import { WorkspaceStatus } from "../lib/workspaceConfig.js";
import PropTypes from "../lib/propTypes.js";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin@talentsync.demo");
  const [password, setPassword] = useState("TalentSyncRecruiter2026!");
  const [loginMessage, setLoginMessage] = useState("Use the built-in demo accounts below for recruiter and candidate access.");
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
        <div className="loginHero">
          <div className="loginHeroInner">
            <div className="loginBrand">
              <span className="loginBrandMark">TS</span>
              <span className="loginBrandName">TalentSync</span>
            </div>
            <h2 className="loginHeroHeadline">Hire smarter,<br />match faster.</h2>
            <ul className="loginHeroFeatures">
              <li>AI-powered job-candidate matching</li>
              <li>Resume parsing &amp; profile extraction</li>
              <li>End-to-end application tracking</li>
            </ul>
          </div>
        </div>

        <div className="loginFormPane">
          <p className="kicker">Welcome back</p>
          <h1 className="loginFormTitle">Sign in</h1>
          <p className="subtitle">Access the recruiter or candidate workspace.</p>

          <p className={WorkspaceStatus.getClassName(loginMessage)}>{loginMessage}</p>

          <form className="loginForm" onSubmit={submitLogin}>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@talentsync.demo" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter demo password" />
            </label>
            <button type="submit" disabled={isLoginPending}>Sign In</button>
          </form>

          <p className="loginDivider">Quick access</p>

          <div className="loginGrid">
            <button className="loginOption" onClick={() => {
              setEmail("admin@talentsync.demo");
              setPassword("TalentSyncRecruiter2026!");
            }}>
              <span className="loginRole">Recruiter</span>
              <strong>Recruiter Workspace</strong>
              <span>admin@talentsync.demo</span>
            </button>
            <button className="loginOption" onClick={() => {
              setEmail("candidate@talentsync.demo");
              setPassword("TalentSyncCandidate2026!");
            }}>
              <span className="loginRole">Candidate</span>
              <strong>Candidate Workspace</strong>
              <span>candidate@talentsync.demo</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

LoginScreen.propTypes = {
  onLogin: PropTypes.func.isRequired
};

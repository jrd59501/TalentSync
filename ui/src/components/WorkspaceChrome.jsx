import { SECTION_DEFINITIONS } from "../lib/workspaceConfig.js";

export function WorkspaceHeader({ currentUser, onLogout, jobsCount, candidatesCount, matchesCount, applicationCount }) {
  const isAdmin = currentUser.role === "admin";

  return (
    <header className="topHeader">
      <div className="titleBlock">
        <p className="kicker">{isAdmin ? "Recruiter Portal" : "Candidate Portal"}</p>
        <h1>{isAdmin ? "Recruiter Workspace" : "Candidate Workspace"}</h1>
        <p className="subtitle">
          Signed in as {currentUser.name} ({currentUser.email}).
        </p>
      </div>

      <div className="headerActions">
        <div className="statsRow" aria-label="Workspace summary">
          {isAdmin ? (
            <>
              <div className="statCard">
                <span className="statLabel">Jobs</span>
                <strong>{jobsCount}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Candidates</span>
                <strong>{candidatesCount}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Matches</span>
                <strong>{matchesCount}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="statCard">
                <span className="statLabel">Open Jobs</span>
                <strong>{jobsCount}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Matches</span>
                <strong>{matchesCount}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Applications</span>
                <strong>{applicationCount}</strong>
              </div>
            </>
          )}
        </div>
        <button className="ghost" onClick={onLogout}>Switch Demo User</button>
      </div>
    </header>
  );
}

export function WorkflowStrip({ title, steps }) {
  return (
    <section className="workflowStrip" aria-label={title}>
      <p className="workflowTitle">{title}</p>
      <div className="workflowSteps">
        {steps.map((step, index) => (
          <div key={`${title}-${step}`} className="workflowStep">
            <span className="workflowNumber">{index + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SectionTabs({ currentUser, activeView, onChange }) {
  const options = SECTION_DEFINITIONS.filter((section) => section.getRole() === currentUser.role);

  return (
    <nav className="viewTabs" aria-label="Workspace sections">
      {options.map((view) => (
        <button
          key={view.getId()}
          className={activeView === view.getId() ? "tabButton active" : "tabButton"}
          onClick={() => onChange(view.getId())}
        >
          {view.getLabel()}
        </button>
      ))}
    </nav>
  );
}

export function SectionIntro({ title, text }) {
  return (
    <>
      <h2>{title}</h2>
      <p className="panelText">{text}</p>
    </>
  );
}

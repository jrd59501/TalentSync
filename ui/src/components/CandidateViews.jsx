import { SectionIntro } from "./WorkspaceChrome.jsx";
import { WorkspaceFormatter, WorkspaceStatus } from "../lib/workspaceConfig.js";
import PropTypes from "../lib/propTypes.js";

export function CandidateProfileView(props) {
  const {
    candidateStatusMessage,
    candidateDraftMode,
    candidateNameInput,
    setCandidateNameInput,
    candidateEmailInput,
    setCandidateEmailInput,
    candidateResumeInput,
    setCandidateResumeInput,
    resumeChars,
    candidateStrengthsInput,
    setCandidateStrengthsInput,
    candidateSkillsInput,
    setCandidateSkillsInput,
    candidateSummaryInput,
    setCandidateSummaryInput,
    canBuildCandidateFromResume,
    isCandidateRequestPending,
    previewCandidateProfile,
    saveCandidate,
    canRunMatchForCurrentProfile,
    isMatchRequestPending,
    runMatchForCurrentProfile,
    candidateSkillList
  } = props;

  return (
    <section className="contentGrid" aria-label="Profile section">
      <article className="panel">
        <SectionIntro title="My Profile" text="This is the candidate side. Build your profile here, then use it to find matching jobs." />
        <p className={WorkspaceStatus.getClassName(candidateStatusMessage)}>{candidateStatusMessage}</p>
        {candidateDraftMode && <p className="metaRow">Current extraction mode: {candidateDraftMode}</p>}

        <label>
          Full Name
          <input value={candidateNameInput} onChange={(event) => setCandidateNameInput(event.target.value)} placeholder="Jane Doe" />
        </label>
        <label>
          Email
          <input value={candidateEmailInput} onChange={(event) => setCandidateEmailInput(event.target.value)} placeholder="jane@example.com" />
        </label>
        <label>
          Resume Text
          <textarea rows={6} value={candidateResumeInput} onChange={(event) => setCandidateResumeInput(event.target.value)} placeholder="Paste resume text here..." />
          <span className="fieldHint">{resumeChars} characters. Preview unlocks at 20+.</span>
        </label>

        <details className="optionalBlock">
          <summary>Optional fields</summary>
          <label>
            Strengths
            <textarea rows={4} value={candidateStrengthsInput} onChange={(event) => setCandidateStrengthsInput(event.target.value)} placeholder="What you do best" />
          </label>
          <label>
            Skills
            <input value={candidateSkillsInput} onChange={(event) => setCandidateSkillsInput(event.target.value)} placeholder="node, typescript, sql" />
          </label>
          <label>
            Experience Summary
            <textarea rows={4} value={candidateSummaryInput} onChange={(event) => setCandidateSummaryInput(event.target.value)} placeholder="Short experience summary" />
          </label>
        </details>

        <div className="buttonRow">
          <button onClick={previewCandidateProfile} disabled={!canBuildCandidateFromResume || isCandidateRequestPending}>Preview Profile</button>
          <button className="ghost" onClick={saveCandidate} disabled={isCandidateRequestPending}>Save Profile</button>
          <button onClick={() => runMatchForCurrentProfile("opportunities")} disabled={!canRunMatchForCurrentProfile || isMatchRequestPending}>Find Matches</button>
        </div>
      </article>

      <article className="panel">
        <SectionIntro title="Profile Summary" text="Build the profile on the left, then review the extracted details on the right." />
        <p className="metaRow">Name: {candidateNameInput || "Not set yet"}</p>
        <p className="metaRow">Email: {candidateEmailInput || "Not set yet"}</p>
        <p className="reasonText">{candidateSummaryInput || "No summary yet. Preview or type a summary to describe experience."}</p>
        <div className="chips">
          {candidateSkillList.length === 0 && <span className="chip">No skills added yet</span>}
          {candidateSkillList.map((skill) => (
            <span key={skill} className="chip">{skill}</span>
          ))}
        </div>
      </article>
    </section>
  );
}

export function CandidateOpportunitiesView(props) {
  const {
    matchStatusMessage,
    canRunMatchForCurrentProfile,
    isMatchRequestPending,
    runMatchForCurrentProfile,
    setActiveView,
    matchResults,
    startMockApplication,
    contactForJob,
    jobs
  } = props;

  return (
    <section className="contentGrid" aria-label="Opportunities section">
      <article className="panel">
        <SectionIntro title="My Job Matches" text="Use this page as the candidate-facing job board. It prioritizes matched jobs when available." />
        <p className={WorkspaceStatus.getClassName(matchStatusMessage)}>{matchStatusMessage}</p>

        <div className="buttonRow">
          <button onClick={() => runMatchForCurrentProfile("opportunities")} disabled={!canRunMatchForCurrentProfile || isMatchRequestPending}>Refresh Matches</button>
          <button className="ghost" onClick={() => setActiveView("profile")}>Back to Profile</button>
        </div>

        <div className="listStack">
          {matchResults.length > 0 ? (
            matchResults.slice(0, 20).map((match, index) => (
              <section key={`${match.jobId}-${index}`} className="listCard">
                <div className="listCardHead">
                  <div>
                    <h3>{match.jobTitle}</h3>
                    <p>Job #{match.jobId}</p>
                  </div>
                  <div className="scorePill">{match.score}</div>
                </div>
                <p className="metricRow">
                  <span>Skill: {match.skillScore}</span>
                  <span>Experience: {match.experienceScore}</span>
                  <span>AI: {typeof match.aiScore === "number" ? match.aiScore : "n/a"}</span>
                </p>
                {match.aiReason && <p className="reasonText">{match.aiReason}</p>}
                <div className="buttonRow">
                  <button onClick={() => startMockApplication({ id: match.jobId, title: match.jobTitle, category: null })}>Apply</button>
                  <button className="ghost" onClick={() => contactForJob({ id: match.jobId, title: match.jobTitle, category: null })}>Email Hiring Team</button>
                </div>
              </section>
            ))
          ) : (
            jobs.slice(0, 20).map((job) => (
              <section key={job.id} className="listCard">
                <div className="listCardHead">
                  <div>
                    <h3>{job.title}</h3>
                    <p>#{job.id} · {job.category || "Uncategorized"}</p>
                  </div>
                </div>
                <p className="chips">
                  {WorkspaceFormatter.safeArray(job.requiredSkills).slice(0, 8).map((skill) => (
                    <span key={`${job.id}-${skill}`} className="chip">{skill}</span>
                  ))}
                </p>
                <div className="buttonRow">
                  <button onClick={() => startMockApplication(job)}>Apply</button>
                  <button className="ghost" onClick={() => contactForJob(job)}>Email Hiring Team</button>
                </div>
              </section>
            ))
          )}
        </div>
      </article>

      <article className="panel">
        <SectionIntro title="Job Board Notes" text="If there are no match results yet, this page falls back to the job catalog so the candidate view still has something useful to show." />
        <p className="metaRow">Matched jobs: {matchResults.length}</p>
        <p className="metaRow">Available jobs: {jobs.length}</p>
        <p className="panelText">This keeps the candidate side realistic without adding a more complex search flow.</p>
      </article>
    </section>
  );
}

export function CandidateApplicationsView(props) {
  const {
    applicationStatusMessage,
    applicationTargetJob,
    applicationNameInput,
    setApplicationNameInput,
    applicationEmailInput,
    setApplicationEmailInput,
    applicationNoteInput,
    setApplicationNoteInput,
    submitMockApplication,
    canSubmitMockApplication,
    isApplicationPending,
    loadApplications,
    currentUser,
    contactForJob,
    isApplicationListPending,
    submittedApplications
  } = props;

  return (
    <section className="contentGrid" aria-label="Applications section">
      <article className="panel">
        <SectionIntro title="Apply to a Job" text="The candidate side uses a dedicated application page so the flow feels separated from recruiter tools." />
        <p className={WorkspaceStatus.getClassName(applicationStatusMessage)}>{applicationStatusMessage}</p>
        <p className="applyMeta">
          {applicationTargetJob
            ? `Selected job #${applicationTargetJob.id}: ${applicationTargetJob.title}`
            : "No job selected yet. Go to Opportunities and click Apply."}
        </p>

        {applicationTargetJob && (
          <p className="applyMeta">
            Application URL:{" "}
            <a href={WorkspaceFormatter.buildMockApplyUrl(applicationTargetJob.id)} target="_blank" rel="noreferrer">
              {WorkspaceFormatter.buildMockApplyUrl(applicationTargetJob.id)}
            </a>
          </p>
        )}

        <label>
          Applicant Name
          <input value={applicationNameInput} onChange={(event) => setApplicationNameInput(event.target.value)} placeholder="Jane Doe" />
        </label>
        <label>
          Applicant Email
          <input value={applicationEmailInput} onChange={(event) => setApplicationEmailInput(event.target.value)} placeholder="jane@example.com" />
        </label>
        <label>
          Note
          <textarea rows={4} value={applicationNoteInput} onChange={(event) => setApplicationNoteInput(event.target.value)} placeholder="Short intro and availability" />
        </label>

        <div className="buttonRow">
          <button onClick={submitMockApplication} disabled={!canSubmitMockApplication || isApplicationPending}>Submit Application</button>
          <button className="ghost" onClick={() => loadApplications(applicationEmailInput || currentUser.email)} disabled={isApplicationListPending || isApplicationPending}>Refresh History</button>
          {applicationTargetJob && (
            <button className="ghost" onClick={() => contactForJob(applicationTargetJob)} disabled={isApplicationPending}>Open Email Draft</button>
          )}
        </div>
      </article>

      <article className="panel">
        <SectionIntro title="My Application History" text="This list shows submitted applications and the current status for each one." />

        <div className="listStack">
          {isApplicationListPending && <p className="emptyText">Loading applications...</p>}
          {submittedApplications.length === 0 && <p className="emptyText">No applications yet. Start from Opportunities to apply for a job.</p>}
          {submittedApplications.map((application) => (
            <section key={application.id} className="listCard">
              <div className="listCardHead">
                <div>
                  <h3>{application.jobTitle}</h3>
                  <p>{application.id}</p>
                </div>
                <div className="scorePill">{application.status}</div>
              </div>
              <p className="metaRow">Submitted {WorkspaceFormatter.formatDate(application.submittedAt)}</p>
              {application.note && <p className="reasonText">{application.note}</p>}
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}

const applicationShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  jobTitle: PropTypes.string.isRequired,
  note: PropTypes.string,
  status: PropTypes.string.isRequired,
  submittedAt: PropTypes.string.isRequired
});

const jobShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  category: PropTypes.string,
  requiredSkills: PropTypes.array
});

const matchShape = PropTypes.shape({
  jobId: PropTypes.number.isRequired,
  jobTitle: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  skillScore: PropTypes.number.isRequired,
  experienceScore: PropTypes.number.isRequired,
  aiScore: PropTypes.number,
  aiReason: PropTypes.string
});

const currentUserShape = PropTypes.shape({
  email: PropTypes.string.isRequired
});

CandidateProfileView.propTypes = {
  candidateStatusMessage: PropTypes.string.isRequired,
  candidateDraftMode: PropTypes.string.isRequired,
  candidateNameInput: PropTypes.string.isRequired,
  setCandidateNameInput: PropTypes.func.isRequired,
  candidateEmailInput: PropTypes.string.isRequired,
  setCandidateEmailInput: PropTypes.func.isRequired,
  candidateResumeInput: PropTypes.string.isRequired,
  setCandidateResumeInput: PropTypes.func.isRequired,
  resumeChars: PropTypes.number.isRequired,
  candidateStrengthsInput: PropTypes.string.isRequired,
  setCandidateStrengthsInput: PropTypes.func.isRequired,
  candidateSkillsInput: PropTypes.string.isRequired,
  setCandidateSkillsInput: PropTypes.func.isRequired,
  candidateSummaryInput: PropTypes.string.isRequired,
  setCandidateSummaryInput: PropTypes.func.isRequired,
  canBuildCandidateFromResume: PropTypes.bool.isRequired,
  isCandidateRequestPending: PropTypes.bool.isRequired,
  previewCandidateProfile: PropTypes.func.isRequired,
  saveCandidate: PropTypes.func.isRequired,
  canRunMatchForCurrentProfile: PropTypes.bool.isRequired,
  isMatchRequestPending: PropTypes.bool.isRequired,
  runMatchForCurrentProfile: PropTypes.func.isRequired,
  candidateSkillList: PropTypes.arrayOf(PropTypes.string).isRequired
};

CandidateOpportunitiesView.propTypes = {
  matchStatusMessage: PropTypes.string.isRequired,
  canRunMatchForCurrentProfile: PropTypes.bool.isRequired,
  isMatchRequestPending: PropTypes.bool.isRequired,
  runMatchForCurrentProfile: PropTypes.func.isRequired,
  setActiveView: PropTypes.func.isRequired,
  matchResults: PropTypes.arrayOf(matchShape).isRequired,
  startMockApplication: PropTypes.func.isRequired,
  contactForJob: PropTypes.func.isRequired,
  jobs: PropTypes.arrayOf(jobShape).isRequired
};

CandidateApplicationsView.propTypes = {
  applicationStatusMessage: PropTypes.string.isRequired,
  applicationTargetJob: jobShape,
  applicationNameInput: PropTypes.string.isRequired,
  setApplicationNameInput: PropTypes.func.isRequired,
  applicationEmailInput: PropTypes.string.isRequired,
  setApplicationEmailInput: PropTypes.func.isRequired,
  applicationNoteInput: PropTypes.string.isRequired,
  setApplicationNoteInput: PropTypes.func.isRequired,
  submitMockApplication: PropTypes.func.isRequired,
  canSubmitMockApplication: PropTypes.bool.isRequired,
  isApplicationPending: PropTypes.bool.isRequired,
  loadApplications: PropTypes.func.isRequired,
  currentUser: currentUserShape.isRequired,
  contactForJob: PropTypes.func.isRequired,
  isApplicationListPending: PropTypes.bool.isRequired,
  submittedApplications: PropTypes.arrayOf(applicationShape).isRequired
};

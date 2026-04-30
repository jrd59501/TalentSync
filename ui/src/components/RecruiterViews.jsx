import { useState } from "react";
import { SectionIntro } from "./WorkspaceChrome.jsx";
import { WorkspaceFormatter, WorkspaceStatus } from "../lib/workspaceConfig.js";
import { WorkspaceApi } from "../lib/workspaceApi.js";
import PropTypes from "../lib/propTypes.js";

export function RecruiterJobsView(props) {
  const {
    jobStatusMessage,
    jobImportText,
    setJobImportText,
    jobImportChars,
    jobImportCategory,
    setJobImportCategory,
    jobImportSourceType,
    setJobImportSourceType,
    jobDraft,
    setJobDraft,
    canImportJob,
    isJobRequestPending,
    previewJobDraft,
    saveJobDraft,
    loadJobs,
    jobFilterCategory,
    setJobFilterCategory,
    jobCategories,
    jobFilterQuery,
    setJobFilterQuery,
    setJobFilterCategoryAndReload,
    jobs,
    deleteJobById
  } = props;

  return (
    <section className="contentGrid" aria-label="Jobs section">
      <article className="panel">
        <SectionIntro
          title="Job Intake"
          text="Recruiters can preview and save jobs before they appear in the catalog."
        />
        <p className={WorkspaceStatus.getClassName(jobStatusMessage)}>{jobStatusMessage}</p>

        <label>
          Step 1: Paste Job Description
          <textarea rows={9} value={jobImportText} onChange={(event) => setJobImportText(event.target.value)} placeholder="Paste the job post text here..." />
          <span className="fieldHint">{jobImportChars} characters. Preview unlocks at 20+.</span>
        </label>

        <details className="optionalBlock">
          <summary>Optional fields</summary>
          <label>
            Category
            <input value={jobImportCategory} onChange={(event) => setJobImportCategory(event.target.value)} placeholder="Engineering, Healthcare, Education" />
          </label>
          <label>
            Source Type
            <input value={jobImportSourceType} onChange={(event) => setJobImportSourceType(event.target.value)} />
          </label>
        </details>

        {jobDraft && (
          <section className="draftBlock" aria-label="Job draft preview">
            <div className="draftHeader">
              <h3>Step 2: Review Draft</h3>
              <span className="draftMode">{jobDraft.extractionMode}</span>
            </div>
            <label>
              Title
              <input value={jobDraft.title} onChange={(event) => setJobDraft((current) => (current ? { ...current, title: event.target.value } : current))} />
            </label>
            <label>
              Required Skills
              <input value={jobDraft.requiredSkillsInput} onChange={(event) => setJobDraft((current) => (current ? { ...current, requiredSkillsInput: event.target.value } : current))} />
            </label>
            <label>
              Keywords
              <input value={jobDraft.meaningKeywordsInput} onChange={(event) => setJobDraft((current) => (current ? { ...current, meaningKeywordsInput: event.target.value } : current))} />
            </label>
            <label>
              Category
              <input value={jobDraft.category || ""} onChange={(event) => setJobDraft((current) => (current ? { ...current, category: event.target.value } : current))} />
            </label>
          </section>
        )}

        <div className="buttonRow">
          <button onClick={previewJobDraft} disabled={!canImportJob || isJobRequestPending}>Preview Job</button>
          <button className="ghost" onClick={saveJobDraft} disabled={!jobDraft || isJobRequestPending}>Save Job</button>
          <button className="ghost" onClick={() => loadJobs()} disabled={isJobRequestPending}>Refresh List</button>
        </div>
      </article>

      <article className="panel">
        <SectionIntro title="Job Catalog" text="Recruiters can filter, review, and remove jobs from the system." />

        <div className="filterRow">
          <label>
            Category Filter
            <select value={jobFilterCategory} onChange={(event) => setJobFilterCategory(event.target.value)}>
              <option value="">All categories</option>
              {jobCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Keyword Filter
            <input value={jobFilterQuery} onChange={(event) => setJobFilterQuery(event.target.value)} placeholder="teacher, sql, backend" />
          </label>
        </div>

        <div className="buttonRow">
          <button className="ghost" onClick={() => loadJobs()} disabled={isJobRequestPending}>Apply Filters</button>
          <button className="ghost" onClick={setJobFilterCategoryAndReload} disabled={isJobRequestPending}>Clear Filters</button>
        </div>

        <div className="listStack">
          {jobs.length === 0 && <p className="emptyText">No jobs found. Add one from Job Intake to get started.</p>}
          {jobs.map((job) => (
            <section key={job.id} className="listCard">
              <div className="listCardHead">
                <div>
                  <h3>{job.title}</h3>
                  <p>#{job.id} · {job.category || "Uncategorized"}</p>
                </div>
                <button className="danger" onClick={() => deleteJobById(job.id)} disabled={isJobRequestPending}>Delete</button>
              </div>
              <p className="metaRow">
                Source: {job.sourceType || "manual"}
                {job.createdAt ? ` · Added ${WorkspaceFormatter.formatDate(job.createdAt)}` : ""}
              </p>
              <p className="chips">
                {WorkspaceFormatter.safeArray(job.requiredSkills).slice(0, 8).map((skill) => (
                  <span key={`${job.id}-${skill}`} className="chip">{skill}</span>
                ))}
              </p>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}

export function RecruiterCandidatesView(props) {
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
    loadCandidates,
    candidates,
    loadCandidateIntoEditor,
    runMatchForSavedCandidate,
    isMatchRequestPending,
    deleteCandidateById
  } = props;

  return (
    <section className="contentGrid" aria-label="Candidates section">
      <article className="panel">
        <SectionIntro title="Candidate Builder" text="Recruiters can build or edit a candidate profile, then save it for matching." />
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
            <textarea rows={4} value={candidateStrengthsInput} onChange={(event) => setCandidateStrengthsInput(event.target.value)} placeholder="What the candidate does best" />
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
          <button onClick={previewCandidateProfile} disabled={!canBuildCandidateFromResume || isCandidateRequestPending}>Preview Candidate</button>
          <button className="ghost" onClick={saveCandidate} disabled={isCandidateRequestPending}>Save Candidate</button>
        </div>
      </article>

      <article className="panel">
        <SectionIntro title="Saved Candidates" text="Recruiters can load a candidate into the editor or run a match directly." />
        <div className="buttonRow">
          <button className="ghost" onClick={loadCandidates} disabled={isCandidateRequestPending}>Refresh List</button>
        </div>

        <div className="listStack">
          {candidates.length === 0 && <p className="emptyText">No candidates saved yet. Build or import one on the left first.</p>}
          {candidates.slice(0, 30).map((candidate) => (
            <section key={candidate.id} className="listCard">
              <div className="listCardHead">
                <div>
                  <h3>{candidate.fullName}</h3>
                  <p>#{candidate.id} · {candidate.email || "No email"}</p>
                </div>
              </div>
              <p className="chips">
                {WorkspaceFormatter.safeArray(candidate.selectedSkills).slice(0, 8).map((skill) => (
                  <span key={`${candidate.id}-${skill}`} className="chip">{skill}</span>
                ))}
              </p>
              <div className="buttonRow">
                <button className="ghost" onClick={() => loadCandidateIntoEditor(candidate)}>Load in Editor</button>
                <button onClick={() => runMatchForSavedCandidate(candidate.id)} disabled={isMatchRequestPending}>Run Match</button>
                <button className="danger" onClick={() => deleteCandidateById(candidate.id)} disabled={isCandidateRequestPending}>Delete</button>
              </div>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}

export function RecruiterMatchView(props) {
  const {
    matchStatusMessage,
    candidateSkillsInput,
    setCandidateSkillsInput,
    candidateSummaryInput,
    setCandidateSummaryInput,
    canRunMatchForCurrentProfile,
    isMatchRequestPending,
    runMatchForCurrentProfile,
    setActiveView,
    aiScoredMatches,
    matchResults
  } = props;

  return (
    <section className="contentGrid" aria-label="Match section">
      <article className="panel">
        <SectionIntro title="Match Runner" text="Recruiters run matching from the candidate currently loaded in the editor." />
        <p className={WorkspaceStatus.getClassName(matchStatusMessage)}>{matchStatusMessage}</p>

        <label>
          Skills
          <input value={candidateSkillsInput} onChange={(event) => setCandidateSkillsInput(event.target.value)} placeholder="node, typescript, sql" />
        </label>
        <label>
          Experience Summary
          <textarea rows={6} value={candidateSummaryInput} onChange={(event) => setCandidateSummaryInput(event.target.value)} placeholder="Short summary for context matching" />
        </label>

        <div className="buttonRow">
          <button onClick={() => runMatchForCurrentProfile("match")} disabled={!canRunMatchForCurrentProfile || isMatchRequestPending}>Run Match</button>
          <button className="ghost" onClick={() => setActiveView("candidates")}>Back to Candidates</button>
        </div>
      </article>

      <article className="panel">
        <SectionIntro title="Match Results" text="These are the ranked jobs for the active candidate profile." />
        <p className="metaRow">AI reranked {aiScoredMatches} of {matchResults.length} results.</p>

        <div className="listStack">
          {matchResults.length === 0 && <p className="emptyText">No matches yet. Load a candidate or use the current profile to run matching.</p>}
          {matchResults.slice(0, 20).map((match, index) => (
            <section key={`${match.jobId}-${index}`} className="listCard">
              <div className="listCardHead">
                <div>
                  <h3>{index + 1}. {match.jobTitle}</h3>
                  <p>Job #{match.jobId}</p>
                </div>
                <div className={WorkspaceFormatter.scoreClass(match.score)}>{match.score}</div>
              </div>
              <p className="metricRow">
                <span>Skill: {match.skillScore}</span>
                <span>Experience: {match.experienceScore}</span>
                <span>AI: {typeof match.aiScore === "number" ? match.aiScore : "n/a"}</span>
              </p>
              {match.aiReason && <p className="reasonText">{match.aiReason}</p>}
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}

export function RecruiterApplicationsView(props) {
  const {
    applicationStatusMessage,
    isApplicationListPending,
    isApplicationPending,
    loadApplications,
    submittedApplications,
    changeApplicationStatus
  } = props;

  const [matchData, setMatchData] = useState({});

  const fetchMatch = async (applicationId) => {
    // View Match loads the saved profile and fit score for one application.
    if (matchData[applicationId]?.loaded) {
      setMatchData(prev => ({ ...prev, [applicationId]: { ...prev[applicationId], open: !prev[applicationId].open } }));
      return;
    }
    setMatchData(prev => ({ ...prev, [applicationId]: { loading: true, open: true } }));
    try {
      const result = await WorkspaceApi.getApplicationMatch(applicationId);
      setMatchData(prev => ({ ...prev, [applicationId]: { loaded: true, open: true, ...result } }));
    } catch (err) {
      setMatchData(prev => ({ ...prev, [applicationId]: { loaded: true, open: true, error: String(err) } }));
    }
  };

  return (
    <section className="contentGrid" aria-label="Recruiter applications section">
      <article className="panel">
        <SectionIntro title="Application Review" text="Recruiters can review candidate submissions and update the current status." />
        <p className={WorkspaceStatus.getClassName(applicationStatusMessage)}>{applicationStatusMessage}</p>
        <div className="buttonRow">
          <button className="ghost" onClick={() => loadApplications()} disabled={isApplicationListPending || isApplicationPending}>Refresh Applications</button>
        </div>
      </article>

      <article className="panel">
        <SectionIntro title="Submitted Applications" text="Click View Match on any application to see how well the candidate fits the job." />
        <div className="listStack">
          {submittedApplications.length === 0 && <p className="emptyText">No applications yet. Candidate submissions will appear here.</p>}
          {submittedApplications.map((application) => {
            const md = matchData[application.id];
            return (
              <section key={application.id} className="listCard">
                <div className="listCardHead">
                  <div>
                    <h3>{application.jobTitle}</h3>
                    <p>#{application.id} · {application.applicantName}</p>
                  </div>
                  <div className={WorkspaceFormatter.statusClass(application.status)}>{application.status}</div>
                </div>
                <p className="metaRow">{application.applicantEmail} · Submitted {WorkspaceFormatter.formatDate(application.submittedAt)}</p>
                {application.note && <p className="reasonText">{application.note}</p>}

                {md?.open && (
                  <div className="matchBreakdown">
                    {md.loading && <p className="matchBreakdownEmpty">Loading match score...</p>}
                    {md.error && <p className="matchBreakdownEmpty">{md.error}</p>}
                    {md.loaded && !md.match && <p className="matchBreakdownEmpty">{md.message ?? "No match data — candidate profile not in system."}</p>}
                    {md.loaded && md.match && (
                      <>
                        {/* Recruiters see the profile first, then the score for the selected job. */}
                        {md.candidateName && (
                          <p className="metaRow">Candidate profile: {md.candidateName}</p>
                        )}
                        {md.candidateSummary && (
                          <p className="reasonText">{md.candidateSummary}</p>
                        )}
                        {md.candidateSkills?.length > 0 && (
                          <div className="chips">
                            {md.candidateSkills.map(skill => (
                              <span key={`candidate-${application.id}-${skill}`} className="chip">{skill}</span>
                            ))}
                          </div>
                        )}
                        <div className="matchBreakdownHeader">
                          <div className={WorkspaceFormatter.scoreClass(md.match.score)}>
                            {md.match.score}
                          </div>
                          <div className="matchBreakdownMeta">
                            <span>Skill fit: <strong>{md.match.skillScore}</strong></span>
                            <span>Experience fit: <strong>{md.match.experienceScore}</strong></span>
                          </div>
                        </div>
                        {md.match.matchedSkills?.length > 0 && (
                          <div className="chips">
                            {md.match.matchedSkills.map(skill => (
                              <span key={skill} className="chip">{skill}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="buttonRow">
                  <button className="ghost" onClick={() => fetchMatch(application.id)}>
                    {md?.open ? "Hide Match" : "View Match"}
                  </button>
                  <button className="ghost" onClick={() => changeApplicationStatus(application.id, "Reviewing")} disabled={isApplicationPending}>Reviewing</button>
                  <button className="ghost" onClick={() => changeApplicationStatus(application.id, "Accepted")} disabled={isApplicationPending}>Accept</button>
                  <button className="danger" onClick={() => changeApplicationStatus(application.id, "Rejected")} disabled={isApplicationPending}>Reject</button>
                </div>
              </section>
            );
          })}
        </div>
      </article>
    </section>
  );
}

const jobShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  category: PropTypes.string,
  createdAt: PropTypes.string,
  sourceType: PropTypes.string,
  requiredSkills: PropTypes.array
});

const candidateShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  fullName: PropTypes.string.isRequired,
  email: PropTypes.string,
  selectedSkills: PropTypes.array
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

const applicationShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  jobTitle: PropTypes.string.isRequired,
  applicantName: PropTypes.string.isRequired,
  applicantEmail: PropTypes.string.isRequired,
  submittedAt: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  note: PropTypes.string
});

const jobDraftShape = PropTypes.shape({
  extractionMode: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  requiredSkillsInput: PropTypes.string.isRequired,
  meaningKeywordsInput: PropTypes.string.isRequired,
  category: PropTypes.string
});

RecruiterJobsView.propTypes = {
  jobStatusMessage: PropTypes.string.isRequired,
  jobImportText: PropTypes.string.isRequired,
  setJobImportText: PropTypes.func.isRequired,
  jobImportChars: PropTypes.number.isRequired,
  jobImportCategory: PropTypes.string.isRequired,
  setJobImportCategory: PropTypes.func.isRequired,
  jobImportSourceType: PropTypes.string.isRequired,
  setJobImportSourceType: PropTypes.func.isRequired,
  jobDraft: jobDraftShape,
  setJobDraft: PropTypes.func.isRequired,
  canImportJob: PropTypes.bool.isRequired,
  isJobRequestPending: PropTypes.bool.isRequired,
  previewJobDraft: PropTypes.func.isRequired,
  saveJobDraft: PropTypes.func.isRequired,
  loadJobs: PropTypes.func.isRequired,
  jobFilterCategory: PropTypes.string.isRequired,
  setJobFilterCategory: PropTypes.func.isRequired,
  jobCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  jobFilterQuery: PropTypes.string.isRequired,
  setJobFilterQuery: PropTypes.func.isRequired,
  setJobFilterCategoryAndReload: PropTypes.func.isRequired,
  jobs: PropTypes.arrayOf(jobShape).isRequired,
  deleteJobById: PropTypes.func.isRequired
};

RecruiterCandidatesView.propTypes = {
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
  loadCandidates: PropTypes.func.isRequired,
  candidates: PropTypes.arrayOf(candidateShape).isRequired,
  loadCandidateIntoEditor: PropTypes.func.isRequired,
  runMatchForSavedCandidate: PropTypes.func.isRequired,
  isMatchRequestPending: PropTypes.bool.isRequired,
  deleteCandidateById: PropTypes.func.isRequired
};

RecruiterMatchView.propTypes = {
  matchStatusMessage: PropTypes.string.isRequired,
  candidateSkillsInput: PropTypes.string.isRequired,
  setCandidateSkillsInput: PropTypes.func.isRequired,
  candidateSummaryInput: PropTypes.string.isRequired,
  setCandidateSummaryInput: PropTypes.func.isRequired,
  canRunMatchForCurrentProfile: PropTypes.bool.isRequired,
  isMatchRequestPending: PropTypes.bool.isRequired,
  runMatchForCurrentProfile: PropTypes.func.isRequired,
  setActiveView: PropTypes.func.isRequired,
  aiScoredMatches: PropTypes.number.isRequired,
  matchResults: PropTypes.arrayOf(matchShape).isRequired
};

RecruiterApplicationsView.propTypes = {
  applicationStatusMessage: PropTypes.string.isRequired,
  isApplicationListPending: PropTypes.bool.isRequired,
  isApplicationPending: PropTypes.bool.isRequired,
  loadApplications: PropTypes.func.isRequired,
  submittedApplications: PropTypes.arrayOf(applicationShape).isRequired,
  changeApplicationStatus: PropTypes.func.isRequired
};

import { useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen.jsx";
import { CandidateApplicationsView, CandidateOpportunitiesView, CandidateProfileView } from "./components/CandidateViews.jsx";
import { RecruiterApplicationsView, RecruiterCandidatesView, RecruiterJobsView, RecruiterMatchView } from "./components/RecruiterViews.jsx";
import { SectionTabs, WorkflowStrip, WorkspaceHeader } from "./components/WorkspaceChrome.jsx";
import { DEMO_USERS, SECTION_DEFINITIONS, WorkspaceFormatter } from "./lib/workspaceConfig.js";
import { WorkspaceApi } from "./lib/workspaceApi.js";

export default function App() {
  const runtimeWindow = globalThis.window;
  // Top-level state lives here so the recruiter and candidate views stay mostly presentational.
  const [authToken, setAuthToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("jobs");

  const [jobs, setJobs] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [jobStatusMessage, setJobStatusMessage] = useState("Loading jobs...");
  const [isJobRequestPending, setIsJobRequestPending] = useState(false);

  const [jobFilterCategory, setJobFilterCategory] = useState("");
  const [jobFilterQuery, setJobFilterQuery] = useState("");
  const [jobImportText, setJobImportText] = useState("");
  const [jobImportCategory, setJobImportCategory] = useState("");
  const [jobImportSourceType, setJobImportSourceType] = useState("ui-manual-paste");
  const [jobDraft, setJobDraft] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [candidateStatusMessage, setCandidateStatusMessage] = useState("Loading candidates...");
  const [isCandidateRequestPending, setIsCandidateRequestPending] = useState(false);

  const [candidateNameInput, setCandidateNameInput] = useState("");
  const [candidateEmailInput, setCandidateEmailInput] = useState("");
  const [candidateResumeInput, setCandidateResumeInput] = useState("");
  const [candidateStrengthsInput, setCandidateStrengthsInput] = useState("");
  const [candidateSkillsInput, setCandidateSkillsInput] = useState("");
  const [candidateSummaryInput, setCandidateSummaryInput] = useState("");
  const [candidateDraftMode, setCandidateDraftMode] = useState("");

  const [matchResults, setMatchResults] = useState([]);
  const [matchStatusMessage, setMatchStatusMessage] = useState("Ready to run matching.");
  const [isMatchRequestPending, setIsMatchRequestPending] = useState(false);

  const [applicationTargetJob, setApplicationTargetJob] = useState(null);
  const [applicationNameInput, setApplicationNameInput] = useState("");
  const [applicationEmailInput, setApplicationEmailInput] = useState("");
  const [applicationNoteInput, setApplicationNoteInput] = useState("");
  const [applicationStatusMessage, setApplicationStatusMessage] = useState("Choose a job and submit a mock application.");
  const [isApplicationPending, setIsApplicationPending] = useState(false);
  const [submittedApplications, setSubmittedApplications] = useState([]);
  const [isApplicationListPending, setIsApplicationListPending] = useState(false);

  const activeSection = SECTION_DEFINITIONS.find((section) => section.getId() === activeView);
  const jobImportChars = jobImportText.trim().length;
  const resumeChars = candidateResumeInput.trim().length;
  const candidateSkillList = WorkspaceFormatter.parseSkillList(candidateSkillsInput);
  const aiScoredMatches = WorkspaceFormatter.safeArray(matchResults).filter((match) => typeof match?.aiScore === "number").length;
  const canImportJob = jobImportChars >= 20;
  const canBuildCandidateFromResume = candidateNameInput.trim().length > 0 && resumeChars >= 20;
  const canRunMatchForCurrentProfile = candidateSkillList.length > 0;
  const canSubmitMockApplication = Boolean(
    applicationTargetJob &&
    applicationNameInput.trim().length > 1 &&
    WorkspaceFormatter.isPlausibleEmail(applicationEmailInput)
  );

  // Auth flow: login returns the role and token, then the UI opens the correct side of the app.
  const loginAsDemoUser = async (email, password) => {
    const session = await WorkspaceApi.login(email, password);
    WorkspaceApi.setAuthToken(session.token);
    setAuthToken(session.token);
    const nextUser = DEMO_USERS[session.role];
    setCurrentUser(nextUser);
    setActiveView(session.role === "admin" ? "jobs" : "profile");

    if (session.role === "candidate") {
      setCandidateNameInput(nextUser.name);
      setCandidateEmailInput(nextUser.email);
      setApplicationNameInput(nextUser.name);
      setApplicationEmailInput(nextUser.email);
    }
  };

  // Logout clears frontend state and returns the user to the login screen.
  const logoutDemoUser = async () => {
    try {
      await WorkspaceApi.logout();
    } catch {
      // Best-effort logout is enough for a demo app.
    }
    WorkspaceApi.setAuthToken("");
    setAuthToken("");
    setCurrentUser(null);
    setActiveView("jobs");
  };

  // Role-aware data load: candidates see only their own applications, recruiters can see all.
  const loadApplications = async (emailOverride) => {
    setIsApplicationListPending(true);
    try {
      let emailFilter;
      if (typeof emailOverride === "string") {
        emailFilter = emailOverride;
      } else if (currentUser?.role === "candidate") {
        emailFilter = applicationEmailInput || currentUser.email;
      }
      const nextApplications = WorkspaceFormatter.safeArray(await WorkspaceApi.getApplications(emailFilter));
      setSubmittedApplications(nextApplications);
    } catch (error) {
      setApplicationStatusMessage(`Could not load applications. ${String(error)}`);
    } finally {
      setIsApplicationListPending(false);
    }
  };

  // Job methods keep recruiter-side job actions grouped together.
  const loadJobs = async (options) => {
    const nextCategory = typeof options?.category === "string" ? options.category : jobFilterCategory;
    const nextQuery = typeof options?.query === "string" ? options.query : jobFilterQuery;

    setJobStatusMessage("Refreshing jobs...");
    setIsJobRequestPending(true);
    try {
      const nextJobs = WorkspaceFormatter.safeArray(await WorkspaceApi.getJobs(nextCategory, nextQuery));
      setJobs(nextJobs);
      setJobStatusMessage(`Loaded ${nextJobs.length} jobs.`);
    } catch (error) {
      setJobStatusMessage(`Could not load jobs. ${String(error)}`);
    } finally {
      setIsJobRequestPending(false);
    }
  };

  const loadJobCategories = async () => {
    try {
      const nextCategories = WorkspaceFormatter.safeArray(await WorkspaceApi.getJobCategories());
      setJobCategories(nextCategories);
    } catch {
      setJobCategories([]);
    }
  };

  const previewJobDraft = async () => {
    if (!canImportJob) {
      setJobStatusMessage("Job text must be at least 20 characters.");
      return;
    }

    setJobStatusMessage("Building job draft...");
    setIsJobRequestPending(true);
    try {
      const body = await WorkspaceApi.previewJob({
        rawText: jobImportText,
        category: jobImportCategory || null
      });

      setJobDraft({
        title: body?.extractedProfile?.title ?? "",
        requiredSkillsInput: WorkspaceFormatter.safeArray(body?.extractedProfile?.requiredSkills).join(", "),
        meaningKeywordsInput: WorkspaceFormatter.safeArray(body?.extractedProfile?.meaningKeywords).join(", "),
        category: body?.extractedProfile?.category ?? jobImportCategory,
        extractionMode: body?.extractionMode ?? "heuristic"
      });
      setJobStatusMessage(`Draft ready (${body?.extractionMode ?? "heuristic"}). Review fields and save when ready.`);
    } catch (error) {
      setJobStatusMessage(`Preview failed. ${String(error)}`);
    } finally {
      setIsJobRequestPending(false);
    }
  };

  const saveJobDraft = async () => {
    if (!jobDraft) {
      setJobStatusMessage("Build a job draft first.");
      return;
    }

    const requiredSkills = WorkspaceFormatter.parseSkillList(jobDraft.requiredSkillsInput);
    const meaningKeywords = WorkspaceFormatter.parseSkillList(jobDraft.meaningKeywordsInput);

    if (!jobDraft.title.trim()) {
      setJobStatusMessage("Draft title is required before save.");
      return;
    }

    if (requiredSkills.length === 0 || meaningKeywords.length === 0) {
      setJobStatusMessage("Draft must include at least one required skill and one keyword.");
      return;
    }

    setJobStatusMessage("Saving job draft...");
    setIsJobRequestPending(true);
    try {
      const body = await WorkspaceApi.saveJob({
        title: jobDraft.title,
        requiredSkills,
        meaningKeywords,
        category: jobDraft.category || null,
        sourceType: jobImportSourceType || "ui-draft-save",
        sourceText: jobImportText || null
      });

      setJobStatusMessage(`Saved job #${body?.id ?? "?"}: ${body?.title ?? "Untitled"}.`);
      setJobDraft(null);
      setJobImportText("");
      setJobImportCategory("");
      await loadJobs();
      await loadJobCategories();
    } catch (error) {
      setJobStatusMessage(`Save failed. ${String(error)}`);
    } finally {
      setIsJobRequestPending(false);
    }
  };

  const deleteJobById = async (jobId) => {
    if (!runtimeWindow.confirm(`Delete job #${jobId}?`)) return;

    setJobStatusMessage(`Deleting job #${jobId}...`);
    setIsJobRequestPending(true);
    try {
      await WorkspaceApi.deleteJob(jobId);
      setJobStatusMessage(`Deleted job #${jobId}.`);
      await loadJobs();
      await loadJobCategories();
    } catch (error) {
      setJobStatusMessage(`Delete failed. ${String(error)}`);
    } finally {
      setIsJobRequestPending(false);
    }
  };

  // Candidate methods keep profile-building behavior grouped together.
  const loadCandidates = async () => {
    setCandidateStatusMessage("Refreshing candidates...");
    setIsCandidateRequestPending(true);
    try {
      const nextCandidates = WorkspaceFormatter.safeArray(await WorkspaceApi.getCandidates());
      setCandidates(nextCandidates);
      setCandidateStatusMessage(`Loaded ${nextCandidates.length} candidates.`);
    } catch (error) {
      setCandidateStatusMessage(`Could not load candidates. ${String(error)}`);
    } finally {
      setIsCandidateRequestPending(false);
    }
  };

  const loadCandidateIntoEditor = (candidate) => {
    setCandidateNameInput(candidate.fullName ?? "");
    setCandidateEmailInput(candidate.email ?? "");
    setCandidateResumeInput(candidate.resumeText ?? "");
    setCandidateStrengthsInput(candidate.strengthsText ?? "");
    setCandidateSkillsInput(WorkspaceFormatter.safeArray(candidate.selectedSkills).join(", "));
    setCandidateSummaryInput(candidate.experienceSummary ?? "");
    setCandidateDraftMode("");
    setApplicationNameInput(candidate.fullName ?? "");
    setApplicationEmailInput(candidate.email ?? "");
  };

  const previewCandidateProfile = async () => {
    if (!canBuildCandidateFromResume) {
      setCandidateStatusMessage("Candidate name and resume text (20+ chars) are required.");
      return;
    }

    setCandidateStatusMessage("Building candidate draft...");
    setIsCandidateRequestPending(true);
    try {
      const body = await WorkspaceApi.previewCandidate({
        resumeText: candidateResumeInput,
        strengthsText: candidateStrengthsInput
      });

      setCandidateSkillsInput(WorkspaceFormatter.safeArray(body?.extractedProfile?.selectedSkills).join(", "));
      setCandidateSummaryInput(String(body?.extractedProfile?.experienceSummary ?? ""));
      setCandidateDraftMode(body?.extractionMode ?? "heuristic");
      setCandidateStatusMessage(`Draft ready (${body?.extractionMode ?? "heuristic"}). Review skills and summary, then save.`);
    } catch (error) {
      setCandidateStatusMessage(`Preview failed. ${String(error)}`);
    } finally {
      setIsCandidateRequestPending(false);
    }
  };

  const saveCandidate = async () => {
    const selectedSkills = WorkspaceFormatter.parseSkillList(candidateSkillsInput);

    if (!candidateNameInput.trim()) {
      setCandidateStatusMessage("Candidate name is required.");
      return;
    }

    if (selectedSkills.length === 0) {
      setCandidateStatusMessage("At least one skill is required.");
      return;
    }

    const draftModeSuffix = candidateDraftMode ? ` (${candidateDraftMode})` : "";
    setCandidateStatusMessage("Saving candidate...");
    setIsCandidateRequestPending(true);
    try {
      const body = await WorkspaceApi.saveCandidate({
        fullName: candidateNameInput,
        email: candidateEmailInput || null,
        selectedSkills,
        experienceSummary: candidateSummaryInput,
        resumeText: candidateResumeInput || null,
        strengthsText: candidateStrengthsInput || null
      });

      setCandidateStatusMessage(
        `Saved candidate #${body?.id ?? "?"}: ${body?.fullName ?? ""}${draftModeSuffix}.`
      );
      setCandidateDraftMode("");
      await loadCandidates();
    } catch (error) {
      setCandidateStatusMessage(`Save failed. ${String(error)}`);
    } finally {
      setIsCandidateRequestPending(false);
    }
  };

  const deleteCandidateById = async (candidateId) => {
    if (!runtimeWindow.confirm(`Delete candidate #${candidateId}?`)) return;

    setCandidateStatusMessage(`Deleting candidate #${candidateId}...`);
    setIsCandidateRequestPending(true);
    try {
      await WorkspaceApi.deleteCandidate(candidateId);
      setCandidateStatusMessage(`Deleted candidate #${candidateId}.`);
      await loadCandidates();
    } catch (error) {
      setCandidateStatusMessage(`Delete failed. ${String(error)}`);
    } finally {
      setIsCandidateRequestPending(false);
    }
  };

  // Matching always uses the currently edited candidate profile as input.
  const runMatchForCurrentProfile = async (nextView) => {
    const selectedSkills = WorkspaceFormatter.parseSkillList(candidateSkillsInput);

    if (selectedSkills.length === 0) {
      setMatchStatusMessage("Add at least one skill before matching.");
      return;
    }

    setMatchStatusMessage("Matching current profile...");
    setIsMatchRequestPending(true);
    try {
      const nextMatches = WorkspaceFormatter.safeArray(await WorkspaceApi.runMatch({
        selectedSkills,
        experienceSummary: candidateSummaryInput
      }));

      setMatchResults(nextMatches);
      setMatchStatusMessage(`Found ${nextMatches.length} matches.`);
      if (nextView) {
        setActiveView(nextView);
      }
    } catch (error) {
      setMatchResults([]);
      setMatchStatusMessage(`Match failed. ${String(error)}`);
    } finally {
      setIsMatchRequestPending(false);
    }
  };

  const runMatchForSavedCandidate = async (candidateId) => {
    setMatchStatusMessage(`Matching saved candidate #${candidateId}...`);
    setIsMatchRequestPending(true);
    try {
      const body = await WorkspaceApi.runSavedCandidateMatch(candidateId);
      const nextMatches = WorkspaceFormatter.safeArray(body?.matches);

      setMatchResults(nextMatches);
      setMatchStatusMessage(`Found ${nextMatches.length} matches for candidate #${candidateId}.`);

      if (body?.candidate) {
        loadCandidateIntoEditor(body.candidate);
      }

      setActiveView("match");
    } catch (error) {
      setMatchResults([]);
      setMatchStatusMessage(`Match failed. ${String(error)}`);
    } finally {
      setIsMatchRequestPending(false);
    }
  };

  // Starting an application copies job details into the candidate-side application form.
  const startMockApplication = (job) => {
    setApplicationTargetJob({
      id: job.id,
      title: job.title,
      category: job.category ?? null
    });

    if (!applicationNameInput && candidateNameInput) {
      setApplicationNameInput(candidateNameInput);
    }

    if (!applicationEmailInput && candidateEmailInput) {
      setApplicationEmailInput(candidateEmailInput);
    }

    setApplicationStatusMessage(`Application draft ready for "${job.title}".`);
    if (currentUser?.role === "candidate") {
      setActiveView("applications");
    }
  };

  const contactForJob = (job) => {
    const contactEmail = WorkspaceFormatter.buildMockContactEmail(job.id);
    const subject = encodeURIComponent(`Application interest: ${job.title}`);
    const body = encodeURIComponent(
      `Hi Hiring Team,\n\nI am interested in the ${job.title} role (Job #${job.id}).\n\nThanks,\n${applicationNameInput || candidateNameInput || "Candidate"}`
    );

    runtimeWindow.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    setApplicationStatusMessage(`Opened a draft email to ${contactEmail}.`);
  };

  const submitMockApplication = async () => {
    if (!canSubmitMockApplication || !applicationTargetJob) {
      setApplicationStatusMessage("Select a job, then enter a name and valid email to apply.");
      return;
    }

    setIsApplicationPending(true);
    setApplicationStatusMessage(`Submitting application for "${applicationTargetJob.title}"...`);
    try {
      const nextApplication = await WorkspaceApi.createApplication({
        jobId: applicationTargetJob.id,
        jobTitle: applicationTargetJob.title,
        applicantName: applicationNameInput,
        applicantEmail: applicationEmailInput,
        note: applicationNoteInput
      });

      await loadApplications(applicationEmailInput);
      setApplicationStatusMessage(`Application submitted to ${applicationTargetJob.title}. Reference: ${nextApplication.id}.`);
      setApplicationNoteInput("");
    } finally {
      setIsApplicationPending(false);
    }
  };

  // Recruiters can move applications through a very simple review workflow.
  const changeApplicationStatus = async (applicationId, nextStatus) => {
    setApplicationStatusMessage(`Updating application #${applicationId}...`);
    setIsApplicationPending(true);
    try {
      await WorkspaceApi.updateApplicationStatus(applicationId, nextStatus);
      await loadApplications();
      setApplicationStatusMessage(`Application #${applicationId} updated to ${nextStatus}.`);
    } catch (error) {
      setApplicationStatusMessage(`Status update failed. ${String(error)}`);
    } finally {
      setIsApplicationPending(false);
    }
  };

  useEffect(() => {
    // Initial load for shared data used by both sides of the app.
    void loadJobs();
    void loadJobCategories();
    void loadCandidates();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (currentUser.role === "candidate") {
      void loadApplications(applicationEmailInput || currentUser.email);
      return;
    }

    void loadApplications();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== "candidate") {
      return;
    }
    if (!applicationEmailInput.trim()) {
      return;
    }

    void loadApplications(applicationEmailInput);
  }, [applicationEmailInput, currentUser]);

  if (!currentUser || !authToken) {
    return <LoginScreen onLogin={loginAsDemoUser} />;
  }

  return (
    <main className="appShell">
      <WorkspaceHeader
        currentUser={currentUser}
        onLogout={logoutDemoUser}
        jobsCount={jobs.length}
        candidatesCount={candidates.length}
        matchesCount={matchResults.length}
        applicationCount={submittedApplications.length}
      />
      <WorkflowStrip
        title={activeSection?.getWorkflowTitle() ?? "Workspace Flow"}
        steps={activeSection?.getWorkflowSteps() ?? []}
      />
      <SectionTabs currentUser={currentUser} activeView={activeView} onChange={setActiveView} />

      {currentUser.role === "admin" && activeView === "jobs" && (
        <RecruiterJobsView
          jobStatusMessage={jobStatusMessage}
          jobImportText={jobImportText}
          setJobImportText={setJobImportText}
          jobImportChars={jobImportChars}
          jobImportCategory={jobImportCategory}
          setJobImportCategory={setJobImportCategory}
          jobImportSourceType={jobImportSourceType}
          setJobImportSourceType={setJobImportSourceType}
          jobDraft={jobDraft}
          setJobDraft={setJobDraft}
          canImportJob={canImportJob}
          isJobRequestPending={isJobRequestPending}
          previewJobDraft={previewJobDraft}
          saveJobDraft={saveJobDraft}
          loadJobs={loadJobs}
          jobFilterCategory={jobFilterCategory}
          setJobFilterCategory={setJobFilterCategory}
          jobCategories={jobCategories}
          jobFilterQuery={jobFilterQuery}
          setJobFilterQuery={setJobFilterQuery}
          setJobFilterCategoryAndReload={() => {
            setJobFilterCategory("");
            setJobFilterQuery("");
            void loadJobs({ category: "", query: "" });
          }}
          jobs={jobs}
          deleteJobById={deleteJobById}
        />
      )}

      {currentUser.role === "admin" && activeView === "candidates" && (
        <RecruiterCandidatesView
          candidateStatusMessage={candidateStatusMessage}
          candidateDraftMode={candidateDraftMode}
          candidateNameInput={candidateNameInput}
          setCandidateNameInput={setCandidateNameInput}
          candidateEmailInput={candidateEmailInput}
          setCandidateEmailInput={setCandidateEmailInput}
          candidateResumeInput={candidateResumeInput}
          setCandidateResumeInput={setCandidateResumeInput}
          resumeChars={resumeChars}
          candidateStrengthsInput={candidateStrengthsInput}
          setCandidateStrengthsInput={setCandidateStrengthsInput}
          candidateSkillsInput={candidateSkillsInput}
          setCandidateSkillsInput={setCandidateSkillsInput}
          candidateSummaryInput={candidateSummaryInput}
          setCandidateSummaryInput={setCandidateSummaryInput}
          canBuildCandidateFromResume={canBuildCandidateFromResume}
          isCandidateRequestPending={isCandidateRequestPending}
          previewCandidateProfile={previewCandidateProfile}
          saveCandidate={saveCandidate}
          loadCandidates={loadCandidates}
          candidates={candidates}
          loadCandidateIntoEditor={loadCandidateIntoEditor}
          runMatchForSavedCandidate={runMatchForSavedCandidate}
          isMatchRequestPending={isMatchRequestPending}
          deleteCandidateById={deleteCandidateById}
        />
      )}

      {currentUser.role === "admin" && activeView === "match" && (
        <RecruiterMatchView
          matchStatusMessage={matchStatusMessage}
          candidateSkillsInput={candidateSkillsInput}
          setCandidateSkillsInput={setCandidateSkillsInput}
          candidateSummaryInput={candidateSummaryInput}
          setCandidateSummaryInput={setCandidateSummaryInput}
          canRunMatchForCurrentProfile={canRunMatchForCurrentProfile}
          isMatchRequestPending={isMatchRequestPending}
          runMatchForCurrentProfile={runMatchForCurrentProfile}
          setActiveView={setActiveView}
          aiScoredMatches={aiScoredMatches}
          matchResults={matchResults}
        />
      )}

      {currentUser.role === "admin" && activeView === "admin-applications" && (
        <RecruiterApplicationsView
          applicationStatusMessage={applicationStatusMessage}
          isApplicationListPending={isApplicationListPending}
          isApplicationPending={isApplicationPending}
          loadApplications={loadApplications}
          submittedApplications={submittedApplications}
          changeApplicationStatus={changeApplicationStatus}
        />
      )}

      {currentUser.role === "candidate" && activeView === "profile" && (
        <CandidateProfileView
          candidateStatusMessage={candidateStatusMessage}
          candidateDraftMode={candidateDraftMode}
          candidateNameInput={candidateNameInput}
          setCandidateNameInput={setCandidateNameInput}
          candidateEmailInput={candidateEmailInput}
          setCandidateEmailInput={setCandidateEmailInput}
          candidateResumeInput={candidateResumeInput}
          setCandidateResumeInput={setCandidateResumeInput}
          resumeChars={resumeChars}
          candidateStrengthsInput={candidateStrengthsInput}
          setCandidateStrengthsInput={setCandidateStrengthsInput}
          candidateSkillsInput={candidateSkillsInput}
          setCandidateSkillsInput={setCandidateSkillsInput}
          candidateSummaryInput={candidateSummaryInput}
          setCandidateSummaryInput={setCandidateSummaryInput}
          canBuildCandidateFromResume={canBuildCandidateFromResume}
          isCandidateRequestPending={isCandidateRequestPending}
          previewCandidateProfile={previewCandidateProfile}
          saveCandidate={saveCandidate}
          canRunMatchForCurrentProfile={canRunMatchForCurrentProfile}
          isMatchRequestPending={isMatchRequestPending}
          runMatchForCurrentProfile={runMatchForCurrentProfile}
          candidateSkillList={candidateSkillList}
        />
      )}

      {currentUser.role === "candidate" && activeView === "opportunities" && (
        <CandidateOpportunitiesView
          matchStatusMessage={matchStatusMessage}
          canRunMatchForCurrentProfile={canRunMatchForCurrentProfile}
          isMatchRequestPending={isMatchRequestPending}
          runMatchForCurrentProfile={runMatchForCurrentProfile}
          setActiveView={setActiveView}
          matchResults={matchResults}
          startMockApplication={startMockApplication}
          contactForJob={contactForJob}
          jobs={jobs}
        />
      )}

      {currentUser.role === "candidate" && activeView === "applications" && (
        <CandidateApplicationsView
          applicationStatusMessage={applicationStatusMessage}
          applicationTargetJob={applicationTargetJob}
          applicationNameInput={applicationNameInput}
          setApplicationNameInput={setApplicationNameInput}
          applicationEmailInput={applicationEmailInput}
          setApplicationEmailInput={setApplicationEmailInput}
          applicationNoteInput={applicationNoteInput}
          setApplicationNoteInput={setApplicationNoteInput}
          submitMockApplication={submitMockApplication}
          canSubmitMockApplication={canSubmitMockApplication}
          isApplicationPending={isApplicationPending}
          loadApplications={loadApplications}
          currentUser={currentUser}
          contactForJob={contactForJob}
          isApplicationListPending={isApplicationListPending}
          submittedApplications={submittedApplications}
        />
      )}
    </main>
  );
}

// Sample users keep the app easy to present without building full registration.
export const DEMO_USERS = {
  admin: {
    role: "admin",
    name: "Riley Recruiter",
    email: "admin@talentsync.demo"
  },
  candidate: {
    role: "candidate",
    name: "Jordan Candidate",
    email: "candidate@talentsync.demo"
  }
};

// OOP: This base class defines the shared "shape" of a workspace section.
// Each child class answers the same questions in its own way.
export class WorkspaceSectionDefinition {
  getId() {
    return "base";
  }

  getLabel() {
    return "Base";
  }

  getRole() {
    return "shared";
  }

  getWorkflowTitle() {
    return "Workspace Flow";
  }

  getWorkflowSteps() {
    return [];
  }
}

export class JobsSectionDefinition extends WorkspaceSectionDefinition {
  getId() {
    return "jobs";
  }

  getLabel() {
    return "Jobs";
  }

  getRole() {
    return "admin";
  }

  getWorkflowTitle() {
    return "Recruiter Job Flow";
  }

  getWorkflowSteps() {
    return ["Paste the job", "Review the draft", "Save the listing"];
  }
}

export class CandidatesSectionDefinition extends WorkspaceSectionDefinition {
  getId() {
    return "candidates";
  }

  getLabel() {
    return "Candidates";
  }

  getRole() {
    return "admin";
  }

  getWorkflowTitle() {
    return "Recruiter Candidate Flow";
  }

  getWorkflowSteps() {
    return ["Review saved profiles", "Load one into the editor", "Run matching"];
  }
}

export class MatchSectionDefinition extends WorkspaceSectionDefinition {
  getId() {
    return "match";
  }

  getLabel() {
    return "Matches";
  }

  getRole() {
    return "admin";
  }

  getWorkflowTitle() {
    return "Recruiter Match Flow";
  }

  getWorkflowSteps() {
    return ["Choose a candidate", "Run matching", "Review the ranked jobs"];
  }
}

export class AdminApplicationsSectionDefinition extends WorkspaceSectionDefinition {
  getId() {
    return "admin-applications";
  }

  getLabel() {
    return "Applications";
  }

  getRole() {
    return "admin";
  }

  getWorkflowTitle() {
    return "Recruiter Application Flow";
  }

  getWorkflowSteps() {
    return ["Review submissions", "Update status", "Track hiring progress"];
  }
}

export class ProfileSectionDefinition extends WorkspaceSectionDefinition {
  getId() {
    return "profile";
  }

  getLabel() {
    return "Profile";
  }

  getRole() {
    return "candidate";
  }

  getWorkflowTitle() {
    return "Candidate Profile Flow";
  }

  getWorkflowSteps() {
    return ["Paste your resume", "Review your profile", "Save changes"];
  }
}

export class OpportunitiesSectionDefinition extends WorkspaceSectionDefinition {
  getId() {
    return "opportunities";
  }

  getLabel() {
    return "Opportunities";
  }

  getRole() {
    return "candidate";
  }

  getWorkflowTitle() {
    return "Candidate Job Flow";
  }

  getWorkflowSteps() {
    return ["Run your match", "Review matching jobs", "Start an application"];
  }
}

export class ApplicationsSectionDefinition extends WorkspaceSectionDefinition {
  getId() {
    return "applications";
  }

  getLabel() {
    return "Applications";
  }

  getRole() {
    return "candidate";
  }

  getWorkflowTitle() {
    return "Candidate Application Flow";
  }

  getWorkflowSteps() {
    return ["Choose a job", "Submit the application", "Track application status"];
  }
}

export const SECTION_DEFINITIONS = [
  new JobsSectionDefinition(),
  new CandidatesSectionDefinition(),
  new MatchSectionDefinition(),
  new AdminApplicationsSectionDefinition(),
  new ProfileSectionDefinition(),
  new OpportunitiesSectionDefinition(),
  new ApplicationsSectionDefinition()
];

// Small formatting helpers are grouped here so the UI does not repeat string cleanup logic.
export class WorkspaceFormatter {
  static parseSkillList(rawValue) {
    return [...new Set(String(rawValue || "").split(",").map((item) => item.trim()).filter(Boolean))];
  }

  static safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  static isPlausibleEmail(value) {
    return /\S+@\S+\.\S+/.test(String(value || "").trim());
  }

  static buildMockContactEmail(jobId) {
    return `hiring+job${jobId}@talentsync.demo`;
  }

  static buildMockApplyUrl(jobId) {
    return `https://apply.talentsync.demo/jobs/${jobId}`;
  }

  static formatDate(value) {
    return new Date(value).toLocaleDateString();
  }
}

// OOP: Base rule for status messages.
// Child classes override the same methods, which is the polymorphism example in this file.
class StatusRule {
  matches(_message) {
    return false;
  }

  getTone() {
    return "neutral";
  }
}

class ErrorStatusRule extends StatusRule {
  matches(message) {
    return (
      message.includes("failed") ||
      message.includes("error") ||
      message.includes("required") ||
      message.includes("must")
    );
  }

  getTone() {
    return "error";
  }
}

class InfoStatusRule extends StatusRule {
  matches(message) {
    return (
      message.includes("loading") ||
      message.includes("refresh") ||
      message.includes("matching") ||
      message.includes("saving") ||
      message.includes("preview") ||
      message.includes("draft")
    );
  }

  getTone() {
    return "info";
  }
}

class SuccessStatusRule extends StatusRule {
  matches(message) {
    return !!message;
  }

  getTone() {
    return "success";
  }
}

export class WorkspaceStatus {
  static rules = [new ErrorStatusRule(), new InfoStatusRule(), new SuccessStatusRule()];

  static getTone(message) {
    const normalizedMessage = String(message || "").toLowerCase();
    if (!normalizedMessage) return "neutral";
    // Same method call, different child-class behavior.
    const matchingRule = WorkspaceStatus.rules.find((rule) => rule.matches(normalizedMessage));
    return matchingRule ? matchingRule.getTone() : "neutral";
  }

  static getClassName(message) {
    return `status ${WorkspaceStatus.getTone(message)}`;
  }
}

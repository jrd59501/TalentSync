// Encapsulation: all frontend API calls live in one class so components do not manage fetch details directly.
export class WorkspaceApi {
  static authToken = "";

  static setAuthToken(token) {
    WorkspaceApi.authToken = token || "";
  }

  static async request(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (WorkspaceApi.authToken) {
      headers.set("Authorization", `Bearer ${WorkspaceApi.authToken}`);
    }

    // Every protected request goes through this shared method.
    return fetch(url, {
      ...options,
      headers
    });
  }

  static async readJson(response, fallbackValue) {
    return response.json().catch(() => fallbackValue);
  }

  static async login(email, password) {
    // Login is separate because no auth token exists yet.
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async logout() {
    const response = await WorkspaceApi.request("/auth/logout", { method: "POST" });
    if (!response.ok && response.status !== 204) {
      const body = await WorkspaceApi.readJson(response, {});
      throw new Error(body?.error ?? `Failed: ${response.status}`);
    }
  }

  static async getJobs(category, query) {
    // Query params are built here so the UI can just pass simple values.
    const queryParams = new URLSearchParams();
    if (category) queryParams.set("category", category);
    if (query) queryParams.set("q", query);

    const response = await WorkspaceApi.request(`/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`);
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return WorkspaceApi.readJson(response, []);
  }

  static async getJobCategories() {
    const response = await WorkspaceApi.request("/jobs/categories");
    if (!response.ok) throw new Error("Failed to load categories");
    return WorkspaceApi.readJson(response, []);
  }

  static async previewJob(payload) {
    const response = await WorkspaceApi.request("/jobs/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async saveJob(payload) {
    const response = await WorkspaceApi.request("/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async deleteJob(jobId) {
    const response = await WorkspaceApi.request(`/jobs/${jobId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await WorkspaceApi.readJson(response, {});
      throw new Error(body?.error ?? `Failed: ${response.status}`);
    }
  }

  static async getCandidates() {
    const response = await WorkspaceApi.request("/candidates");
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return WorkspaceApi.readJson(response, []);
  }

  static async previewCandidate(payload) {
    const response = await WorkspaceApi.request("/candidates/preview-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async saveCandidate(payload) {
    const response = await WorkspaceApi.request("/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async deleteCandidate(candidateId) {
    const response = await WorkspaceApi.request(`/candidates/${candidateId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await WorkspaceApi.readJson(response, {});
      throw new Error(body?.error ?? `Failed: ${response.status}`);
    }
  }

  static async runMatch(payload) {
    const response = await WorkspaceApi.request("/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await WorkspaceApi.readJson(response, []);
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async runSavedCandidateMatch(candidateId) {
    const response = await WorkspaceApi.request(`/candidates/${candidateId}/match`, { method: "POST" });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async getApplications(email) {
    const queryParams = new URLSearchParams();
    if (email) queryParams.set("email", email);

    const response = await WorkspaceApi.request(`/applications${queryParams.toString() ? `?${queryParams.toString()}` : ""}`);
    const body = await WorkspaceApi.readJson(response, []);
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async createApplication(payload) {
    const response = await WorkspaceApi.request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }

  static async updateApplicationStatus(applicationId, status) {
    const response = await WorkspaceApi.request(`/applications/${applicationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const body = await WorkspaceApi.readJson(response, {});
    if (!response.ok) throw new Error(body?.error ?? `Failed: ${response.status}`);
    return body;
  }
}

import express from "express";
import {
    createJobListing,
    deleteJobListing,
    getJobListingById,
    importJobListing,
    listJobCategories,
    listJobListings,
    previewJobListing
} from "../controllers/jobController.js";
import { requireAuth, requireRole } from "../middleware/security.js";

// Router for employer-side job management.
const router = express.Router();

// Health check endpoint for this route group.
router.get("/health", (req, res) => {
    res.json({ message: "Jobs endpoint alive" });
});

// List all jobs currently saved in DB.
// Preferred path:
router.get("/", listJobListings);
// Save a structured draft profile as a job row.
router.post("/", requireAuth, requireRole("admin"), createJobListing);
// Backward-compatible alias:
router.get("/list", listJobListings);
// Distinct category list for filter dropdowns.
router.get("/categories", listJobCategories);
// Preview extracted profile without saving.
router.post("/preview", previewJobListing);
// Fetch one job by ID.
router.get("/:id", getJobListingById);
// Import a pasted employer job/resume-style text into a structured job listing.
router.post("/import", requireAuth, requireRole("admin"), importJobListing);
// Delete one job by ID.
router.delete("/:id", requireAuth, requireRole("admin"), deleteJobListing);

export default router;

import express from "express";
import {
    createCandidate,
    deleteCandidate,
    getCandidateById,
    importCandidateProfile,
    listCandidates,
    matchSavedCandidate,
    previewCandidateProfile
} from "../controllers/candidateController.js";
import { requireAuth, requireRole } from "../middleware/security.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({ message: "Candidates endpoint alive" });
});

router.get("/", requireAuth, requireRole("admin"), listCandidates);
router.post("/", requireAuth, createCandidate);
router.post("/preview-profile", requireAuth, previewCandidateProfile);
router.post("/import-profile", requireAuth, importCandidateProfile);
router.get("/:id", requireAuth, requireRole("admin"), getCandidateById);
router.post("/:id/match", requireAuth, requireRole("admin"), matchSavedCandidate);
router.delete("/:id", requireAuth, requireRole("admin"), deleteCandidate);

export default router;
 

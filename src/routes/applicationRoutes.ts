import express from "express";
import {
    createApplication,
    listApplications,
    updateApplicationStatus
} from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/security.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({ message: "Applications endpoint alive" });
});

router.get("/", requireAuth, listApplications);
router.post("/", requireAuth, createApplication);
router.patch("/:id/status", requireAuth, requireRole("admin"), updateApplicationStatus);

export default router;

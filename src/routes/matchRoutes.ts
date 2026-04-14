import express from "express";
import { matchUser } from "../controllers/matchController.js";
import { requireAuth } from "../middleware/security.js";

// Router = a mini app just for /match routes.
const router = express.Router();

// Quick status check for this route group.
router.get("/", (req, res) => {
  res.json({ message: "Match endpoint alive" });
});

// Main matching endpoint.
// Expects selectedSkills + experienceSummary in request body.
// Returns ranked jobs from best fit to worst fit.
router.post("/", requireAuth, matchUser);

export default router;

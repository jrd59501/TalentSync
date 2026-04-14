import express from "express";
import { login, logout } from "../controllers/authController.js";
import { requireAuth } from "../middleware/security.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", requireAuth, logout);

export default router;

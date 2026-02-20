import express from "express";
import { matchUser } from "../controllers/matchController.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Match endpoint alive" });
});

router.post("/", matchUser);

export default router;
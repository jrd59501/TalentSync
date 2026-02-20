import { Request, Response } from "express";
import { findMatches } from "../services/matchingService.js";

export const matchUser = (req: Request, res: Response) => {
    const { selectedSkills, experienceSummary } = req.body;

    const results = findMatches(selectedSkills, experienceSummary);

    res.json(results);
};
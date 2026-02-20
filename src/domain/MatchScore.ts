import { Job } from "./Job.js";

export class MatchScore {
    constructor(
        public job: Job,
        public score: number
    ) { }
}
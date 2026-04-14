import { Job } from "./Job.js";

export class MatchScore {
    // Bundles a Job with its computed numeric match score.
    constructor(
        public job: Job,
        public score: number
    ) { }
}

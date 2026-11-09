import type { JobHandler } from "../jobs.js";

/**
 * Job type → handler. Each handler lives in its own file in this folder and calls
 * shared services/repositories. No ES query code in handlers.
 * Planned: embed-talk, embed-attendee, embed-contact, transcribe-clip, classify-clip.
 */
export const handlers: Record<string, JobHandler> = {};

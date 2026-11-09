import { randomUUID } from "node:crypto";
import {
  CLIP_AUDIO_TYPES,
  withSpan,
  type AiClient,
  type ClipAccepted,
  type ClipStatusResponse,
  type ClipUploadQuery,
  type ClipsRepository,
  type JobsRepository,
  type Logger,
  type ProductMetrics,
} from "@confy/shared";
import { z } from "zod";
import { NotFoundError, UpstreamError, ValidationError } from "../errors.js";

/** Must match the worker's handler name (apps/worker/src/handlers/process-clip.ts). */
export const PROCESS_CLIP_JOB = "process-clip";
const MIN_AUDIO_BYTES = 1024;

const jobId = (clipId: string) => `clip-${clipId}`;
const JobOwner = z.object({ owner_id: z.string() });

export interface ClipUpload {
  audio: Uint8Array;
  /** Bare media type without parameters, e.g. "audio/webm". */
  mimeType: string;
  query: ClipUploadQuery;
}

export interface ClipsService {
  /** Transcribe in memory (the audio is never stored), then queue the transcript for the worker. */
  upload(userId: string, upload: ClipUpload): Promise<ClipAccepted>;
  /** Always scoped to `userId`: someone else's clip is "not found". */
  status(userId: string, clipId: string): Promise<ClipStatusResponse>;
}

export function createClipsService(deps: {
  ai: Pick<AiClient, "transcribe">;
  jobs: Pick<JobsRepository, "enqueue" | "get">;
  clips: Pick<ClipsRepository, "get">;
  logger: Logger;
  metrics?: Pick<ProductMetrics, "recordAiError">;
}): ClipsService {
  return {
    async upload(userId, { audio, mimeType, query }) {
      if (!(CLIP_AUDIO_TYPES as readonly string[]).includes(mimeType)) {
        throw new ValidationError(`Unsupported audio type. Use one of: ${CLIP_AUDIO_TYPES.join(", ")}`);
      }
      if (audio.byteLength < MIN_AUDIO_BYTES) throw new ValidationError("The clip is empty. Record a little longer and try again.");

      return withSpan("confy.clips.save", { "confy.clip_duration_s": query.durationS, "confy.clip_bytes": audio.byteLength }, async () => {
        const transcript = await withSpan("confy.ai.transcribe", {}, () => deps.ai.transcribe(audio, mimeType)).catch((err: unknown) => {
          deps.metrics?.recordAiError("transcribe");
          deps.logger.warn({ err }, "clip transcription failed");
          throw new UpstreamError("We couldn't transcribe that clip. Please try again.");
        });
        if (transcript.length === 0) throw new ValidationError("We couldn't hear any speech in that clip.");

        const id = randomUUID();
        await deps.jobs.enqueue([
          {
            id: jobId(id),
            type: PROCESS_CLIP_JOB,
            payload: { clip_id: id, owner_id: userId, transcript, duration_s: query.durationS, ...(query.talkId ? { talk_id: query.talkId } : {}) },
          },
        ]);
        return { id, status: "processing" as const };
      });
    },

    async status(userId, clipId) {
      const clip = await deps.clips.get(userId, clipId);
      if (clip) {
        const { owner_id: _owner, entities: _e, contact_id: _c, highlight_id: _h, "@timestamp": createdAt, ...rest } = clip;
        return { id: clipId, status: "done", clip: { id: clipId, ...rest, created_at: createdAt } };
      }
      const job = await deps.jobs.get(jobId(clipId));
      const owner = JobOwner.safeParse(job?.payload);
      if (!job || !owner.success || owner.data.owner_id !== userId) throw new NotFoundError("Clip not found");
      // "done" without a clip doc yet means the write is still refreshing: keep the client polling.
      return { id: clipId, status: job.status === "failed" ? "failed" : "processing" };
    },
  };
}

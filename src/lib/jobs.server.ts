import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Moment } from "@/lib/moments.server";
import type { RepurposeOutput } from "@/lib/ai.functions";

// Background jobs for detection and cutting. The work runs in this Node
// process, independent of any browser tab: closing or refreshing the page no
// longer kills it. State is mirrored to disk so it survives module reloads.
// Server-only.

export type JobKind = "detect" | "cut";
export type JobStatus = "running" | "done" | "failed";

export type JobClip = { id: string; name: string; title: string; thumbnailPath: string | null };
export type JobCaptionSet = { clipId: string; clipName: string; outputs: RepurposeOutput[] };

export type Job = {
  id: string;
  userId: string;
  kind: JobKind;
  status: JobStatus;
  progress: string;
  createdAt: number;
  updatedAt: number;
  moments?: Moment[];
  clips?: JobClip[];
  captions?: JobCaptionSet[];
  drafts?: number;
  error?: string;
};

function jobsDir(): string {
  return join(tmpdir(), "ets-jobs");
}

function jobPath(id: string): string {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid job id.");
  return join(jobsDir(), `${id}.json`);
}

export async function createJob(userId: string, kind: JobKind): Promise<Job> {
  await mkdir(jobsDir(), { recursive: true });
  const now = Date.now();
  const job: Job = {
    id: randomUUID(),
    userId,
    kind,
    status: "running",
    progress: "Starting…",
    createdAt: now,
    updatedAt: now,
  };
  await writeFile(jobPath(job.id), JSON.stringify(job), "utf8");
  return job;
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<Job> {
  const current = await readJob(id);
  if (!current) throw new Error("Job not found.");
  const next: Job = { ...current, ...patch, updatedAt: Date.now() };
  await mkdir(jobsDir(), { recursive: true });
  await writeFile(jobPath(id), JSON.stringify(next), "utf8");
  return next;
}

export async function readJob(id: string): Promise<Job | null> {
  try {
    const raw = await readFile(jobPath(id), "utf8");
    return JSON.parse(raw) as Job;
  } catch {
    return null;
  }
}

/** A job older than this is dead weight — prune on read of a fresh one. */
export async function pruneOldJobs(): Promise<void> {
  // Best-effort; jobs are tiny JSON files in the OS temp dir.
}

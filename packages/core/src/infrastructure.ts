import { randomUUID } from "node:crypto";

type JobStatus = "PENDING" | "PROCESSING" | "DONE" | "DEAD";
export type DurableJob<T> = {
  id: string;
  key: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  availableAt: Date;
  claimedUntil: Date | null;
  errorCode: string | null;
};
export class DurableQueue<T> {
  readonly jobs = new Map<string, DurableJob<T>>();
  enqueue(key: string, payload: T): DurableJob<T> {
    const existing = [...this.jobs.values()].find((job) => job.key === key);
    if (existing) return existing;
    const job: DurableJob<T> = {
      id: randomUUID(),
      key,
      payload,
      status: "PENDING",
      attempts: 0,
      availableAt: new Date(),
      claimedUntil: null,
      errorCode: null,
    };
    this.jobs.set(job.id, job);
    return job;
  }
  claim(now = new Date(), leaseMs = 30000): DurableJob<T> | null {
    const job = [...this.jobs.values()].find(
      (item) =>
        (item.status === "PENDING" && item.availableAt <= now) ||
        (item.status === "PROCESSING" &&
          item.claimedUntil !== null &&
          item.claimedUntil <= now),
    );
    if (!job) return null;
    job.status = "PROCESSING";
    job.attempts += 1;
    job.claimedUntil = new Date(now.getTime() + leaseMs);
    return job;
  }
  complete(id: string): void {
    const job = this.require(id);
    if (job.status !== "PROCESSING") throw new Error("CONFLICT");
    job.status = "DONE";
    job.claimedUntil = null;
  }
  fail(id: string, code: string, now = new Date(), limit = 5): void {
    const job = this.require(id);
    job.errorCode = code;
    job.claimedUntil = null;
    if (job.attempts >= limit) job.status = "DEAD";
    else {
      job.status = "PENDING";
      job.availableAt = new Date(
        now.getTime() + Math.min(3600000, 1000 * 2 ** job.attempts),
      );
    }
  }
  replay(id: string): void {
    const job = this.require(id);
    if (job.status !== "DEAD") throw new Error("CONFLICT");
    job.status = "PENDING";
    job.attempts = 0;
    job.errorCode = null;
    job.availableAt = new Date();
  }
  private require(id: string): DurableJob<T> {
    const job = this.jobs.get(id);
    if (!job) throw new Error("NOT_FOUND");
    return job;
  }
}

export type StoredFile = {
  id: string;
  ownerId: string;
  name: string;
  mime: string;
  bytes: Uint8Array;
  public: boolean;
};
export class PrivateFileStore {
  readonly files = new Map<string, StoredFile>();
  put(
    ownerId: string,
    name: string,
    declaredMime: string,
    bytes: Uint8Array,
    isPublic = false,
  ): StoredFile {
    if (
      name.includes("..") ||
      name.includes("/") ||
      name.includes("\\") ||
      bytes.length > 5_000_000
    )
      throw new Error("VALIDATION_FAILED");
    const detected = detectMime(bytes);
    if (
      detected !== declaredMime ||
      !["image/png", "image/jpeg", "application/pdf"].includes(detected)
    )
      throw new Error("VALIDATION_FAILED");
    const file = {
      id: randomUUID(),
      ownerId,
      name,
      mime: detected,
      bytes: bytes.slice(),
      public: isPublic,
    };
    this.files.set(file.id, file);
    return file;
  }
  read(requesterId: string, id: string): Uint8Array {
    const file = this.files.get(id);
    if (!file || (!file.public && file.ownerId !== requesterId))
      throw new Error("NOT_FOUND");
    return file.bytes.slice();
  }
}
function detectMime(bytes: Uint8Array): string {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  )
    return "application/pdf";
  return "application/octet-stream";
}

export interface Mailer {
  send(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    key: string;
  }): Promise<{ providerMessageId: string }>;
}
export class LocalLogMailer implements Mailer {
  readonly sent: {
    to: string;
    subject: string;
    html: string;
    text: string;
    key: string;
  }[] = [];
  async send(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    key: string;
  }): Promise<{ providerMessageId: string }> {
    if (!this.sent.some((mail) => mail.key === input.key))
      this.sent.push({ ...input, html: escapeHtml(input.html) });
    return { providerMessageId: `local-${input.key}` };
  }
}
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

import { createHash, randomUUID } from "node:crypto";
import { audit, BackendProblem, now, page } from "./common.js";
import type { PublicUser } from "./identity.js";
import type {
  BackendState,
  NotificationRecord,
  UploadRecord,
} from "./state.js";

export class UserFeatureService {
  notifications(
    state: BackendState,
    actor: PublicUser,
    limit: number,
    cursor: string | null,
  ) {
    return page(
      state.notifications
        .filter((item) => item.userId === actor.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      limit,
      cursor,
    );
  }

  unreadCount(state: BackendState, actor: PublicUser): number {
    return state.notifications.filter(
      (item) => item.userId === actor.id && !item.readAt,
    ).length;
  }

  markRead(
    state: BackendState,
    actor: PublicUser,
    notificationId: string,
  ): NotificationRecord {
    const notification = state.notifications.find(
      (item) => item.id === notificationId && item.userId === actor.id,
    );
    if (!notification) throw new BackendProblem("NOT_FOUND", 404);
    notification.readAt = now();
    return notification;
  }

  preferences(
    state: BackendState,
    actor: PublicUser,
    input?: { email: boolean; inApp: boolean },
  ): { email: boolean; inApp: boolean } {
    if (input) state.notificationPreferences[actor.id] = input;
    return (
      state.notificationPreferences[actor.id] ?? {
        email: true,
        inApp: true,
      }
    );
  }

  profile(
    state: BackendState,
    actor: PublicUser,
    input?: {
      name?: string | undefined;
      locale?: string | undefined;
    },
  ) {
    const user = state.users.find((item) => item.id === actor.id);
    if (!user) throw new BackendProblem("AUTH_REQUIRED", 401);
    if (input?.name !== undefined) {
      const name = input.name.trim();
      if (name.length > 120) throw new BackendProblem("VALIDATION_FAILED", 422);
      user.name = name;
    }
    if (input?.locale !== undefined) {
      if (!["fr", "en"].includes(input.locale))
        throw new BackendProblem("VALIDATION_FAILED", 422);
      user.locale = input.locale;
    }
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  upload(
    state: BackendState,
    actor: PublicUser,
    input: { name: string; mime: string; contentBase64: string },
  ): UploadRecord {
    if (
      input.name.includes("/") ||
      input.name.includes("\\") ||
      input.name.includes("..")
    )
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const bytes = Buffer.from(input.contentBase64, "base64");
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024)
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const detected = detectMime(bytes);
    if (!detected || detected !== input.mime)
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const id = randomUUID();
    const storageKey = `${actor.id}/${id}`;
    const upload: UploadRecord = {
      id,
      userId: actor.id,
      name: input.name.slice(0, 180),
      mime: detected,
      size: bytes.length,
      storageKey,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      createdAt: now(),
    };
    state.uploads.push(upload);
    state.localFiles[storageKey] = input.contentBase64;
    audit(state, actor.id, "upload.created", "upload", id);
    return upload;
  }

  download(
    state: BackendState,
    actor: PublicUser,
    uploadId: string,
  ): { upload: UploadRecord; contentBase64: string } {
    const upload = state.uploads.find(
      (item) => item.id === uploadId && item.userId === actor.id,
    );
    if (!upload) throw new BackendProblem("NOT_FOUND", 404);
    const contentBase64 = state.localFiles[upload.storageKey];
    if (!contentBase64) throw new BackendProblem("NOT_FOUND", 404);
    return { upload, contentBase64 };
  }
}

function detectMime(bytes: Buffer): string | null {
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (bytes.subarray(0, 4).toString("utf8") === "%PDF")
    return "application/pdf";
  return null;
}

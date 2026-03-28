import { z } from "zod";
import { UserFacingError } from "@/lib/errors";
import {
  EVIDENCE_KINDS,
  isEvidenceKind,
  MAX_EVIDENCE_DESCRIPTION_LENGTH,
  MAX_EVIDENCE_REQUEST_SIZE_BYTES,
  MAX_EVIDENCE_UPLOAD_SIZE_BYTES,
  MAX_EVIDENCE_URL_LENGTH,
} from "@/lib/types";

const EVIDENCE_REQUEST_SIZE_LIMIT_MB = 10;
const EVIDENCE_UPLOAD_SIZE_LIMIT_MB = 8;
const SAFE_PROOF_URL_PATTERN = /^(\/|https?:\/\/)/;

const evidenceRequestSchema = z.object({
  playerId: z.string().trim().max(100).default(""),
  description: z
    .string()
    .trim()
    .min(1, "Add a short description for the proof.")
    .max(
      MAX_EVIDENCE_DESCRIPTION_LENGTH,
      `Evidence descriptions must be ${MAX_EVIDENCE_DESCRIPTION_LENGTH} characters or fewer.`,
    ),
  kind: z.string().trim().refine(isEvidenceKind, {
    message: `Evidence type must be one of: ${EVIDENCE_KINDS.join(", ")}.`,
  }),
  proofUrl: z
    .string()
    .trim()
    .max(
      MAX_EVIDENCE_URL_LENGTH,
      `Proof URLs must be ${MAX_EVIDENCE_URL_LENGTH} characters or fewer.`,
    )
    .refine((value) => value === "" || SAFE_PROOF_URL_PATTERN.test(value), {
      message: "Proof URLs must start with /, http://, or https://.",
    }),
});

function getStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function assertEvidenceRequestSize(request: Request) {
  const contentLengthHeader = request.headers.get("content-length");

  if (!contentLengthHeader) {
    return;
  }

  const contentLength = Number.parseInt(contentLengthHeader, 10);

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return;
  }

  if (contentLength > MAX_EVIDENCE_REQUEST_SIZE_BYTES) {
    throw new UserFacingError(
      `Evidence requests must be ${EVIDENCE_REQUEST_SIZE_LIMIT_MB} MB or smaller.`,
    );
  }
}

export function parseEvidenceRequest(formData: FormData) {
  const parsed = evidenceRequestSchema.safeParse({
    playerId: getStringField(formData, "playerId"),
    description: getStringField(formData, "description"),
    kind: getStringField(formData, "kind") || "photo",
    proofUrl: getStringField(formData, "proofUrl"),
  });

  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message ?? "Invalid evidence request.");
  }

  const rawFile = formData.get("file");

  if (rawFile !== null && !(rawFile instanceof File)) {
    throw new UserFacingError("Evidence uploads must be sent as files.");
  }

  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  if (file && file.size > MAX_EVIDENCE_UPLOAD_SIZE_BYTES) {
    throw new UserFacingError(
      `Evidence uploads must be ${EVIDENCE_UPLOAD_SIZE_LIMIT_MB} MB or smaller.`,
    );
  }

  if (
    file?.type &&
    parsed.data.kind === "photo" &&
    !file.type.startsWith("image/")
  ) {
    throw new UserFacingError("Photo evidence must be uploaded as an image file.");
  }

  if (
    file?.type &&
    parsed.data.kind === "video" &&
    !file.type.startsWith("video/")
  ) {
    throw new UserFacingError("Video evidence must be uploaded as a video file.");
  }

  if (!file && !parsed.data.proofUrl) {
    throw new UserFacingError("Evidence needs either an upload or a proof URL.");
  }

  return {
    ...parsed.data,
    file,
  };
}

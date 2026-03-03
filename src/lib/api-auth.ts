import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export interface ApiKeyAuth {
  creatorId: string;
  keyId: string;
}

/**
 * Authenticate a request via API key in the Authorization: Bearer header.
 * Returns the creatorId if valid, or null if invalid/missing.
 */
export async function authenticateApiKey(
  request: Request
): Promise<ApiKeyAuth | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey || !rawKey.startsWith("etc_")) {
    return null;
  }

  const hash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hash },
  });

  if (!apiKey) return null;
  if (apiKey.revoked) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { creatorId: apiKey.creatorId, keyId: apiKey.id };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

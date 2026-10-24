import type { z } from "zod/v4";
import type { importedFileSchema } from "../../companion/contracts.ts";
import type { MediaTransferContext } from "./mcp-connection";

export async function receiveMedia(
  item: z.infer<typeof importedFileSchema>,
  context: MediaTransferContext,
) {
  const url = new URL(context.endpoint);
  url.protocol = "http:";
  url.pathname = `/media/${item.id}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${context.token}` },
    signal: context.signal,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Could not transfer ${item.name} (${response.status}). Reconnect the companion and retry.`,
    );
  const blob = await response.blob();
  if (blob.size !== item.size)
    throw new Error(`Incomplete transfer of ${item.name}. Retry the import.`);
  return new File([blob], item.name, { type: item.type });
}

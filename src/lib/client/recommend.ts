"use client";

import type { ItemKind } from "@/data/catalog/schema";
import type { RecommendedItem } from "@/lib/ai/recommend-core";
import type { Mode, SaasInfoInput } from "@/lib/schemas";
import { brand } from "@/config/brand";

type Events = {
  onItem: (item: RecommendedItem) => void;
  signal?: AbortSignal;
};

export class RecommendError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Chama POST /api/recommend e entrega cada item assim que ele chega pelo stream (SSE). */
export async function fetchRecommendations(
  body: {
    mode: Mode;
    saas: SaasInfoInput;
    kinds: ItemKind[];
    more: boolean;
    excludeIds: Record<ItemKind, string[]>;
  },
  { onItem, signal }: Events,
): Promise<number> {
  let res: Response;
  try {
    res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new RecommendError("Sem conexão com o servidor. Confira sua internet e tente de novo.", 0);
  }
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new RecommendError(data?.error ?? brand.copy.genericError, res.status);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let count = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const ev of events) {
      const line = ev.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const msg = JSON.parse(line.slice(6)) as
        | { type: "item"; item: RecommendedItem }
        | { type: "done"; count: number }
        | { type: "error"; message: string; status: number };
      if (msg.type === "item") {
        count++;
        onItem(msg.item);
      } else if (msg.type === "error") {
        throw new RecommendError(msg.message, msg.status);
      }
    }
  }
  return count;
}

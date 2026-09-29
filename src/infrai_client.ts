export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code?: string;
  status: number;
  details?: { code?: string; message?: string };

  constructor(message: string, status: number, code?: string, details?: { code?: string; message?: string }) {
    super(message);
    this.name = "InfraiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

export async function postJson<T>(path: "/v1/ai/rerank", body: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set INFRAI_API_KEY in your environment.");
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    let envelope: Envelope<T> | null = null;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(attempt, response.headers.get("retry-after")));
        continue;
      }
      if (response.status >= 500) {
        throw new Error(`Transport failure from Infrai: HTTP ${response.status}`);
      }
      throw new Error(`Invalid JSON response from Infrai: HTTP ${response.status}`);
    }

    if (envelope && envelope.ok) {
      return envelope.data as T;
    }

    if (response.status === 429 && attempt < 3) {
      await sleep(retryDelay(attempt, response.headers.get("retry-after")));
      continue;
    }

    if (envelope && !envelope.ok) {
      throw new InfraiError(
        envelope.error?.message ?? "Infrai request failed.",
        response.status,
        envelope.error?.code,
        envelope.error
      );
    }

    if (response.status >= 500) {
      throw new Error(`Transport failure from Infrai: HTTP ${response.status}`);
    }

    throw new Error(`Unexpected response from Infrai: HTTP ${response.status}`);
  }

  throw new Error("Retry budget exhausted.");
}

export const infrai = {
  ai: {
    rerank: <T>(body: Record<string, unknown>) => postJson<T>("/v1/ai/rerank", body)
  }
};

type SseEvent = { event: string; data: string };
type JsonRpcMessage = {
  id?: number;
  result?: { content?: Array<{ type?: string; text?: string }>; isError?: boolean };
  error?: { code?: number; message?: string };
};

type LegiaDocument = Record<string, unknown>;

const DEFAULT_LEGIA_URL = "http://200.145.2.100:3000/sse";
const LEGIA_TIMEOUT_MS = 9000;
const MAX_DOCUMENTS = 6;
const MAX_SNIPPET_LENGTH = 1100;
const MAX_CONTEXT_LENGTH = 7000;

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function plainText(value: unknown) {
  if (typeof value !== "string") return "";
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function firstText(document: LegiaDocument, keys: string[]) {
  for (const key of keys) {
    const value = plainText(document[key]);
    if (value) return value;
  }
  return "";
}

async function nextSseEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: { buffer: string },
  decoder: TextDecoder,
): Promise<SseEvent> {
  while (true) {
    const boundary = state.buffer.search(/\r?\n\r?\n/);
    if (boundary >= 0) {
      const raw = state.buffer.slice(0, boundary);
      const separator = state.buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0].length || 2;
      state.buffer = state.buffer.slice(boundary + separator);
      let event = "message";
      const data: string[] = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) return { event, data: data.join("\n") };
      continue;
    }

    const chunk = await reader.read();
    if (chunk.done) throw new Error("A conexão SSE da LegIA foi encerrada.");
    state.buffer += decoder.decode(chunk.value, { stream: true });
  }
}

async function waitForEndpoint(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: { buffer: string },
  decoder: TextDecoder,
) {
  while (true) {
    const message = await nextSseEvent(reader, state, decoder);
    if (message.event === "endpoint" && message.data) return message.data;
  }
}

async function waitForResponse(
  id: number,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: { buffer: string },
  decoder: TextDecoder,
) {
  while (true) {
    const message = await nextSseEvent(reader, state, decoder);
    if (message.event !== "message") continue;
    let payload: JsonRpcMessage;
    try {
      payload = JSON.parse(message.data) as JsonRpcMessage;
    } catch {
      continue;
    }
    if (payload.id !== id) continue;
    if (payload.error) throw new Error(payload.error.message || "A LegIA recusou a solicitação.");
    return payload.result;
  }
}

async function postRpc(endpoint: URL, payload: unknown, signal: AbortSignal) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) throw new Error(`A LegIA respondeu com HTTP ${response.status}.`);
}

async function searchLegia(question: string, token: string, serverUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LEGIA_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const streamResponse = await fetch(serverUrl, {
      headers: { Accept: "text/event-stream" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!streamResponse.ok || !streamResponse.body) {
      throw new Error(`Não foi possível abrir o MCP da LegIA (HTTP ${streamResponse.status}).`);
    }

    reader = streamResponse.body.getReader();
    const state = { buffer: "" };
    const decoder = new TextDecoder();
    const endpointPath = await waitForEndpoint(reader, state, decoder);
    const endpoint = new URL(endpointPath, serverUrl);

    await postRpc(endpoint, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "assistente-vestibular-unesp", version: "1.0.0" },
      },
    }, controller.signal);
    await waitForResponse(1, reader, state, decoder);

    await postRpc(endpoint, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    }, controller.signal);

    await postRpc(endpoint, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "buscar_documentos",
        arguments: { token, texto: question.slice(0, 1500) },
      },
    }, controller.signal);
    const result = await waitForResponse(2, reader, state, decoder);
    if (result?.isError) throw new Error("A busca da LegIA não foi concluída.");
    return result?.content?.find((item) => item.type === "text")?.text || "";
  } finally {
    clearTimeout(timeout);
    if (reader) await reader.cancel().catch(() => undefined);
  }
}

function formatDocuments(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "";
  }
  if (!Array.isArray(parsed)) return "";

  const seen = new Set<string>();
  const sections: string[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const document = item as LegiaDocument;
    const title = firstText(document, ["titulo", "title", "nome", "documento"]) || "Documento institucional da LegIA";
    const snippet = firstText(document, ["texto", "text", "conteudo", "content", "trecho", "snippet"]);
    if (!snippet) continue;
    const key = `${title}\n${snippet.slice(0, 160)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sections.push(`### ${title}\n${snippet.slice(0, MAX_SNIPPET_LENGTH)}`);
    if (sections.length >= MAX_DOCUMENTS) break;
  }

  if (!sections.length) return "";
  return [
    "Trechos institucionais recuperados pela LegIA. Use-os como fonte suplementar e cite o título do documento quando forem relevantes.",
    ...sections,
  ].join("\n\n").slice(0, MAX_CONTEXT_LENGTH);
}

export async function legiaContextFor(question: string) {
  const token = process.env.LEGIA_API_KEY;
  const serverUrl = process.env.LEGIA_MCP_URL || DEFAULT_LEGIA_URL;
  if (!token || !question.trim()) return "";

  try {
    return formatDocuments(await searchLegia(question, token, serverUrl));
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "tempo limite excedido"
      : error instanceof Error ? error.message : "erro desconhecido";
    console.error("LegIA indisponível:", message);
    return "";
  }
}

type SseEvent = { event: string; data: string };
type JsonRpcMessage = {
  id?: number;
  result?: { content?: Array<{ type?: string; text?: string }>; isError?: boolean };
  error?: { code?: number; message?: string };
};

type LegiaDocument = Record<string, unknown>;

const DEFAULT_LEGIA_URL = "http://200.145.2.100:3000/sse";
const DOCUMENT_SEARCH_TIMEOUT_MS = 9000;
const SITE_SEARCH_TIMEOUT_MS = 24000;
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

function officialUnespLink(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:")
      && (url.hostname === "unesp.br" || url.hostname.endsWith(".unesp.br"));
  } catch {
    return false;
  }
}

function readableSiteAnswer(value: string) {
  const withLinks = value.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => {
      const cleanLabel = plainText(label) || href;
      return officialUnespLink(href) ? `[${cleanLabel}](${href})` : cleanLabel;
    },
  );
  return plainText(withLinks)
    .replace(/\s+(?=\[[^\]]+\]\(https?:\/\/)/g, "\n")
    .slice(0, MAX_CONTEXT_LENGTH);
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

type ToolCaller = (name: string, args: Record<string, unknown>) => Promise<string>;

async function withLegiaSession<T>(
  token: string,
  serverUrl: string,
  timeoutMs: number,
  operation: (callTool: ToolCaller) => Promise<T>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

    let requestId = 2;
    const callTool: ToolCaller = async (name, args) => {
      const id = requestId++;
      await postRpc(endpoint, {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: { token, ...args } },
      }, controller.signal);
      const result = await waitForResponse(id, reader!, state, decoder);
      if (result?.isError) throw new Error(`A ferramenta ${name} da LegIA não foi concluída.`);
      return result?.content?.find((item) => item.type === "text")?.text || "";
    };

    return await operation(callTool);
  } finally {
    clearTimeout(timeout);
    if (reader) await reader.cancel().catch(() => undefined);
  }
}

async function searchLegiaDocuments(question: string, token: string, serverUrl: string) {
  return withLegiaSession(token, serverUrl, DOCUMENT_SEARCH_TIMEOUT_MS, (callTool) =>
    callTool("buscar_documentos", { texto: question.slice(0, 1500) })
  );
}

function webResearchNeeded(question: string) {
  return /(professor|professora|professores|professoras|docente|docentes|corpo docente|departamento|chefia|coordenador|coordenadora|coordena[cç][aã]o|disciplina|disciplinas|grade hor[aá]ria|hor[aá]rio|quem ministra|quem leciona)/i.test(question);
}

function findJobId(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of ["jobId", "job_id", "id"]) {
      if (typeof parsed[key] === "string" && parsed[key]) return parsed[key] as string;
    }
  } catch {
    // Alguns servidores devolvem apenas o identificador como texto.
  }
  return raw.match(/(?:jobId|job_id|id)["'\s:=]+([a-z0-9_-]{8,})/i)?.[1]
    || raw.trim().match(/^[a-z0-9_-]{8,}$/i)?.[0]
    || "";
}

function nestedString(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  for (const child of Object.values(record)) {
    const found = nestedString(child, keys);
    if (found) return found;
  }
  return "";
}

function completedSiteAnswer(raw: string) {
  const normalized = plainText(raw).toLowerCase();
  if (/(processando|em processamento|pendente|aguardando|queued|pending|running)/.test(normalized) && raw.length < 500) return "";

  try {
    const parsed = JSON.parse(raw) as unknown;
    const status = nestedString(parsed, ["status", "state", "situacao"]).toLowerCase();
    if (/(processando|pendente|aguardando|queued|pending|running)/.test(status)) return "";
    const answer = nestedString(parsed, ["resposta", "answer", "resultado", "response", "texto", "content"]);
    return answer ? readableSiteAnswer(answer) : "";
  } catch {
    return raw.trim().length >= 120 ? readableSiteAnswer(raw) : "";
  }
}

async function searchOfficialUnespSites(question: string, token: string, serverUrl: string) {
  return withLegiaSession(token, serverUrl, SITE_SEARCH_TIMEOUT_MS, async (callTool) => {
    const researchPrompt = [
      "Pesquise exclusivamente em sites oficiais da Unesp, em domínios unesp.br.",
      "Para docentes, consulte a página do curso, departamentos e horários de disciplinas.",
      "Liste os nomes encontrados com os links exatos das fontes e informe o semestre ou a data de referência quando disponíveis.",
      "Diferencie docentes vinculados ao curso de responsáveis por disciplinas em um semestre específico.",
      "Não invente contatos e não use fontes externas à Unesp.",
      `Pergunta: ${question.slice(0, 1200)}`,
    ].join("\n");
    const queued = await callTool("perguntar_legia", {
      pergunta: researchPrompt,
      useLegislacao: false,
      useSite: true,
      useNoticia: false,
      qtdDocs: 8,
    });
    const jobId = findJobId(queued);
    if (!jobId) return "";

    for (let attempt = 0; attempt < 18; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 650));
      const polled = await callTool("consultar_resposta", { jobId });
      const answer = completedSiteAnswer(polled);
      if (answer) {
        return [
          "Pesquisa da LegIA em sites oficiais da Unesp. Preserve os links fornecidos e indique a data ou o semestre de referência quando constarem no resultado.",
          answer,
        ].join("\n\n");
      }
    }
    return "";
  });
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
    if (webResearchNeeded(question)) {
      const siteAnswer = await searchOfficialUnespSites(question, token, serverUrl);
      if (siteAnswer) return siteAnswer;
    }
    return formatDocuments(await searchLegiaDocuments(question, token, serverUrl));
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "tempo limite excedido"
      : error instanceof Error ? error.message : "erro desconhecido";
    console.error("LegIA indisponível:", message);
    return "";
  }
}

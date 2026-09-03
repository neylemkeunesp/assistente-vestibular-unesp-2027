"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  { label: "Cursos e cidades", question: "Quais cursos existem em Botucatu?" },
  { label: "Ingresso", question: "Como funciona a reserva de vagas?" },
  { label: "Notas de corte", question: "Qual foi a nota de corte de Medicina de 2023 a 2026?" },
  { label: "Vida universitária", question: "Como é morar em Bauru?" },
  { label: "Carreiras", question: "O que o estudo de egressos mostra sobre Medicina?" },
  { label: "Permanência", question: "Quais auxílios podem apoiar a permanência estudantil?" },
];

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\)|\*[^*]+\*)/g);
  return tokens.filter(Boolean).map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    return token;
  });
}

function normalizeHeaderText(value: string) {
  return value.replace(/\*\*/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function repairTableHeader(header: string[]) {
  if (header.filter((cell) => normalizeHeaderText(cell)).length !== 1) return header;
  const knownHeaders = [
    ["Formação", "Número de entrevistados", "Média mensal", "Menor valor", "Maior valor"],
  ];
  const combined = normalizeHeaderText(header.join(""));
  return knownHeaders.find((candidate) => candidate.length === header.length && normalizeHeaderText(candidate.join("")) === combined) || header;
}

function Markdown({ content }: { content: string }) {
  const blocks = content.trim().split(/\n\s*\n/);
  return <div className="markdown">{blocks.map((block, blockIndex) => {
    const lines = block.split("\n");
    const heading = lines[0]?.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const Tag = `h${heading[1].length}` as "h1" | "h2" | "h3";
      return <Tag key={blockIndex}>{renderInline(heading[2])}</Tag>;
    }
    if (lines[0]?.startsWith("```") && lines.at(-1)?.trim() === "```") {
      return <pre key={blockIndex}><code>{lines.slice(1, -1).join("\n")}</code></pre>;
    }
    if (lines.length >= 2 && lines.every((line) => line.includes("|")) && /-{3,}/.test(lines[1])) {
      const rows = lines
        .filter((_, index) => index !== 1)
        .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
      const header = repairTableHeader(rows[0] || []);
      const body = rows.slice(1).map((row) => Array.from({ length: header.length }, (_, index) => row[index] || ""));
      return <div className="table-wrap" key={blockIndex}><table><thead><tr>{header.map((cell, index) => <th key={index}>{renderInline(cell)}</th>)}</tr></thead><tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index}>{renderInline(cell)}</td>)}</tr>)}</tbody></table></div>;
    }
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return <ul key={blockIndex}>{lines.map((line, index) => <li key={index}>{renderInline(line.replace(/^[-*]\s+/, ""))}</li>)}</ul>;
    }
    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return <ol key={blockIndex}>{lines.map((line, index) => <li key={index}>{renderInline(line.replace(/^\d+\.\s+/, ""))}</li>)}</ol>;
    }
    if (lines.every((line) => /^>\s?/.test(line))) {
      return <blockquote key={blockIndex}>{lines.map((line, index) => <span key={index}>{renderInline(line.replace(/^>\s?/, ""))}{index < lines.length - 1 && <br />}</span>)}</blockquote>;
    }
    return <p key={blockIndex}>{lines.map((line, index) => <span key={index}>{renderInline(line)}{index < lines.length - 1 && <br />}</span>)}</p>;
  })}</div>;
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  async function ask(content: string) {
    const clean = content.trim();
    if (!clean || loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);
    queueMicrotask(() => conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" }));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível responder agora.");
      setMessages([...nextMessages, { role: "assistant", content: data.answer }]);
    } catch (error) {
      const content = error instanceof Error ? error.message : "Não foi possível responder agora. Tente novamente.";
      setMessages([...nextMessages, { role: "assistant", content }]);
    } finally {
      setLoading(false);
      setTimeout(() => conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" }), 20);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <div className="chat-card">
      <div className="chat-header">
        <div className="assistant-identity">
          <span className="assistant-mark" aria-hidden="true">U</span>
          <div><strong>Assistente Unesp</strong><span><i aria-hidden="true" /> Base 2027 disponível</span></div>
        </div>
        <span className="chat-source">Respostas com referências</span>
      </div>

      <div className="conversation" ref={conversationRef} role="log" aria-live="polite" aria-busy={loading}>
        <div className="message-row assistant-row">
          <span className="avatar" aria-hidden="true">U</span>
          <div className="message assistant-message">
            <strong>Olá! O que você quer descobrir?</strong>
            <p>Posso comparar cursos e cidades, explicar regras, mostrar notas de corte e apresentar trajetórias de pessoas formadas pela Unesp.</p>
          </div>
        </div>
        {messages.map((message, index) => (
          <div className={`message-row ${message.role}-row`} key={`${message.role}-${index}`}>
            {message.role === "assistant" && <span className="avatar" aria-hidden="true">U</span>}
            <div className={`message ${message.role}-message`}>
              {message.role === "assistant" ? <Markdown content={message.content} /> : message.content}
            </div>
          </div>
        ))}
        {loading && <div className="message-row assistant-row" role="status"><span className="avatar" aria-hidden="true">U</span><div className="message assistant-message loading-message"><span /><span /><span /><em>Consultando as fontes…</em></div></div>}
      </div>

      {messages.length === 0 && <div className="suggestion-area"><p>Comece por uma pergunta</p><div className="suggestions" aria-label="Perguntas sugeridas">{suggestions.map((suggestion, index) => <button type="button" key={suggestion.question} onClick={() => void ask(suggestion.question)}><span className="suggestion-number">{String(index + 1).padStart(2, "0")}</span><span><small>{suggestion.label}</small>{suggestion.question}</span><span className="suggestion-arrow" aria-hidden="true">↗</span></button>)}</div></div>}

      <form className="composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="question">Faça sua pergunta</label>
        <div className="composer-field">
          <textarea id="question" rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Escreva sua dúvida sobre o Vestibular Unesp…" disabled={loading} aria-describedby="question-hint" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(question); } }} />
          <span id="question-hint">Enter envia · Shift + Enter cria uma nova linha</span>
        </div>
        <button type="submit" className="send-button" disabled={loading || !question.trim()} aria-label={loading ? "Enviando pergunta" : "Enviar pergunta"}><span>Enviar</span><span aria-hidden="true">→</span></button>
      </form>
    </div>
  );
}

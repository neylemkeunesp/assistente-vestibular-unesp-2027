import knowledge from "../../data/knowledge-base.md?raw";
import manualSource from "../../data/manual-source.md?raw";
import cityGuide from "../../data/city-guide.md?raw";
import campusAddresses from "../../data/campus-addresses.md?raw";
import careerGuide from "../../data/career-guide.md?raw";
import professionsSource from "../../data/professions-source.md?raw";
import studentSupport from "../../data/student-support.md?raw";
import historicalDemandGuide from "../../data/historical-demand-guide.md?raw";
import historicalDemandData from "../../data/historical-demand-data.json";
import instructions from "../../data/system-prompt.txt?raw";

export const runtime = "edge";

type ChatMessage = { role: "user" | "assistant"; content: string };
type DemandRecord = (typeof historicalDemandData.records)[number];

const dataVersion = "manual-cidades-carreiras-procura-e-permanencia-2027-20260831";
const manualPages = manualSource.split(/(?=## Página \d+)/).filter((part) => /^## Página \d+/.test(part));
const cityNames = [
  "Araçatuba", "Araraquara", "Assis", "Bauru", "Botucatu", "Dracena", "Franca", "Guaratinguetá",
  "Ilha Solteira", "Itapeva", "Jaboticabal", "Marília", "Ourinhos", "Presidente Prudente", "Registro",
  "Rio Claro", "Rosana", "São João da Boa Vista", "São José do Rio Preto", "São José dos Campos", "São Paulo",
  "São Vicente", "Sorocaba", "Tupã"
];
const guideParts = cityGuide.split(/(?=^## )/m);
const citySections = new Map(cityNames.map((city) => [city, guideParts.find((part) => part.startsWith("## " + city + "\n")) || ""]));
const addressParts = campusAddresses.split(/(?=^## )/m);
const addressSections = new Map(cityNames.map((city) => [city, addressParts.find((part) => part.startsWith("## " + city + "\n")) || ""]));
const careerNames = [
  "Administração", "Administração Pública", "Arquitetura e Urbanismo", "Arquivologia", "Arte-Teatro",
  "Artes Cênicas", "Artes Visuais", "Biblioteconomia", "Ciência da Computação", "Ciências Biológicas",
  "Ciências Biomédicas", "Ciências Econômicas", "Ciências Sociais", "Comunicação Audiovisual", "Design",
  "Direito", "Ecologia", "Educação Física", "Enfermagem", "Engenharia Aeronáutica", "Engenharia Agronômica",
  "Engenharia Ambiental", "Engenharia Cartográfica e de Agrimensura", "Engenharia Civil", "Engenharia de Alimentos",
  "Engenharia de Bioprocessos e Biotecnologia", "Engenharia de Biossistemas", "Engenharia de Controle e Automação",
  "Engenharia de Energia", "Engenharia de Materiais", "Engenharia de Pesca", "Engenharia de Produção",
  "Engenharia Eletrônica e de Telecomunicações", "Engenharia Elétrica", "Engenharia Florestal",
  "Engenharia Industrial-Madeira", "Engenharia Mecânica", "Engenharia Química", "Estatística", "Farmácia",
  "Filosofia", "Física", "Física Médica", "Fisioterapia", "Fonoaudiologia", "Geografia", "Geologia", "História",
  "Jornalismo", "Letras", "Letras-Tradução", "Matemática", "Medicina", "Medicina Veterinária", "Meteorologia",
  "Música", "Nutrição", "Odontologia", "Pedagogia", "Psicologia", "Química", "Relações Internacionais",
  "Relações Públicas", "Serviço Social", "Sistemas de Informação", "Terapia Ocupacional", "Turismo", "Zootecnia"
];
const careerGuideParts = careerGuide.split(/(?=^## )/m);
const professionPages = professionsSource.split(/(?=^## Página \d+)/m).filter((part) => {
  const match = part.match(/^## Página (\d+)/);
  return match && Number(match[1]) >= 30;
});

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—-]/g, " ").toLowerCase();
}

function mentionsPhrase(text: string, phrase: string) {
  const escaped = normalizeText(phrase).replace(/[.*+?^{}$()|[\]\\]/g, "\\$&");
  return new RegExp("(?:^|[^a-z])" + escaped + "(?:$|[^a-z])").test(text);
}

function pagesFor(question: string) {
  const normalized = normalizeText(question);
  const terms = [...new Set(normalized.match(/[a-z]{3,}/g) || [])]
    .filter((term) => !["para", "como", "qual", "quais", "sobre", "tenho", "quero", "preciso", "unesp", "vestibular", "candidato"].includes(term));
  const selected = new Set<string>();
  const addPages = (pattern: RegExp) => {
    for (const page of manualPages) if (pattern.test(page)) selected.add(page);
  };
  if (/(curso|cursos|cidade|cidades|unidade|unidades|vaga|vagas|periodo|modalidade)/.test(normalized)) addPages(/^## Página (5|6|7|8|9|10)\b/);
  if (/(inscri|taxa|isencao|reducao|nome social|condicao especial|deficien|libras|lactante|atendimento)/.test(normalized)) addPages(/^## Página (11|12|13|14)\b/);
  if (/(prova|fase|redacao|portao|documento|habilidade)/.test(normalized)) addPages(/^## Página (18|19|20|21|35|36)\b/);
  if (/(matricula|chamada|convoc|segunda opcao|relacao adicional|sisgrad)/.test(normalized)) addPages(/^## Página (23|24|25|26)\b/);
  const ranked = manualPages
    .map((page) => ({ page, score: terms.reduce((total, term) => total + (normalizeText(page).match(new RegExp(term, "g")) || []).length, 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ page }) => page);
  for (const page of ranked) selected.add(page);
  return [...selected].slice(0, 14).join("\n\n");
}

function cityContextFor(currentQuestion: string, conversationText: string) {
  const current = normalizeText(currentQuestion);
  const conversation = normalizeText(conversationText);
  const cityTopic = /(cidade|cidades|vida social|vida estudantil|custo|aluguel|moradia|demografia|populacao|historia|lazer|cultura|transporte|campus)/.test(current);
  const currentMatches = cityNames.filter((city) => mentionsPhrase(current, city));
  const matched = currentMatches.length ? currentMatches : cityNames.filter((city) => mentionsPhrase(conversation, city));
  if (matched.length) {
    const methodology = guideParts.find((part) => part.startsWith("## Como interpretar este guia")) || "";
    return [methodology, ...matched.slice(-4).map((city) => citySections.get(city))].filter(Boolean).join("\n\n");
  }
  if (cityTopic) {
    return [
      guideParts.find((part) => part.startsWith("## Como interpretar este guia")),
      guideParts.find((part) => part.startsWith("## Comparação rápida")),
      guideParts.find((part) => part.startsWith("## Perguntas práticas")),
      guideParts.find((part) => part.startsWith("## Fontes gerais"))
    ].filter(Boolean).join("\n\n");
  }
  return "";
}

function supportContextFor(question: string) {
  return /(bolsa|auxilio|permanencia|moradia estudantil|restaurante universitario|subsidio|vulnerabilidade|servico social)/.test(normalizeText(question))
    ? studentSupport
    : "";
}

function addressContextFor(currentQuestion: string, conversationText: string) {
  const current = normalizeText(currentQuestion);
  if (!/(endereco|onde fica|localizacao|localizar|campus|campi|unidade|como chegar)/.test(current)) return "";
  const currentMatches = cityNames.filter((city) => mentionsPhrase(current, city));
  const matched = currentMatches.length ? currentMatches : cityNames.filter((city) => mentionsPhrase(normalizeText(conversationText), city));
  if (matched.length) {
    const scope = addressParts.find((part) => part.startsWith("## Escopo e orientação")) || "";
    return [scope, ...matched.slice(-4).map((city) => addressSections.get(city))].filter(Boolean).join("\n\n");
  }
  return campusAddresses;
}

function professionPagesFor(question: string) {
  let normalized = normalizeText(question);
  if (normalized.includes("comunicacao audiovisual")) normalized += " radio tv internet producao audiovisual";
  const terms = [...new Set(normalized.match(/[a-z]{4,}/g) || [])]
    .filter((term) => !["como", "qual", "quais", "sobre", "curso", "cursos", "unesp", "profissao", "profissoes", "mercado", "trabalho"].includes(term));
  return professionPages
    .map((page) => ({ page, score: terms.reduce((total, term) => total + (normalizeText(page).match(new RegExp(term, "g")) || []).length, 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ page }) => page)
    .join("\n\n");
}

function careerContextFor(currentQuestion: string, conversationText: string) {
  const current = normalizeText(currentQuestion);
  const conversation = normalizeText(conversationText);
  const topic = /(profiss|carreira|mercado de trabalho|trabalhar|atuacao|atua|salario|remuneracao|emprego|ocupacao|habilita|conselho profissional|registro profissional)/.test(current);
  const currentMatches = careerNames.filter((career) => mentionsPhrase(current, career));
  const matched = currentMatches.length ? currentMatches : careerNames.filter((career) => mentionsPhrase(conversation, career));
  if (!topic && !matched.length) return "";
  if (!matched.length) return careerGuide;
  const sourcePages = professionPagesFor(currentQuestion + "\n" + matched.join(" "));
  return [
    careerGuideParts.find((part) => part.startsWith("## Como interpretar")),
    ...careerGuideParts.filter((part) => matched.some((career) => normalizeText(part).includes(normalizeText(career)))),
    careerGuideParts.find((part) => part.startsWith("## Como comparar")),
    careerGuideParts.find((part) => part.startsWith("## Fontes, atualização")),
    sourcePages && "TRECHOS DO GUIA DE PROFISSÕES UNESP 2024:\n" + sourcePages
  ].filter(Boolean).join("\n\n");
}

function normalizeDemandCourse(value: string) {
  return normalizeText(value).replace(/\bciencias da computacao\b/g, "ciencia da computacao").replace(/\s+/g, " ").trim();
}

function demandCourseOf(option: string) {
  return option.split(" - ")[0].trim();
}

const canonicalDemandCourses = [...new Set(historicalDemandData.records.map(({ option }) => normalizeDemandCourse(demandCourseOf(option))))];

function demandContextFor(currentQuestion: string, conversationText: string) {
  const current = normalizeText(currentQuestion);
  if (!/(procura|concorr|candidat.{0,12}vaga|inscrit|demanda|edicoes? anteriores?|historico|evolu|mais disputad|menos disputad)/.test(current)) return "";
  const currentDemand = normalizeDemandCourse(currentQuestion);
  const conversationDemand = normalizeDemandCourse(conversationText);
  const currentCourses = canonicalDemandCourses.filter((course) => currentDemand.includes(course));
  const conversationCourses = canonicalDemandCourses.filter((course) => conversationDemand.includes(course));
  const rawCourses = currentCourses.length ? currentCourses : conversationCourses;
  const matchedCourses = rawCourses.filter((course) => !rawCourses.some((other) => other !== course && other.includes(course)));
  const currentCities = cityNames.filter((city) => mentionsPhrase(current, city));
  const conversationCities = cityNames.filter((city) => mentionsPhrase(normalizeText(conversationText), city));
  const matchedCities = currentCities.length ? currentCities : conversationCities;
  let requestedYears = [...new Set((currentQuestion.match(/20(?:23|24|25|26)/g) || []).map(Number))];
  if (requestedYears.length === 2 && (current.includes("entre ") || /de 20(?:23|24|25|26) (?:a|ate) 20(?:23|24|25|26)/.test(current))) {
    const first = Math.min(...requestedYears);
    const last = Math.max(...requestedYears);
    requestedYears = historicalDemandData.editions.filter((year) => year >= first && year <= last);
  }
  const years = requestedYears.length ? requestedYears : historicalDemandData.editions;
  const isRanking = /(mais|menos).{0,20}(procur|concorr|disput)|ranking|maior|menor/.test(current);
  const relevantTerms = [...new Set(current.match(/[a-z]{4,}/g) || [])].filter((term) =>
    !["procura", "curso", "cursos", "unesp", "vestibular", "edicao", "edicoes", "anterior", "anteriores", "historico", "historica", "historicas", "candidato", "candidatos", "vaga", "vagas", "inscrito", "inscritos", "compare", "comparar", "evolucao", "demanda"].includes(term)
  );
  let rows: DemandRecord[] = historicalDemandData.records.filter(({ edition }) => years.includes(edition));
  if (matchedCourses.length) {
    const courses = new Set(matchedCourses);
    rows = rows.filter(({ option }) => courses.has(normalizeDemandCourse(demandCourseOf(option))));
  } else if (relevantTerms.length && !matchedCities.length && !isRanking) {
    const scored = rows.map((row) => ({ row, score: relevantTerms.reduce((total, term) => total + (normalizeText(row.option).includes(term) ? 1 : 0), 0) }));
    const best = Math.max(0, ...scored.map(({ score }) => score));
    if (best > 0) rows = scored.filter(({ score }) => score === best).map(({ row }) => row);
  }
  if (matchedCities.length) {
    rows = rows.filter(({ option }) => matchedCities.some((city) => {
      const normalizedOption = normalizeText(option);
      return normalizedOption.includes(normalizeText(city)) || (city === "São Vicente" && normalizedOption.includes("litoral paulista"));
    }));
  }
  if (isRanking) {
    rows = years.flatMap((edition) => {
      const editionRows = rows.filter((row) => row.edition === edition);
      const metric: "applicants" | "candidatesPerVacancy" = /(inscrit|procur)/.test(current) && !/(candidat.{0,12}vaga|concorr|disput)/.test(current) ? "applicants" : "candidatesPerVacancy";
      const direction = /(menos|menor)/.test(current) ? 1 : -1;
      return editionRows.sort((a, b) => direction * (a[metric] - b[metric])).slice(0, 12);
    });
  } else if (rows.length > 100) {
    rows = rows.sort((a, b) => b.candidatesPerVacancy - a.candidatesPerVacancy).slice(0, 100);
  }
  if (!rows.length) return historicalDemandGuide + "\n\nNenhuma linha específica correspondeu aos filtros da pergunta.";
  rows.sort((a, b) => a.edition - b.edition || a.option.localeCompare(b.option, "pt-BR"));
  const table = [
    "| Edição | Código | Opção de ingresso | Inscritos | Vagas | Candidatos/vaga |",
    "|---:|---:|---|---:|---:|---:|",
    ...rows.map((row) => "| " + row.edition + " | " + row.code + " | " + row.option.replace(/\|/g, "\\|") + " | " + row.applicants.toLocaleString("pt-BR") + " | " + row.vacancies.toLocaleString("pt-BR") + " | " + row.candidatesPerVacancy.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " |")
  ].join("\n");
  return historicalDemandGuide + "\n\n## Linhas selecionadas para a pergunta\n\n" + table;
}

function extractAnswer(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  if (payload.output_text) return payload.output_text;
  return payload.output?.flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text || "").join("\n") || "";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "A chave da OpenAI ainda não foi configurada neste site." }, { status: 503 });
    const body = await request.json() as { messages?: ChatMessage[] };
    if (!Array.isArray(body.messages) || !body.messages.length) return Response.json({ error: "Envie uma pergunta." }, { status: 400 });
    const recent = body.messages.slice(-8).map(({ role, content }) => ({
      role: role === "assistant" ? "assistant" as const : "user" as const,
      content: String(content).slice(0, 4000)
    }));
    const currentQuestion = recent.at(-1)?.content || "";
    const conversationText = recent.filter(({ role }) => role === "user").map(({ content }) => content).join("\n");
    const cityContext = cityContextFor(currentQuestion, conversationText);
    const supportContext = supportContextFor(currentQuestion);
    const addressContext = addressContextFor(currentQuestion, conversationText);
    const careerContext = careerContextFor(currentQuestion, conversationText);
    const demandContext = demandContextFor(currentQuestion, conversationText);
    const broadCareer = Boolean(careerContext) && /(todas|todos|quais|lista|comparar varias)/.test(normalizeText(currentQuestion));
    const broadDemand = Boolean(demandContext) && /(quais|ranking|mais|menos|todos|todas)/.test(normalizeText(currentQuestion));
    const maxOutputTokens = addressContext === campusAddresses || broadCareer ? 2800 : broadDemand ? 2400 : careerContext || demandContext ? 1800 : 1400;
    const fullInstructions = [
      instructions,
      "GUIA RESUMIDO OFICIAL:\n" + knowledge,
      "PÁGINAS RELEVANTES DO MANUAL INTEGRAL:\n" + pagesFor(currentQuestion),
      "GUIA RELEVANTE DAS CIDADES-SEDE:\n" + (cityContext || "Nenhum contexto municipal foi necessário para esta pergunta."),
      "ENDEREÇOS RELEVANTES DAS UNIDADES:\n" + (addressContext || "Nenhum endereço foi necessário para esta pergunta."),
      "GUIA RELEVANTE DE PROFISSÕES E MERCADO:\n" + (careerContext || "Nenhum contexto de carreira foi necessário para esta pergunta."),
      "DADOS HISTÓRICOS DE PROCURA:\n" + (demandContext || "Nenhum dado histórico de procura foi necessário para esta pergunta."),
      "GUIA DE PERMANÊNCIA ESTUDANTIL:\n" + (supportContext || "Nenhum contexto de permanência foi necessário para esta pergunta.")
    ].join("\n\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: "gpt-5.6", instructions: fullInstructions, input: recent, max_output_tokens: maxOutputTokens, store: false })
    });
    const payload = await response.json() as { error?: { message?: string }; output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    if (!response.ok) {
      console.error("OpenAI Responses API:", response.status, payload.error?.message || "erro sem mensagem");
      return Response.json({ error: "Não foi possível responder agora. Tente novamente." }, { status: 502 });
    }
    const answer = extractAnswer(payload);
    if (!answer) return Response.json({ error: "A resposta veio vazia. Tente reformular a pergunta." }, { status: 502 });
    return Response.json({ answer, dataVersion });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível responder agora. Tente novamente." }, { status: 500 });
  }
}

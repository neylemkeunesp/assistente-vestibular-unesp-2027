import knowledge from "../../data/knowledge-base.md?raw";
import manualSource from "../../data/manual-source.md?raw";
import cityGuide from "../../data/city-guide.md?raw";
import campusAddresses from "../../data/campus-addresses.md?raw";
import careerGuide from "../../data/career-guide.md?raw";
import professionsSource from "../../data/professions-source.md?raw";
import studentSupport from "../../data/student-support.md?raw";
import cutoffGuide from "../../data/cutoff-guide.md?raw";
import cutoffData from "../../data/cutoff-data.json";
import trajectoriesGuide from "../../data/trajectories-guide.md?raw";
import trajectoriesSource from "../../data/trajectories-source.md?raw";
import instructions from "../../data/system-prompt.txt?raw";

export const runtime = "edge";

type ChatMessage = { role: "user" | "assistant"; content: string };
type CutoffRecord = (typeof cutoffData.records)[number];

const dataVersion = "manual-cidades-carreiras-cortes-trajetorias-e-permanencia-2027-20260902";
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

const trajectoryPages = trajectoriesSource
  .split(/(?=^## Página \d+)/m)
  .map((text) => ({ text, page: Number(text.match(/^## Página (\d+)/)?.[1] || 0), normalized: normalizeText(text) }))
  .filter(({ page }) => page > 0);

const trajectoryChapterStarts = [
  { title: "Administração", start: 43, names: ["Administração"] },
  { title: "Administração de Empresas e Agronegócios", start: 62, end: 80, names: ["Administração de Empresas e Agronegócios", "Agronegócios"] },
  { title: "Administração Pública", start: 101, names: ["Administração Pública"] },
  { title: "Arquitetura e Urbanismo", start: 118, names: ["Arquitetura e Urbanismo"] },
  { title: "Arquivologia", start: 137, names: ["Arquivologia"] },
  { title: "Arte-Teatro", start: 151, names: ["Arte-Teatro", "Artes Cênicas"] },
  { title: "Biblioteconomia", start: 165, names: ["Biblioteconomia"] },
  { title: "Biologia Marinha e Gerenciamento Costeiro", start: 177, names: ["Biologia Marinha e Gerenciamento Costeiro", "Biologia Marinha", "Gerenciamento Costeiro"] },
  { title: "Ciência da Computação", start: 195, names: ["Ciência da Computação", "Ciências da Computação"] },
  { title: "Ciências Biológicas", start: 207, names: ["Ciências Biológicas"] },
  { title: "Ciências Econômicas", start: 225, names: ["Ciências Econômicas", "Economia"] },
  { title: "Ciências Sociais", start: 239, names: ["Ciências Sociais"] },
  { title: "Design", start: 252, names: ["Design"] },
  { title: "Direito", start: 269, names: ["Direito"] },
  { title: "Ecologia", start: 279, names: ["Ecologia"] },
  { title: "Educação Física", start: 292, names: ["Educação Física"] },
  { title: "Enfermagem", start: 303, names: ["Enfermagem"] },
  { title: "Engenharia Agronômica", start: 318, names: ["Engenharia Agronômica", "Agronomia"] },
  { title: "Engenharia Ambiental", start: 330, names: ["Engenharia Ambiental"] },
  { title: "Engenharia de Bioprocessos e Biotecnologia", start: 343, names: ["Engenharia de Bioprocessos e Biotecnologia", "Bioprocessos e Biotecnologia"] },
  { title: "Engenharia Cartográfica e de Agrimensura", start: 357, names: ["Engenharia Cartográfica e de Agrimensura", "Engenharia Cartográfica", "Agrimensura"] },
  { title: "Engenharia Civil", start: 372, names: ["Engenharia Civil"] },
  { title: "Engenharia de Alimentos", start: 391, names: ["Engenharia de Alimentos"] },
  { title: "Engenharia de Controle e Automação", start: 407, names: ["Engenharia de Controle e Automação", "Controle e Automação"] },
  { title: "Engenharia de Materiais", start: 420, names: ["Engenharia de Materiais"] },
  { title: "Engenharia de Produção", start: 430, names: ["Engenharia de Produção"] },
  { title: "Engenharia Elétrica", start: 442, names: ["Engenharia Elétrica"] },
  { title: "Engenharia Florestal", start: 459, names: ["Engenharia Florestal"] },
  { title: "Engenharia Industrial Madeireira", start: 473, names: ["Engenharia Industrial Madeireira", "Engenharia Industrial-Madeira"] },
  { title: "Engenharia Mecânica", start: 490, names: ["Engenharia Mecânica"] },
  { title: "Estatística", start: 504, names: ["Estatística"] },
  { title: "Farmácia", start: 515, names: ["Farmácia", "Farmácia-Bioquímica"] },
  { title: "Física", start: 531, names: ["Física"] },
  { title: "Fonoaudiologia", start: 541, names: ["Fonoaudiologia"] },
  { title: "Geografia", start: 555, names: ["Geografia"] },
  { title: "Geologia", start: 568, names: ["Geologia"] },
  { title: "História", start: 582, names: ["História"] },
  { title: "Letras", start: 594, names: ["Letras"] },
  { title: "Letras - Tradução", start: 612, names: ["Letras - Tradução", "Letras-Tradução", "Tradução"] },
  { title: "Matemática", start: 628, names: ["Matemática"] },
  { title: "Medicina", start: 640, names: ["Medicina"] },
  { title: "Medicina Veterinária", start: 657, names: ["Medicina Veterinária"] },
  { title: "Música", start: 676, names: ["Música"] },
  { title: "Nutrição", start: 689, names: ["Nutrição"] },
  { title: "Odontologia", start: 704, names: ["Odontologia"] },
  { title: "Pedagogia", start: 721, names: ["Pedagogia"] },
  { title: "Química", start: 739, names: ["Química"] },
  { title: "Relações Internacionais", start: 758, names: ["Relações Internacionais"] },
  { title: "Relações Públicas", start: 776, names: ["Relações Públicas"] },
  { title: "Serviço Social", start: 794, names: ["Serviço Social"] },
  { title: "Sistemas de Informação", start: 810, names: ["Sistemas de Informação"] },
  { title: "Terapia Ocupacional", start: 828, names: ["Terapia Ocupacional"] },
  { title: "Turismo", start: 847, names: ["Turismo"] },
  { title: "Zootecnia", start: 864, names: ["Zootecnia"] },
  { title: "Trajetórias internacionais", start: 880, names: ["trajetórias internacionais", "exterior", "outros países", "fora do Brasil"] },
  { title: "Empreendedorismo", start: 909, names: ["empreendedorismo", "empreendedores", "negócio próprio", "empresas criadas"] },
  { title: "Retrato compósito da geração", start: 926, names: ["retrato compósito", "síntese geral", "panorama geral"] },
].map((chapter, index, chapters) => ({ ...chapter, end: chapter.end || (chapters[index + 1]?.start || 941) - 1 }));

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

function trajectoryPagesFor(start: number, end: number, focusText: string, limit = 8) {
  const focus = normalizeText(focusText);
  const terms = [...new Set(focus.match(/[a-z]{4,}/g) || [])].filter((term) =>
    !["como", "qual", "quais", "sobre", "curso", "cursos", "unesp", "estudo", "livro", "dados", "mostra", "mostram", "egresso", "egressos", "trajetoria", "trajetorias", "profissional", "profissionais"].includes(term)
  );
  const wantsPay = /(salari|remuner|renda|ganh)/.test(focus);
  const wantsWork = /(empreg|mercado|trabalh|cargo|atuacao|area de formacao)/.test(focus);
  const wantsStudy = /(pos gradu|mestrad|doutorad|especializa|continu.{0,12}estud)/.test(focus);
  const wantsActivities = /(extracurricular|iniciacao cientifica|extensao|monitoria|intercambio|empresa junior)/.test(focus);
  const pages = trajectoryPages.filter(({ page }) => page >= start && page <= end);
  const ranked = pages.map((item) => {
    let score = terms.reduce((total, term) => total + (item.normalized.match(new RegExp(term, "g")) || []).length, 0);
    if (wantsPay && item.normalized.includes("remuneracao dos entrevistados")) score += 30;
    if (wantsPay && /(remuneracao media|salario medio|salario mediano)/.test(item.normalized)) score += 12;
    if (wantsWork && /(situacao profissional atual|ingresso no mercado de trabalho|cargos que ocupam)/.test(item.normalized)) score += 24;
    if (wantsStudy && /(mestrado|doutorado|pos graduacao)/.test(item.normalized)) score += 18;
    if (wantsActivities && item.normalized.includes("atividades extracurriculares")) score += 24;
    if (!wantsPay && !wantsWork && !wantsStudy && !wantsActivities && /(os egressos entrevistados|situacao profissional atual|remuneracao dos entrevistados|consideracoes finais)/.test(item.normalized)) score += 8;
    if (item.page === start) score += 20;
    return { ...item, score };
  });
  return ranked
    .sort((a, b) => b.score - a.score || a.page - b.page)
    .slice(0, limit)
    .sort((a, b) => a.page - b.page)
    .map(({ text }) => text)
    .join("\n\n");
}

function salaryEvidenceFor(start: number, end: number) {
  const pages = trajectoryPages.filter(({ page }) => page >= start && page <= end);
  const interviewPage = pages.find(({ normalized }) => /foram entrevistad[oa]s?/.test(normalized));
  const salaryPages = pages.filter(({ normalized }) =>
    /remuneracao dos entrevistados|remuneracao media mensal|remuneracao media encontrada|remuneracao media identificada/.test(normalized)
  );
  return [...new Map([interviewPage, ...salaryPages].filter(Boolean).map((item) => [item!.page, item!])).values()]
    .slice(0, 4)
    .map(({ text }) => text)
    .join("\n\n");
}

function trajectoryContextFor(currentQuestion: string, conversationText: string) {
  const current = normalizeText(currentQuestion);
  const conversation = normalizeText(conversationText);
  const topic = /(egress|trajetor|empreg|mercado de trabalho|salari|remuner|pos gradu|mestrad|doutorad|lideranca|empreend|fora do brasil|exterior|outros paises|onde trabalh|area de formacao|alunos a profissionais)/;
  if (!topic.test(current) && !topic.test(conversation)) return "";

  const chaptersMatching = (text: string) => trajectoryChapterStarts.filter(({ names }) => names.some((name) => mentionsPhrase(text, name)));
  const currentMatches = chaptersMatching(current);
  const conversationMatches = chaptersMatching(conversation);
  const isComparison = /(compar|versus|\bvs\b|diferen)/.test(current);
  const rawMatches = isComparison
    ? [...new Map([...currentMatches, ...conversationMatches].map((chapter) => [chapter.title, chapter])).values()]
    : currentMatches.length ? currentMatches : conversationMatches;
  const matched = rawMatches.filter((chapter) => !rawMatches.some((other) => other !== chapter && normalizeText(other.title).includes(normalizeText(chapter.title))));
  const focusText = currentQuestion + "\n" + conversationText.slice(-2000);
  const wantsPay = /(salari|remuner|renda|ganh)/.test(current);

  if (matched.length) {
    if (wantsPay) {
      const salaryEvidence = matched.slice(0, 3).map((chapter) => {
        const evidence = salaryEvidenceFor(chapter.start, chapter.end);
        return evidence ? "## Evidências prioritárias de remuneração: " + chapter.title + "\n\n" + evidence : "";
      }).filter(Boolean);
      if (salaryEvidence.length) return [trajectoriesGuide, ...salaryEvidence].join("\n\n");
    }
    const excerpts = matched.slice(0, 2).map((chapter) =>
      "## Trechos selecionados: " + chapter.title + "\n\n" + trajectoryPagesFor(chapter.start, chapter.end, focusText, matched.length > 1 ? 5 : 9)
    );
    return [trajectoriesGuide, ...excerpts].join("\n\n");
  }

  const summary = trajectoryChapterStarts.find(({ title }) => title === "Retrato compósito da geração");
  return summary
    ? trajectoriesGuide + "\n\n## Trechos selecionados: síntese geral\n\n" + trajectoryPagesFor(summary.start, summary.end, focusText, 9)
    : trajectoriesGuide;
}

function normalizeCutoffCourse(value: string) {
  return normalizeText(value).replace(/\bciencias da computacao\b/g, "ciencia da computacao").replace(/\s+/g, " ").trim();
}

function cutoffCourseOf(course: string) {
  return course.split(" - ")[0].trim();
}

const canonicalCutoffCourses = [...new Set(cutoffData.records.map(({ course }) => normalizeCutoffCourse(cutoffCourseOf(course))))];

function cutoffContextFor(currentQuestion: string, conversationText: string) {
  const current = normalizeText(currentQuestion);
  const conversation = normalizeText(conversationText);
  const cutoffTopic = /(nota.{0,20}corte|corte|acerto|quant.{0,20}acert|convoc.{0,30}segunda fase)/;
  if (!cutoffTopic.test(current) && !cutoffTopic.test(conversation)) return "";
  const currentCutoff = normalizeCutoffCourse(currentQuestion);
  const conversationCutoff = normalizeCutoffCourse(conversationText);
  const currentCourses = canonicalCutoffCourses.filter((course) => currentCutoff.includes(course));
  const conversationCourses = canonicalCutoffCourses.filter((course) => conversationCutoff.includes(course));
  const rawCourses = currentCourses.length ? currentCourses : conversationCourses;
  const matchedCourses = rawCourses.filter((course) => !rawCourses.some((other) => other !== course && other.includes(course)));
  const currentCities = cityNames.filter((city) => mentionsPhrase(current, city));
  const conversationCities = cityNames.filter((city) => mentionsPhrase(normalizeText(conversationText), city));
  const matchedCities = currentCities.length ? currentCities : conversationCities;
  let requestedYears = [...new Set((currentQuestion.match(/20(?:23|24|25|26)/g) || []).map(Number))];
  if (requestedYears.length === 2 && (current.includes("entre ") || /de 20(?:23|24|25|26) (?:a|ate) 20(?:23|24|25|26)/.test(current))) {
    const first = Math.min(...requestedYears);
    const last = Math.max(...requestedYears);
    requestedYears = cutoffData.editions.filter((year) => year >= first && year <= last);
  }
  const years = requestedYears.length ? requestedYears : cutoffData.editions;
  const isRanking = /(maior|menor|mais alta|mais baixa|ranking).{0,30}(nota|corte|acerto)|(nota|corte|acerto).{0,30}(maior|menor|mais alta|mais baixa|ranking)/.test(current);
  const relevantTerms = [...new Set(current.match(/[a-z]{4,}/g) || [])].filter((term) =>
    !["nota", "notas", "corte", "cortes", "acerto", "acertos", "curso", "cursos", "unesp", "vestibular", "edicao", "edicoes", "anterior", "anteriores", "historico", "historica", "historicas", "segunda", "fase", "convocacao", "sistema", "universal", "srvbp", "srvebp", "compare", "comparar", "evolucao"].includes(term)
  );
  let rows: CutoffRecord[] = cutoffData.records.filter(({ edition }) => years.includes(edition));
  if (matchedCourses.length) {
    const courses = new Set(matchedCourses);
    rows = rows.filter(({ course }) => courses.has(normalizeCutoffCourse(cutoffCourseOf(course))));
  } else if (relevantTerms.length && !matchedCities.length && !isRanking) {
    const scored = rows.map((row) => ({ row, score: relevantTerms.reduce((total, term) => total + (normalizeText(row.course).includes(term) ? 1 : 0), 0) }));
    const best = Math.max(0, ...scored.map(({ score }) => score));
    if (best > 0) rows = scored.filter(({ score }) => score === best).map(({ row }) => row);
  }
  if (matchedCities.length) {
    rows = rows.filter(({ city: rowCity }) => matchedCities.some((city) => {
      const normalizedCity = normalizeText(rowCity);
      return normalizedCity === normalizeText(city) || (city === "São Vicente" && normalizedCity === "litoral paulista");
    }));
  }
  if (isRanking) {
    rows = years.flatMap((edition) => {
      const editionRows = rows.filter((row) => row.edition === edition);
      const metric: "srv_ebp_ppi" | "su" = /(srv|reserva|publica|ppi)/.test(current) ? "srv_ebp_ppi" : "su";
      const direction = /(menos|menor)/.test(current) ? 1 : -1;
      return editionRows.sort((a, b) => direction * ((a[metric] ?? -1) - (b[metric] ?? -1))).slice(0, 12);
    });
  } else if (!matchedCourses.length && !matchedCities.length) {
    const notice = /2027/.test(current) ? "\n\n**A nota de corte de 2027 ainda não está disponível:** ela só será conhecida depois da primeira fase e da publicação oficial da Vunesp." : "";
    return cutoffGuide + notice + "\n\nInforme o curso e, se possível, a cidade para consultar as linhas correspondentes.";
  } else if (rows.length > 100) {
    rows = rows.sort((a, b) => b.su - a.su).slice(0, 100);
  }
  if (!rows.length) return cutoffGuide + "\n\nNenhuma linha específica correspondeu aos filtros da pergunta.";
  rows.sort((a, b) => a.edition - b.edition || a.course.localeCompare(b.course, "pt-BR") || a.city.localeCompare(b.city, "pt-BR"));
  const table = [
    "| Edição | Código | Curso/opção | Cidade | SRVEBP e SRVEBP+PPI | SU |",
    "|---:|---:|---|---|---:|---:|",
    ...rows.map((row) => "| " + row.edition + " | " + row.code + " | " + row.course.replace(/\|/g, "\\|") + " | " + (row.city || "Treineiro") + " | " + row.srv_ebp_ppi + " | " + row.su + " |")
  ].join("\n");
  const currentYearNotice = /2027/.test(current) ? "\n\n**A nota de corte de 2027 ainda não está disponível.** Os números abaixo são históricos e não são uma previsão." : "";
  return cutoffGuide + currentYearNotice + "\n\n## Linhas selecionadas para a pergunta\n\n" + table;
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
    const trajectoryContext = trajectoryContextFor(currentQuestion, conversationText);
    const cutoffContext = cutoffContextFor(currentQuestion, conversationText);
    const broadCareer = Boolean(careerContext) && /(todas|todos|quais|lista|comparar varias)/.test(normalizeText(currentQuestion));
    const broadCutoff = Boolean(cutoffContext) && /(quais|ranking|maior|menor|todos|todas)/.test(normalizeText(currentQuestion));
    const broadTrajectory = Boolean(trajectoryContext) && /(geral|panorama|sintese|compar|todos|todas)/.test(normalizeText(currentQuestion));
    const maxOutputTokens = addressContext === campusAddresses || broadCareer || broadTrajectory ? 2800 : broadCutoff ? 2400 : trajectoryContext ? 2200 : careerContext || cutoffContext ? 1800 : 1400;
    const fullInstructions = [
      instructions,
      "GUIA RESUMIDO OFICIAL:\n" + knowledge,
      "PÁGINAS RELEVANTES DO MANUAL INTEGRAL:\n" + pagesFor(currentQuestion),
      "GUIA RELEVANTE DAS CIDADES-SEDE:\n" + (cityContext || "Nenhum contexto municipal foi necessário para esta pergunta."),
      "ENDEREÇOS RELEVANTES DAS UNIDADES:\n" + (addressContext || "Nenhum endereço foi necessário para esta pergunta."),
      "GUIA RELEVANTE DE PROFISSÕES E MERCADO:\n" + (careerContext || "Nenhum contexto de carreira foi necessário para esta pergunta."),
      "ESTUDO RELEVANTE SOBRE TRAJETÓRIAS DE EGRESSOS:\n" + (trajectoryContext || "Nenhum trecho do estudo de egressos foi necessário para esta pergunta."),
      "DADOS HISTÓRICOS DE NOTAS DE CORTE:\n" + (cutoffContext || "Nenhuma nota de corte histórica foi necessária para esta pergunta."),
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

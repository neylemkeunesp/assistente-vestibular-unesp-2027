import Assistant from "./Assistant";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Início">
          <span className="brand-mark">UNESP</span>
          <span className="brand-divider" aria-hidden="true" />
          <span>Vestibular 2027</span>
        </a>
        <span className="source-pill">Baseado em fontes oficiais</span>
      </header>

      <section className="hero" id="inicio">
        <p className="eyebrow">Assistente para estudantes</p>
        <h1>Seu caminho até a Unesp começa com uma boa pergunta.</h1>
        <p className="hero-copy">
          Cursos, inscrições, cidades e carreiras — explicados de forma simples
          para você tomar decisões com mais segurança.
        </p>
      </section>

      <section className="workspace" aria-label="Assistente do vestibular">
        <Assistant />

        <aside className="coverage" aria-label="Conteúdo disponível">
          <p className="coverage-label">O que você encontra aqui</p>
          <div className="stat"><strong>137</strong><span>cursos no Vestibular 2027</span></div>
          <div className="stat"><strong>24</strong><span>cidades-sede</span></div>
          <p className="coverage-note">
            Manual do Candidato, Vunesp, Unesp, IBGE e fontes municipais.
          </p>
        </aside>
      </section>

      <footer>
        Este assistente orienta, mas não substitui os editais e comunicados da Vunesp.
      </footer>
    </main>
  );
}

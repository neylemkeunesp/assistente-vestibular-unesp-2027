import Assistant from "./Assistant";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#inicio" aria-label="Assistente Vestibular Unesp 2027 — início">
            <span className="brand-mark">UNESP</span>
            <span className="brand-divider" aria-hidden="true" />
            <span>Vestibular 2027</span>
          </a>
          <span className="source-pill"><span aria-hidden="true" />Fontes identificadas</span>
        </div>
      </header>

      <div className="page-frame">
        <section className="hero" id="inicio">
          <div className="hero-content">
            <p className="eyebrow"><span aria-hidden="true">●</span> Assistente para estudantes</p>
            <h1>Planeje seu caminho para a Unesp com informação clara.</h1>
            <p className="hero-copy">
              Tire dúvidas sobre cursos, inscrições, cidades, carreiras, notas de corte e trajetórias profissionais em
              uma conversa simples e baseada em fontes.
            </p>
          </div>

          <aside className="hero-guide" aria-labelledby="hero-guide-title">
            <p className="hero-guide-label">Explore a universidade</p>
            <h2 id="hero-guide-title">Da escolha do curso à vida no câmpus.</h2>
            <ul>
              <li><span aria-hidden="true">01</span>Cursos, vagas e períodos</li>
              <li><span aria-hidden="true">02</span>Cidades e permanência</li>
              <li><span aria-hidden="true">03</span>Carreiras e trajetórias</li>
            </ul>
          </aside>
        </section>

        <section className="workspace" aria-label="Assistente do vestibular">
          <Assistant />

          <aside className="coverage" aria-labelledby="coverage-title">
            <div className="coverage-heading">
              <span className="coverage-icon" aria-hidden="true">✓</span>
              <div>
                <p className="coverage-label">Base organizada</p>
                <h2 id="coverage-title">Conteúdo para orientar sua pesquisa</h2>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat"><strong>137</strong><span>cursos em 2027</span></div>
              <div className="stat"><strong>24</strong><span>cidades-sede</span></div>
              <div className="stat"><strong>4</strong><span>edições de cortes</span></div>
              <div className="stat"><strong>941</strong><span>páginas de trajetórias</span></div>
            </div>
            <div className="coverage-sources">
              <p>Fontes principais</p>
              <span>Manual do Candidato · Vunesp · Unesp · IBGE</span>
              <a href="https://www.vunesp.com.br/" target="_blank" rel="noreferrer">Consultar a Vunesp <span aria-hidden="true">↗</span></a>
            </div>
          </aside>
        </section>

        <footer>
          <p>Este assistente orienta, mas não substitui os editais e comunicados oficiais.</p>
          <nav aria-label="Links institucionais">
            <a href="https://www.vunesp.com.br/" target="_blank" rel="noreferrer">Vunesp</a>
            <a href="https://www2.unesp.br/" target="_blank" rel="noreferrer">Unesp</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

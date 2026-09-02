# Assistente Vestibular Unesp 2027

Aplicação web de IA para responder, em português brasileiro acessível, perguntas de estudantes do Ensino Médio e suas famílias sobre o Vestibular Unesp 2027.

**Aplicação pública:** [assistente-vestibular-unesp-2027.neylemke.chatgpt.site](https://assistente-vestibular-unesp-2027.neylemke.chatgpt.site/)

## O que o assistente responde

- cursos, unidades, modalidades, períodos e vagas;
- inscrições, provas, reserva de vagas e matrícula;
- cidades-sede, endereços e permanência estudantil;
- profissões e possibilidades de atuação;
- procura por cursos e notas de corte históricas;
- trajetórias acadêmicas e profissionais de pessoas egressas.

As respostas usam Markdown, incluindo tabelas, listas e links interpretados pela interface.

## Início rápido no Windows

### Requisitos

- [Node.js](https://nodejs.org/) 22.13 ou mais recente;
- `pnpm`, disponível por meio do Corepack;
- uma chave da API da OpenAI.

### Instalação

No PowerShell:

```powershell
git clone https://github.com/neylemkeunesp/assistente-vestibular-unesp-2027.git
Set-Location assistente-vestibular-unesp-2027
corepack enable
pnpm install
Copy-Item .env.example .env.local
```

Edite `.env.local` e substitua o valor de exemplo:

```dotenv
OPENAI_API_KEY=sk-sua-chave-aqui
```

Inicie o servidor:

```powershell
$env:PORT=4173
pnpm dev
```

Abra [http://localhost:4173](http://localhost:4173). Para encerrar, pressione `Ctrl+C` no terminal.

> A chave é usada somente pela rota do servidor. Não coloque a chave em componentes React, arquivos públicos ou variáveis com prefixo de cliente.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `pnpm dev` | Inicia o ambiente de desenvolvimento. |
| `pnpm build` | Gera a versão de produção. |
| `pnpm start` | Executa a versão compilada. |
| `pnpm lint` | Executa a análise estática do código. |

Para testar a versão de produção localmente:

```powershell
pnpm build
$env:PORT=4173
pnpm start
```

## API

O frontend envia o histórico recente para `POST /api/chat`:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Quais cursos são oferecidos em Botucatu?"
    }
  ]
}
```

Resposta simplificada:

```json
{
  "answer": "Resposta em Markdown...",
  "dataVersion": "identificador-da-base"
}
```

Erros de validação e de configuração são devolvidos em JSON. Sem `OPENAI_API_KEY`, a rota responde com status HTTP 503.

## Estrutura

```text
app/
├── api/chat/route.ts       # seleção de contexto e chamada à API da OpenAI
├── data/                   # bases documentais e guias estruturados
├── Assistant.tsx           # interface e renderização das respostas
├── layout.tsx              # metadados da aplicação
└── page.tsx                # página principal
public/                     # favicon e imagem social
.openai/hosting.json        # vínculo com o projeto do OpenAI Sites
```

As bases são carregadas no servidor. A rota seleciona trechos relevantes do Manual do Candidato e dos guias temáticos antes de chamar a Responses API, evitando enviar toda a coleção em cada pergunta.

## Fontes e limites

As fontes principais são o Manual do Candidato do Vestibular Unesp 2027, tabelas históricas da Vunesp e materiais da Unesp sobre cursos, profissões e trajetórias de egressos. Informações temporais devem ser confirmadas nos canais oficiais da [Vunesp](https://www.vunesp.com.br/) e da [Unesp](https://www2.unesp.br/).

O estudo de egressos descreve principalmente pessoas que ingressaram entre 2003 e 2005. Seus resultados não são previsão de salário, emprego ou trajetória para quem ingressar em 2027. Dados de custo de vida são contextuais e não representam preços garantidos.

Este projeto é uma ferramenta de orientação. Ele não substitui edital, manual, retificação, convocação ou atendimento oficial.

## Segurança e privacidade

- não registre chaves da API no Git;
- não solicite CPF, RG, senha, laudo ou documentos pessoais no chat;
- revise atualizações documentais antes de publicar uma nova versão;
- trate conteúdo gerado pelo modelo como resposta assistida, não como decisão administrativa.

## Publicação no OpenAI Sites

O projeto contém `.openai/hosting.json` e usa o fluxo de build do `vinext`. Na hospedagem, configure `OPENAI_API_KEY` como segredo do ambiente do servidor. O arquivo `.env.local` é apenas para execução local e está ignorado pelo Git.

Antes de publicar uma nova versão, execute:

```powershell
pnpm lint
pnpm build
```

Depois da implantação, valide a página inicial e uma conversa real com `POST /api/chat`.

## Contribuição

1. Crie uma branch a partir de `main`.
2. Faça alterações pequenas e rastreáveis.
3. Atualize as fontes e referências de páginas quando modificar a base.
4. Execute `pnpm lint` e `pnpm build`.
5. Abra um pull request explicando o que mudou e como foi validado.


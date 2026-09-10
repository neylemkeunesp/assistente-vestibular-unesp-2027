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

Além da base local, o backend consulta a LegIA para recuperar documentos institucionais relacionados à pergunta. Para regras do Vestibular 2027, o Manual do Candidato e a Vunesp permanecem como fontes primárias.

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
LEGIA_MCP_URL=http://200.145.2.100:3000/sse
LEGIA_API_KEY=sua-chave-da-legia
```

Inicie o servidor:

```powershell
$env:PORT=4173
pnpm dev
```

Abra [http://localhost:4173](http://localhost:4173). Para encerrar, pressione `Ctrl+C` no terminal.

> A chave é usada somente pela rota do servidor. Não coloque a chave em componentes React, arquivos públicos ou variáveis com prefixo de cliente.

## Execução no Linux

As instruções abaixo servem para Ubuntu, Debian e distribuições semelhantes. Em outras distribuições, adapte apenas a instalação dos pacotes do sistema.

### Desenvolvimento ou teste

Confirme primeiro os requisitos:

```bash
node --version
corepack --version
git --version
```

O Node.js deve estar na versão 22.13 ou mais recente. Depois:

```bash
git clone https://github.com/neylemkeunesp/assistente-vestibular-unesp-2027.git
cd assistente-vestibular-unesp-2027
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
chmod 600 .env.local
```

Edite `.env.local` e configure `OPENAI_API_KEY`, `LEGIA_MCP_URL` e `LEGIA_API_KEY`. Para aceitar conexões de outras máquinas da mesma rede:

```bash
pnpm dev -- --hostname 0.0.0.0 --port 4173
```

Se o acesso for apenas na própria máquina, substitua `0.0.0.0` por `127.0.0.1`. Não exponha a porta diretamente à internet sem firewall e proxy HTTPS.

### Produção

Instale e compile:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
pnpm start -- --hostname 127.0.0.1 --port 4173
```

O endereço `127.0.0.1` mantém a aplicação acessível somente na máquina Linux. Um proxy reverso, como Nginx, deve receber as conexões externas e encaminhá-las para essa porta.

### Serviço persistente com systemd

Uma organização possível é:

- código em `/opt/assistente-vestibular-unesp-2027`;
- usuário de serviço `assistente-unesp`;
- chave em `/etc/assistente-unesp.env`;
- aplicação local em `127.0.0.1:4173`.

Em uma instalação nova, crie o usuário e prepare o diretório:

```bash
sudo useradd --system --home-dir /opt/assistente-vestibular-unesp-2027 --shell /usr/sbin/nologin assistente-unesp
sudo install -d -o assistente-unesp -g assistente-unesp /opt/assistente-vestibular-unesp-2027
sudo -u assistente-unesp git clone https://github.com/neylemkeunesp/assistente-vestibular-unesp-2027.git /opt/assistente-vestibular-unesp-2027
cd /opt/assistente-vestibular-unesp-2027
sudo -u assistente-unesp pnpm install --frozen-lockfile
sudo -u assistente-unesp pnpm build
```

Crie o arquivo de ambiente fora do repositório:

```bash
sudo install -m 600 /dev/null /etc/assistente-unesp.env
sudo editor /etc/assistente-unesp.env
```

Conteúdo:

```dotenv
OPENAI_API_KEY=sk-sua-chave-aqui
LEGIA_MCP_URL=http://200.145.2.100:3000/sse
LEGIA_API_KEY=sua-chave-da-legia
NODE_ENV=production
```

Copie [`deploy/assistente-unesp.service.example`](deploy/assistente-unesp.service.example) para `/etc/systemd/system/assistente-unesp.service`. Antes, confira os caminhos reais de `node` e `pnpm` com `command -v node` e `command -v pnpm` e ajuste `ExecStart` se necessário.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now assistente-unesp
sudo systemctl status assistente-unesp
```

Para acompanhar os registros:

```bash
sudo journalctl -u assistente-unesp -f
```

### Proxy reverso com Nginx

Use [`deploy/nginx.conf.example`](deploy/nginx.conf.example) como ponto de partida. Ajuste `server_name`, habilite o arquivo e valide a configuração:

```bash
sudo ln -s /etc/nginx/sites-available/assistente-unesp /etc/nginx/sites-enabled/assistente-unesp
sudo nginx -t
sudo systemctl reload nginx
```

Em produção, configure um certificado TLS válido e libere no firewall somente as portas necessárias, normalmente 80 e 443. A porta 4173 deve permanecer restrita ao host.

### Verificação e atualização

Teste o processo local e o endereço público:

```bash
curl --fail --head http://127.0.0.1:4173/
curl --fail --head https://seu-dominio.example/
```

Para atualizar a aplicação:

```bash
cd /opt/assistente-vestibular-unesp-2027
git pull --ff-only
pnpm install --frozen-lockfile
pnpm lint
pnpm build
sudo systemctl restart assistente-unesp
sudo systemctl status assistente-unesp
```

Faça backup da configuração e anote o commit anterior antes da atualização. Se a nova versão falhar, retorne ao commit conhecido, refaça o build e reinicie o serviço.

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
├── api/chat/legia.ts       # cliente MCP SSE da LegIA e seleção de documentos
├── data/                   # bases documentais e guias estruturados
├── Assistant.tsx           # interface e renderização das respostas
├── layout.tsx              # metadados da aplicação
└── page.tsx                # página principal
public/                     # favicon e imagem social
.openai/hosting.json        # vínculo com o projeto do OpenAI Sites
```

As bases são carregadas no servidor. A rota seleciona trechos relevantes do Manual do Candidato e dos guias temáticos e consulta a LegIA antes de chamar a Responses API. A ferramenta `buscar_documentos` atende pesquisas documentais; perguntas sobre docentes, departamentos, coordenação e horários acionam `perguntar_legia` com pesquisa em sites oficiais da Unesp. O token da LegIA é acrescentado pelo backend e não é enviado ao navegador nem gravado no repositório. Se a LegIA falhar ou exceder o tempo limite, a resposta continua com as demais fontes.

## Fontes e limites

As fontes principais são o Manual do Candidato do Vestibular Unesp 2027, tabelas históricas da Vunesp e materiais da Unesp sobre cursos, profissões e trajetórias de egressos. Informações temporais devem ser confirmadas nos canais oficiais da [Vunesp](https://www.vunesp.com.br/) e da [Unesp](https://www2.unesp.br/).

O estudo de egressos descreve principalmente pessoas que ingressaram entre 2003 e 2005. Seus resultados não são previsão de salário, emprego ou trajetória para quem ingressar em 2027. Dados de custo de vida são contextuais e não representam preços garantidos.

Este projeto é uma ferramenta de orientação. Ele não substitui edital, manual, retificação, convocação ou atendimento oficial.

## Segurança e privacidade

- não registre chaves da API no Git;
- mantenha `LEGIA_API_KEY` somente no backend;
- não solicite CPF, RG, senha, laudo ou documentos pessoais no chat;
- revise atualizações documentais antes de publicar uma nova versão;
- trate conteúdo gerado pelo modelo como resposta assistida, não como decisão administrativa.

## Publicação no OpenAI Sites

O projeto contém `.openai/hosting.json` e usa o fluxo de build do `vinext`. Na hospedagem, configure `OPENAI_API_KEY` e `LEGIA_API_KEY` como segredos do ambiente do servidor, além de `LEGIA_MCP_URL`. O arquivo `.env.local` é apenas para execução local e está ignorado pelo Git.

> O endpoint atual da LegIA usa HTTP sem TLS. O tráfego entre o servidor da aplicação e a LegIA não é criptografado; prefira um endpoint HTTPS quando ele estiver disponível.

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

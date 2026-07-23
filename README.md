# SpecHub

**Memória compartilhada para agentes de IA e times de desenvolvimento.**

Em vez de copiar documentação para prompts ou depender de Confluence, Jira e READMEs espalhados, os agentes recuperam apenas o contexto necessário, atualizam especificações durante a implementação e compartilham conhecimento entre múltiplos repositórios — tudo direto do IDE, sem sair do fluxo.

O SpecHub armazena todos os artefatos do ciclo de vida de uma feature: **PRD → Spec Técnica → Design → Tarefas**. O PRD é o ponto de partida; a partir dele, skills como `grill-me`, `grill-with-docs` ou `cy-create-techspec` geram a spec técnica e o design, que também são persistidos. As tarefas nascem da spec e são rastreadas por repositório até a conclusão.

```mermaid
flowchart LR
    subgraph Agentes
        Cursor
        Claude
        Codex
        Windsurf
    end
    Agentes <-->|MCP| SpecHub[(SpecHub)]
    SpecHub --> PG[(PostgreSQL + pgvector)]
    SpecHub --> Emb[paraphrase-multilingual-MiniLM-L12-v2]
```

> Todos os agentes compartilham a mesma memória. Quando um agente termina, o próximo continua exatamente de onde o anterior parou.

---

## Por que existe?

- **Contexto não cabe no prompt** — jogar uma spec inteira no prompt consome tokens e degrada a qualidade das respostas. O SpecHub entrega só o trecho relevante.
- **Documentação espalhada** — specs vivem em Confluence, Jira, Google Docs e READMEs de repositórios diferentes. Ninguém sabe onde está a versão canônica.
- **Cross-repo é doloroso** — uma feature toca 3+ repositórios. Cada repo tem seu próprio backlog de tarefas, sem visão unificada do que falta fazer.
- **Documentação morre após o planejamento** — specs são escritas no início e nunca mais atualizadas. O SpecHub foi desenhado para que a documentação evolua junto com o código, durante semanas de implementação.

---

## Como funciona na prática

O SpecHub armazena todos os artefatos do ciclo de vida de uma feature — do PRD inicial até a doc atualizada durante a implementação. O fluxo típico:

```
Nova feature (ex: "Adicionar pagamento PIX")
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Salvar PRD                           │  save_spec
│    Documento de requisitos do produto.   │
│    É o ponto de partida.                │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. Gerar Spec Técnica e Design          │  grill-me / grill-with-docs
│    A partir do PRD, usando AI-assisted   │  tdd / cy-create-techspec
│    skills para refinar e produzir:       │
│    • Documento de especificação técnica   │  save_spec
│    • Documento de design/arquitetura     │  save_spec
│    Cada artefato é salvo no SpecHub.     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. Gerar tarefas por repo               │  update_task_status
│    A partir da spec, decompor em tarefas │
│    rastreáveis:                          │
│    api: criar endpoint cobrança          │
│    worker: processar webhook            │
│    frontend: tela de pagamento          │
│    terraform: novas env vars            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 4. Agente busca contexto relevante      │  search_spec_context
│    "Como funciona o webhook?"           │  → só a seção sobre webhook
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 5. Implementa e atualiza progresso      │  update_task_status
│    api: cobrança PIX → done             │
│    worker: webhook → in_progress        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 6. Atualiza documentação                │  update_spec_chunk
│    "Durante implementação, o PSP        │
│     exige header X-IDEMPOTENCY..."      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 7. Próximo agente continua              │  get_repo_tasks
│    "Quais tarefas faltam?"              │  → worker: webhook (in_progress)
│    "O que mudou desde o planning?"      │  → frontend, terraform (pending)
└─────────────────────────────────────────┘
```

O SpecHub centraliza PRD, spec técnica, design e tarefas — tudo versionado, buscável e conectado. O conhecimento acumulado por um agente fica imediatamente disponível para os próximos.

---

## O que torna o SpecHub diferente

- **Não é só busca vetorial** — é edição contínua. A documentação não é estática; ela evolui durante a implementação.
- **Entende features como unidade de trabalho** — cada spec agrupa tarefas distribuídas por repositório, com rastreamento de progresso.
- **Mantém histórico de alterações** — toda mudança na spec ou nas tarefas gera entrada no changelog. Dá pra saber quem alterou o quê e quando.
- **Memória compartilhada entre agentes** — Cursor, Claude Code, Windsurf e outros leem e escrevem no mesmo lugar.
- **Busca híbrida** — combina similaridade vetorial com full-text search, com boost por repositório. Retorna as 3 seções mais relevantes, não o documento inteiro.
- **Embeddings locais** — `paraphrase-multilingual-MiniLM-L12-v2` roda 100% local via `@xenova/transformers`. Sem chamadas de API externa, sem custo de token para gerar embeddings.

---

## Ferramentas

### Criar conhecimento

| Ferramenta | O que faz |
|---|---|
| `save_spec` | Persiste uma spec com embedding vetorial. UPSERT por `source_type` + `source_key`. |

### Recuperar contexto

| Ferramenta | O que faz |
|---|---|
| `list_card_documents` | Lista todos os documentos de um card (PRD, spec, design, etc.) a partir do `source_key`. Use para descobrir o que já existe antes de buscar. |
| `search_spec_context` | Busca semântica dentro de uma spec. Top-3 seções mais relevantes para a query. Retorna snippets truncados em ~300 chars para eficiência de tokens. |
| `get_feature_overview` | Retorna metadados + estrutura de headings da spec. Ideal para o agente se localizar antes de buscar. |
| `get_section` | Retorna o conteúdo completo de uma seção por heading (sem truncamento). Use quando o snippet do `search_spec_context` for cortado e você precisar da seção inteira. |

### Acompanhar implementação

| Ferramenta | O que faz |
|---|---|
| `get_repo_tasks` | Lista tarefas ativas vinculadas à spec, agrupadas por repositório. Use o `spec_id` do documento spec (não do tasks). |
| `update_task_status` | Atualiza status (`pending` → `in_progress` → `done`) ou cria nova tarefa vinculada à spec. |

### Manter documentação viva

| Ferramenta | O que faz |
|---|---|
| `update_spec_chunk` | Edita uma seção específica da spec por heading. Re-indexa o embedding automaticamente. |

Toda operação de escrita registra entrada no changelog.

---

## Casos de uso

- **Desenvolvimento cross-repo** — PRD → Spec Técnica → Design → Tarefas. Feature tocando API, worker, frontend e infra, com tarefas rastreáveis por repositório.
- **PRDs e RFCs** — armazenamento centralizado com busca semântica. O agente encontra o trecho exato que precisa, sem ler 30 páginas. Use `grill-me` ou `cy-create-techspec` para refinar o PRD em spec técnica.
- **ADRs (Architecture Decision Records)** — documentação de decisões de arquitetura indexada e buscável.
- **Runbooks e playbooks** — procedimentos operacionais que evoluem com o tempo.
- **Migrações grandes** — documentação viva do que foi migrado, o que falta e decisões tomadas no caminho.
- **Onboarding** — novos engenheiros (ou agentes) consultam o SpecHub para entender o estado atual de qualquer feature.
- **Compartilhamento de contexto entre agentes** — múltiplos agentes trabalhando em sequência ou em paralelo, lendo e escrevendo na mesma base de conhecimento.

---

## Changelog

### 2026-07-22 — Google OAuth Authentication

Adicionada autenticação opcional via Google OAuth 2.0 com Authorization Code flow.

**O que mudou:**
- Servidor Express próprio substituiu o auto-server do Mastra, permitindo middlewares customizados
- `POST /register`, `GET /authorize`, `GET /callback`, `POST /token` — authorization server completo para fluxo OAuth com redirect no navegador
- `/.well-known/oauth-protected-resource` e `/.well-known/oauth-authorization-server` — descoberta automática de metadados OAuth
- `createOAuthMiddleware` do `@mastra/mcp` protegendo os endpoints MCP com validação de Google ID Token
- `GET /health` — health check para probes de container
- `context.mcp.extra.authInfo` — email e domínio do usuário autenticado disponível nas tools

**Como ativar:**
```bash
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_ALLOWED_DOMAINS=sua-empresa.com
```

Sem essas env vars, o comportamento é idêntico ao anterior (sem autenticação).

**Comandos:**
```bash
npm run dev    # Dev server com hot reload (Express)
npm run start  # Produção (Express + auth se configurado)
```

---

### 2026-07-23 — Google OAuth fixes

Correções no fluxo OAuth que impediam autenticação com contas pessoais do Google e clientes MCP.

**O que mudou:**
- Validação de domínio usando `payload.email` como fallback quando `payload.hd` está ausente — contas `@gmail.com` (sem hosted domain) agora são aceitas
- Implementado PKCE (Proof Key for Code Exchange) com S256 — `code_challenge` armazenado na sessão e `code_verifier` validado no token endpoint
- `authorizationServers` alterado para URL raiz, corrigindo descoberta de metadados OAuth (RFC 8414)
- `code_challenge_methods_supported: ['S256']` adicionado ao well-known do authorization server
- `express.urlencoded()` middleware adicionado — token endpoint agora parseia `application/x-www-form-urlencoded` (padrão RFC 6749)
- `grant_types_supported` inclui `refresh_token`

---

### 2026-07-23 — MCP Resources + Local validation harness

Workflows do SpecHub agora expostos como MCP Resources, eliminando dependência de skills `.cursor/` locais. Adicionado pipeline de validação local.

**O que mudou:**
- `spechub://workflows/save-artifacts` — skill de publicação de artefatos exposta como MCP Resource endereçável
- `src/mastra/workflows/` — novo módulo para expor workflows como resources URI-addressable
- `npm run lint` — pipeline completo: `typecheck → check:circular → eslint → test`
- `eslint` + `madge` — detecta `no-duplicate-imports` e dependências circulares automaticamente
- Circular import entre módulos de workflow removido

**Comandos:**
```bash
npm run lint         # typecheck + circular + eslint + test
npm run lint:eslint  # ESLint only
npm run check:circular # madge
```

---

### 2026-07-23 — get_section tool: full section content by heading

Nova ferramenta `get_section` que retorna o conteúdo Markdown completo de uma seção identificada por heading, sem truncamento. Resolve o problema onde `search_spec_context` cortava snippets de ~300 chars e o agente não conseguia ler seções inteiras.

**O que mudou:**
- `get_section(spec_id, section_heading)` — retorna `{ spec_id, section, content, status }` com conteúdo completo da seção (sem limite de caracteres)
- `status: 'found' | 'not_found'` — consistente com `update_spec_chunk`
- Atualizado `serverInstructions` em `mcp.ts` para orientar uso da nova tool quando snippets estiverem truncados
- README atualizado com a nova ferramenta na seção "Recuperar contexto"

**Motivação:** #4 — documentos curtos como open-questions tinham listas cortadas no meio, impedindo o agente de ler todas as perguntas.

---

## Começando

### Pré-requisitos

- Node.js 22+
- Docker
- npm

### 1. Subir o banco

```bash
docker compose up -d
```

PostgreSQL 17 + pgvector na porta `5434`.

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar ambiente

```bash
cp .env.example .env
```

O padrão funciona com o docker-compose:

```
DATABASE_URL=postgresql://spechub:spechub@localhost:5434/spechub
PORT=3456
```

### 4. Rodar

```bash
npm run dev
```

No primeiro start as migrações rodam automaticamente, o modelo de embeddings é baixado (~90 MB, cache local), e o servidor MCP sobe em `http://localhost:3456`.

### 5. Conectar no agente

Adicione ao config do seu cliente MCP (Cursor, Claude Code, Windsurf, etc.):

```json
{
  "mcpServers": {
    "spechub": {
      "url": "http://localhost:3456/api/mcp/spechub/mcp"
    }
  }
}
```

---

## Arquitetura

```
┌────────────────────────────────────────────────┐
│              Interface (Mastra/MCP)             │
│  src/mastra/  — HTTP SSE endpoint em :3456     │
├────────────────────────────────────────────────┤
│           Application (Use Cases)               │
│  src/application/use-cases/  — 7 casos de uso  │
├────────────────────────────────────────────────┤
│              Domain (Interfaces)                │
│  src/domain/  — entidades, repositórios,       │
│                 IEmbeddingService              │
├────────────────────────────────────────────────┤
│          Infrastructure (Adapters)              │
│  src/infrastructure/                            │
│  ├── database/    — Sequelize + Umzug + pgvector│
│  ├── repositories/ — implementações repositórios│
│  └── services/    — XenovaEmbeddingService      │
├────────────────────────────────────────────────┤
│             Container (Awilix DI)               │
│  src/container/  — buildContainer(), singletons│
└────────────────────────────────────────────────┘
```

Clean Architecture com injeção de dependência (Awilix PROXY mode). Domínio não depende de frameworks — infraestrutura implementa contratos.

**Busca híbrida:** `0.4 × cosine_similarity + 0.6 × full-text_score + repo_boost`. Índice HNSW (pgvector) para similaridade vetorial + índice GIN para `tsvector`. O conteúdo é segmentado por headings (`##`, `###`) e cada seção é pontuada independentemente.

**Migrações:** Umzug v3 com SequelizeStorage. Executadas automaticamente no startup.

---

## Comandos

```bash
npm run dev          # Dev server com hot reload
npm run build        # Build de produção
npm run start        # Iniciar em produção
npm run test         # Vitest run
npm run typecheck    # tsc --noEmit
```

### Migrações manuais

```bash
# Ver pendentes
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.pending().then(p => console.log(p.map(x => x.name))))"

# Rodar pendentes
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.up())"

# Reverter última
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.down())"
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| MCP Framework | Mastra v1 (`@mastra/core`, `@mastra/mcp`) |
| ORM | Sequelize v6 |
| Banco | PostgreSQL + pgvector |
| Embeddings | @xenova/transformers (paraphrase-multilingual-MiniLM-L12-v2, 384d) |
| DI | Awilix |
| Migrations | Umzug v3 |
| Validação | Zod v3 |
| Testes | Vitest v4 |

---

## Licença

MIT

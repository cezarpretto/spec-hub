---
triage: ready-for-agent
---

# Spec: SpecHub MCP Server

## Problem Statement

Equipes de engenharia trabalham com features que impactam multiplos repositorios (Producer, Consumer, API Gateway, Frontend). A documentacao de refinamento tecnico (contratos de eventos, schemas, fluxos de excecao, checklists de implementacao) fica dispersa entre Confluence, Jira e cabecas dos devs. Isso causa:

- **Perda de contexto cross-repo:** Um dev no repositorio `service-payments-consumer` nao tem acesso facil ao contrato Kafka definido no refinamento — precisa abrir o Confluence, buscar a pagina certa, e torcer pra estar atualizada.
- **Estouro de janela de contexto de agentes:** Um agente de IA (Cursor, Windsurf, Claude Code) precisa da spec inteira na janela pra entender o que implementar. Specs de 10.000+ tokens geram ruido, alucinacoes e consumo desnecessario.
- **Docs desatualizados:** Durante a implementacao, novos requisitos e ajustes surgem. Se a edicao do documento for trabalhosa, a spec original fica defasada e perde valor como fonte da verdade.

Hoje, o unico repositorio centralizado e' o Confluence — fora do fluxo de desenvolvimento, desconectado das IDEs e inacessivel programaticamente por agentes.

## Solution

Um servidor MCP (Model Context Protocol) centralizado, chamado **SpecHub**, que expoe 6 tools via SSE/HTTP para agentes de IA e devs lerem, escreverem e manterem specs tecnicas vivas diretamente da IDE.

O SpecHub armazena specs como documentos Markdown com embedding vetorial (busca semantica) e tasks organizadas por repositorio. O agente consome **apenas o trecho relevante** para o repositorio/task atual, com latencia <300ms e minimo consumo de tokens.

Stack: Node.js + Mastra (framework MCP) + PostgreSQL + pgvector (HNSW) + `@xenova/transformers` para embedding local (modelo `paraphrase-multilingual-MiniLM-L12-v2`, 384 dimensoes, 50+ idiomas, sem API externa).

## User Stories

### Ingestao e Escrita

1. As a Tech Lead conduzindo refinamento, I want salvar uma Spec tecnica atrelada a uma demanda externa (Jira, Linear, GitHub Issue), so that a documentacao fica centralizada e acessivel programaticamente por qualquer agente.
2. As a Tech Lead, I want que a referencia externa seja flexivel (source_type + source_key), so that o SpecHub funcione com qualquer ferramenta de tracking, nao apenas Jira.
3. As a Tech Lead, I want que o conteudo Markdown da Spec seja armazenado integralmente como texto, so that edicoes futuras preservem a estrutura original sem perda de informacao.
4. As a Tech Lead, I want que a Spec receba automaticamente um embedding vetorial ao ser salva, so that buscas semanticas estejam disponiveis imediatamente apos a ingestao.
5. As a Tech Lead, I want que o save da Spec seja atomico (tudo ou nada), so that nunca exista uma Spec parcialmente indexada que retorne resultados incompletos em buscas.

### Recuperacao de Contexto

6. As an Agente de IA na IDE do repositorio `service-payments-consumer`, I want buscar contexto especifico com linguagem natural (ex: "Qual o schema do evento Kafka?"), so that eu receba apenas os trechos relevantes da Spec em vez do documento inteiro.
7. As an Agente de IA, I want que a busca combine similaridade vetorial com full-text search (tsvector), so that termos tecnicos exatos (nomes de campos, tipos) sejam encontrados mesmo que a pergunta use palavras diferentes.
8. As an Agente de IA, I want que a busca seja scoped por spec_id, so that eu nunca receba chunks de uma spec diferente da demanda atual.
9. As an Agente de IA abrindo a IDE em um repositorio especifico, I want consultar apenas as tasks pendentes daquele repositorio, so that eu veja exatamente o que precisa ser implementado ali, sem ruido de outros repositorios.
10. As an Agente de IA, I want que cada task inclua um context_snippet em Markdown com o trecho relevante da Spec, so that eu tenha o contrato ou fluxo necessario inline, sem precisar de uma segunda chamada.
11. As a Dev revisando a arquitetura de uma feature, I want obter a visao geral da Spec com o indice de secoes (headings), so that eu entenda a estrutura do documento antes de mergulhar em detalhes.
12. As an Agente de IA, I want que as respostas das tools sejam Markdown limpo, sem metadata excessiva, so that o consumo de tokens seja minimo e o foco fique no conteudo tecnico.

### Edicao e Manutencao

13. As an Agente de IA implementando codigo, I want editar uma secao especifica da Spec (ex: apenas o contrato de um evento), so that eu possa corrigir ou refinar a documentacao sem reescrever o documento inteiro.
14. As an Agente de IA, I want que apos editar uma secao, o embedding do documento seja re-gerado automaticamente, so that buscas subsequentes ja reflitam o conteudo atualizado.
15. As an Agente de IA, I want marcar uma task como `done` ao concluir sua implementacao, so that o progresso da demanda seja visivel para outros agentes e devs.
16. As an Agente de IA, I want adicionar uma nova task descoberta durante a implementacao, so that requisitos que surgem no meio do desenvolvimento sejam capturados e rastreaveis.
17. As an Agente de IA, I want que cada task nova ou atualizada registre seu `intent` (proposito normalizado), so que seja possivel agrupar tasks com mesmo objetivo ao longo do tempo.
18. As a Tech Lead auditando mudancas, I want um changelog com data/hora e autor de cada modificacao em Spec ou Task, so that eu saiba quem alterou o que e quando.
19. As an Agente de IA, I want que a edicao de uma secao da Spec siga a semantica last-write-wins, so that nao haja complexidade de merge ou conflito em um cenario onde raramente duas pessoas editam a mesma spec simultaneamente.

### Infra e Operacao

20. As a DevOps engineer, I want configurar o SpecHub via variaveis de ambiente (DATABASE_URL, PORT, etc), so that o deploy seja simples e sem arquivos de configuracao complexos.
21. As a DevOps engineer, I want que o SpecHub crie as tabelas automaticamente no startup (auto-migrate), so that o setup de um ambiente novo seja zero-touch.
22. As a future user, I want autenticar no SpecHub via login Google da empresa, so que qualquer pessoa do dominio corporativo possa acessar sem cadastro manual.

## Implementation Decisions

### Stack

- **Runtime:** Node.js
- **Framework MCP:** Mastra — MCP server declarativo, tool registration, suporte a SSE/HTTP nativo
- **Banco:** PostgreSQL 15+ com extensao `pgvector` e `pg_trgm`
- **Embedding:** `@xenova/transformers` com modelo `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensoes, ~470MB, suporta 50+ idiomas incluindo portugues e ingles, roda local em Node.js, sem API externa)
- **Protocolo:** SSE/HTTP (servidor centralizado, um processo serve multiplos agentes)

### Schema

Tres tabelas principais com o seguinte shape (derivado do prototipo de domain modeling):

```
specs (
    id          UUID PK,
    source_type VARCHAR(32)  NOT NULL,   -- 'JIRA', 'LINEAR', 'GITHUB'
    source_key  VARCHAR(128) NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,           -- Markdown raw, fonte da verdade
    content_tsv TSVECTOR,               -- GENERATED ALWAYS, full-text search
    embedding   VECTOR(384),            -- paraphrase-multilingual-MiniLM-L12-v2
    created_at, updated_at, updated_by
)

tasks (
    id              UUID PK,
    spec_id         UUID FK -> specs,
    status          VARCHAR(16) CHECK (pending|in_progress|done),
    repo            VARCHAR(128) NOT NULL,
    intent          VARCHAR(256) NOT NULL,   -- slug normalizado
    title           TEXT NOT NULL,
    context_snippet TEXT NOT NULL,           -- Markdown inline, snapshot
    created_at, updated_at, updated_by
)

changelog (
    id          UUID PK,
    spec_id     UUID FK -> specs  NULLABLE,
    task_id     UUID FK -> tasks NULLABLE,
    field       VARCHAR(64)  NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    changed_by  VARCHAR(128) NOT NULL,
    changed_at  TIMESTAMPTZ NOT NULL
)
```

Indices: HNSW em `specs.embedding` (vector_cosine_ops), GIN em `specs.content_tsv`, B-tree em `tasks(spec_id, repo)` e `tasks(spec_id, intent)`.

### Modelo de Dominio

- **Chunks nao sao entidades** — sao artefatos de indexacao derivados do `content` Markdown. O embedding e' document-level (um vetor por Spec), nao chunk-level.
- **Tasks sao snapshots point-in-time** — uma vez `done`, sao imutaveis. Mudancas de escopo geram novas tasks, agrupadas por `intent` (slug normalizado).
- **Referencia externa flexivel** — `source_type` + `source_key` como colunas indexaveis. Suporta Jira, Linear, GitHub Issues ou qualquer ferramenta futura.
- **Sem entidade User/Agent** — `updated_by` e `changed_by` sao strings livres (ex: `"claude-code"`, `"cezar@corp"`). MVP sem modelagem de identidade.
- **Concorrencia last-write-wins** — sem optimistic locking ou versionamento. Cenario de conflito e' considerado improvavel no uso real (uma spec por demanda, um refinador por vez).

### Pipeline de Embedding

O embedding e' gerado de forma sincrona dentro da transacao de save/update:

1. MCP tool recebe conteudo Markdown
2. `@xenova/transformers` gera embedding (latencia ~30ms local)
3. BEGIN transaction → INSERT/UPDATE specs (content + embedding + tsvector auto) → INSERT changelog → COMMIT
4. Se o modelo de embedding falhar, a transacao nao abre — Spec nao e' salva (consistencia forte, rollback total)
5. Busca hibrida: embedding localiza a Spec por cosine similarity (HNSW), depois ts_rank + ts_query ranqueia secoes dentro do documento

### MCP Tools — Contratos

**save_spec**
- Input: `{ source_type, source_key, title, content, updated_by }`
- Output: `{ spec_id, title, status: 'created' | 'updated' }`
- Comportamento: UPSERT por `(source_type, source_key)`. Se ja existe, atualiza conteudo e re-embeds.

**search_spec_context**
- Input: `{ spec_id, query, repo? }`
- Output: `{ spec_id, title, matches: [{ section, snippet, score }] }`
- Comportamento: cosine similarity (embedding) + ts_rank (full-text) no content da Spec. Retorna top-3 trechos mais relevantes. Repo filtra por tasks associadas ao repositorio.

**get_repo_tasks**
- Input: `{ spec_id, repo }`
- Output: `{ spec_id, repo, tasks: [{ id, status, intent, title, context_snippet }] }`
- Comportamento: SELECT tasks WHERE spec_id = $1 AND repo = $2, agrupado por intent. Retorna apenas tasks com status != 'done'.

**get_feature_overview**
- Input: `{ spec_id }`
- Output: `{ spec_id, title, source: { type, key }, sections: [{ heading, level }], updated_at }`
- Comportamento: Retorna metadata da Spec + indice de headings (## e ###) extraidos do Markdown, sem o conteudo completo.

**update_task_status**
- Input: `{ task_id?, spec_id, repo, status, intent?, title?, context_snippet?, updated_by }`
- Output: `{ task_id, status }`
- Comportamento: se `task_id` informado → UPDATE status. Se nao → INSERT nova task com status `pending`. Ambos registram changelog.

**update_spec_chunk**
- Input: `{ spec_id, section_heading, new_content, updated_by }`
- Output: `{ spec_id, section, status: 'updated' | 'not_found' }`
- Comportamento: regex localiza heading no content, substitui secao, re-embeds documento inteiro, salva em transacao com changelog.

## Testing Decisions

### Seam

O unico seam de teste sao os contratos JSON de entrada/saida das 6 MCP tools. O banco de dados e' mockado — as funcoes de acesso ao PG retornam dados pre-definidos, permitindo testes deterministicos e rapidos sem infra externa.

O modelo de embedding (`@xenova/transformers`) e' exercitado nos testes (gera vetores reais), mas as queries de similaridade e full-text search sao mockadas para retornar resultados pre-definidos que validam o contrato.

### O que e' um bom teste

- Testa apenas o comportamento externo observavel via JSON de resposta da tool
- Nao testa implementacao interna do Mastra, conexao real com PG, ou qualidade do embedding
- Cada cenario cobre um fluxo completo: input → processamento → output + changelog registrado
- Dados mockados sao inseridos por funcao auxiliar (factory), nao por SQL bruto

### Modulos testados

- `save_spec`: criacao e atualizacao atomica, re-embedding, changelog
- `search_spec_context`: busca hibrida mockada, scoping por spec_id, limite de 3 resultados
- `get_repo_tasks`: filtro por repo, status, agrupamento por intent
- `get_feature_overview`: extracao de headings, metadata
- `update_task_status`: criacao de nova task, atualizacao de status, changelog
- `update_spec_chunk`: substituicao de secao por heading, re-embedding, secao nao encontrada

### Prior art

Projeto greenfield, sem prior art no repositorio. Padrao de teste seguira testes de contrato de API REST (input JSON → output JSON + estado), adaptado para o paradigma MCP onde cada tool e' uma funcao TypeScript com tipagem estrita de entrada e saida.

## Out of Scope

- **Chunk-level embedding:** Embedding e' document-level. Chunking como entidade separada com embedding proprio esta fora do MVP.
- **Versionamento de documento:** Changelog registra alteracoes, mas nao ha snapshot completo da Spec por versao. Nao ha diff entre versoes.
- **Autenticacao:** MVP sem autenticacao. Login Google da empresa e' fase futura.
- **Multi-tenancy:** Uma instancia de SpecHub = um banco. Nao ha isolamento por time/org alem do schema do banco.
- **Observabilidade:** Apenas stderr logs. Sem metricas, tracing, ou dashboard.
- **Migracao de dados do Confluence:** Import manual ou via script externo. Nao ha ferramenta de migracao embutida.
- **Web UI:** Interface e' exclusivamente via MCP tools. Nao ha frontend ou dashboard web.
- **Notificacoes:** Nao ha notificacao de mudancas (webhook, evento, polling). Agentes consultam sob demanda.
- **RBAC / Permissoes:** Qualquer agente conectado pode ler e escrever em qualquer Spec. Sem controle de acesso por spec ou repo.
- **Suporte a stdio:** Apenas SSE/HTTP. stdio nao faz sentido para o cenario centralizado desejado.

## Dev Environment

O banco local deve ser provisionado via Docker Compose com PostgreSQL + pgvector na porta **5434**:

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_DB: spechub
      POSTGRES_USER: spechub
      POSTGRES_PASSWORD: spechub
    ports:
      - "5434:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

DATABASE_URL resultante: `postgresql://spechub:spechub@localhost:5434/spechub`

## Further Notes

- O modelo de embedding `paraphrase-multilingual-MiniLM-L12-v2` suporta 50+ idiomas incluindo portugues e ingles. Para garantir maxima precisao, queries devem ser feitas no mesmo idioma do documento (cross-language tem qualidade inferior a same-language).
- Se o volume de Specs crescer e o embedding document-level se tornar gargalo (muitos documentos, pouca granularidade), migrar para chunk-level embedding e' uma evolucao natural, mas requer re-indexacao completa.
- O changelog cresce indefinidamente. Para producao, considerar particionamento por mes ou TTL de retencao.
- O Mastra abstrai o protocolo MCP, mas o SpecHub deve expor um endpoint de health check simples para o deploy (ex: `GET /health`).

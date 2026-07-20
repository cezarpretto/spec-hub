# 02 — Search specs with natural language

**What to build:** A tool `search_spec_context` que permite a um agente de IA fazer perguntas em linguagem natural sobre uma Spec (ex: "Qual o schema do evento Kafka?") e receber os trechos mais relevantes do documento, usando busca hibrida que combina similaridade vetorial (embedding) com busca full-text (tsvector). O agente consome apenas os paragrafos relevantes, nao a Spec inteira.

**Blocked by:** 01 — Foundation + Save & Read Spec (precisa de specs salvas no banco e embedding funcional)

**Status:** ready-for-agent

- [ ] Busca hibrida: gera embedding da query, executa cosine similarity via indice HNSW em `specs.embedding` scoped por spec_id, depois refina resultado com ts_rank + ts_query no `specs.content_tsv` para ranquear paragrafos dentro do documento
- [ ] Resultado retorna top-3 matches, cada um com `{ section, snippet, score }` em Markdown limpo (sem metadata desnecessaria)
- [ ] Busca e sempre scoped por spec_id — nunca retorna chunks de outras specs
- [ ] Se spec_id nao existe, retorna erro claro
- [ ] Testes cobrem: query encontra trecho relevante por similaridade semantica, query encontra termo exato via full-text (ex: nome de campo), query sem resultados retorna array vazio, scoping por spec_id isola resultados entre specs diferentes
- [ ] Banco mockado nos testes; funcoes de similaridade vetorial e ts_rank retornam resultados pre-definidos

# 01 — Foundation + Save & Read Spec

**What to build:** Um servidor MCP funcional sobre SSE/HTTP que, ao ser iniciado, provisiona automaticamente o banco PostgreSQL + pgvector local (Docker Compose, porta 5434), carrega o modelo de embedding em memoria e expoe duas tools: salvar uma Spec com embedding vetorial e ler a visao geral de uma Spec ja salva. O agente conectado consegue persistir especificacoes tecnicas e recupera-las sem depender de Confluence.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Docker Compose provisiona pgvector:pg17 na porta 5434 com database `spechub`
- [ ] Mastra project scaffold com servidor SSE/HTTP configurado
- [ ] Variaveis de ambiente: DATABASE_URL, PORT lidas na inicializacao
- [ ] Auto-migrate no startup cria schema completo: tabelas `specs`, `tasks`, `changelog` com todos os indices (HNSW em specs.embedding, GIN em specs.content_tsv)
- [ ] Modelo `Xenova/paraphrase-multilingual-MiniLM-L12-v2` carregado via `@xenova/transformers` no startup, disponivel para geracao de embeddings (384 dimensoes)
- [ ] Tool `save_spec` recebe `{ source_type, source_key, title, content, updated_by }`, gera embedding do content, faz UPSERT atomico na tabela specs e registra changelog. Se embedding falhar, spec nao e salva e erro e retornado
- [ ] Tool `get_feature_overview` recebe `{ spec_id }`, retorna metadata da spec + indice de headings (## e ###) extraidos do content Markdown, sem o conteudo completo
- [ ] Testes cobrem: save de nova spec, update de spec existente (UPSERT), leitura de overview com headings, falha de embedding nao persiste dados, overview de spec inexistente retorna erro
- [ ] Banco mockado nos testes (factory functions fornecem dados pre-definidos); modelo de embedding exercitado com chamadas reais

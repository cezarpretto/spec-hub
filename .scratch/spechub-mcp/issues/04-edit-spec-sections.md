# 04 — Edit spec sections

**What to build:** A tool `update_spec_chunk` que permite a um agente de IA editar uma secao especifica da Spec durante a implementacao — por exemplo, corrigir o contrato de um evento Kafka ou ajustar um fluxo de excecao — sem reescrever o documento inteiro. Apos a edicao, o embedding do documento e re-gerado automaticamente para que buscas subsequentes reflitam o conteudo atualizado.

**Blocked by:** 01 — Foundation + Save & Read Spec (precisa de specs salvas e pipeline de embedding funcional)

**Status:** ready-for-agent

- [ ] Tool `update_spec_chunk` recebe `{ spec_id, section_heading, new_content, updated_by }`. Localiza a secao no content Markdown por regex (heading `## section_heading` ate o proximo heading), substitui o conteudo, re-gera embedding do documento inteiro, salva em transacao atomica com changelog
- [ ] Separador de secao: regex identifica inicio da secao pelo heading e fim pelo proximo heading de mesmo nivel ou superior (##, #) ou fim do documento
- [ ] Re-embedding usa o modelo `paraphrase-multilingual-MiniLM-L12-v2` ja carregado — sem recarregar o modelo
- [ ] Transacao atomica: UPDATE specs (content + embedding + tsvector regenerado automaticamente) + INSERT changelog. Se embedding falhar, nada persiste
- [ ] Se section_heading nao for encontrado no documento, retorna `{ status: 'not_found' }` com mensagem clara
- [ ] Changelog registra `field: 'content'`, old_value com a secao antiga, new_value com a secao nova, changed_by e timestamp
- [ ] Testes cobrem: substituicao de secao existente (conteudo atualizado + embedding regenerado), secao nao encontrada retorna erro, re-embedding mantem dimensao 384 e valores validos, changelog registra antes/depois, falha de embedding nao persiste alteracao, edicao preserva o resto do documento intacto
- [ ] Banco mockado nos testes; modelo de embedding exercitado com chamadas reais para validar re-geracao de vetor

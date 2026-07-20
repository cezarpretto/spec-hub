# 03 — Tasks management per repo

**What to build:** Duas tools que permitem a um agente de IA consultar e gerenciar o checklist de implementacao por repositorio. `get_repo_tasks` retorna apenas as tasks pendentes do repositorio onde a IDE esta aberta, agrupadas por intent. `update_task_status` permite marcar tasks como concluidas e adicionar novas tasks descobertas durante a implementacao, com changelog registrando toda operacao.

**Blocked by:** 01 — Foundation + Save & Read Spec (precisa da tabela tasks criada no schema e specs existentes para associar tasks)

**Status:** ready-for-agent

- [ ] Tool `get_repo_tasks` recebe `{ spec_id, repo }`, retorna tasks com status diferente de `done`, agrupadas por `intent`. Cada task inclui `id, status, intent, title, context_snippet`
- [ ] Tool `update_task_status` recebe `{ task_id?, spec_id, repo, status, intent?, title?, context_snippet?, updated_by }`. Se task_id informado, atualiza status da task existente. Se nao, insere nova task com status `pending`
- [ ] Intent e normalizado como slug (lowercase, trim, underscores) antes de persistir
- [ ] Toda operacao (update de status ou criacao de task) insere registro no changelog com campo alterado, valor antigo/novo, autor e timestamp
- [ ] Tasks sao snapshots point-in-time — status `done` e imutavel. Mudancas de escopo geram nova task com mesmo intent
- [ ] Testes cobrem: listar tasks por repo (filtra corretamente), criar nova task com intent e context_snippet, atualizar status de task existente, changelog registra criacao e atualizacao, intent normalizado (case e whitespace), tasks `done` nao aparecem no get_repo_tasks
- [ ] Banco mockado nos testes

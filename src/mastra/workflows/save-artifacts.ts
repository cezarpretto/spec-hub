export interface WorkflowResource {
  uri: string
  name: string
  description: string
  mimeType: string
  content: string
}

export const SAVE_ARTIFACTS_WORKFLOW: WorkflowResource = {
  uri: 'spechub://workflows/save-artifacts',
  name: 'Salvar Artefatos SDD',
  description: 'Publica no SpecHub os artefatos gerados por Spec-Driven Development (techspec, architecture, tasks) vinculando-os a um card Jira.',
  mimeType: 'text/markdown',
  content: `# SpecHub — Salvar Artefatos SDD

Publica no SpecHub os artefatos gerados por Spec-Driven Development (ex.: \`tech-spec-create\`), vinculando-os a um card Jira (\`source_key\`).

## Inputs obrigatórios

| Input | Exemplo | Notas |
| :--- | :--- | :--- |
| \`source_key\` | \`SHELL-3948\` | Chave do card Jira |
| Caminhos dos artefatos | \`.local-specs/SHELL-3948_attachments/\` | Ou paths explícitos |
| \`updated_by\` | email do usuário | Default: email do assignee/reporter do Jira ou do git \`user.email\` |

Se faltar \`source_key\` ou paths, **pergunte e pare**.

## Mapeamento artefato → SpecHub

| Arquivo local (padrão) | \`source_type\` | \`title\` |
| :--- | :--- | :--- |
| \`techspec.md\` | \`spec\` | Título H1 do arquivo |
| \`architecture.md\` | \`design\` | Título H1 do arquivo |
| \`tasks.md\` | **não** usar \`save_spec\` como doc único de execução | Ver seção Micro-tasks |
| \`prd.md\` (se existir) | \`prd\` | Título H1 do arquivo |

Regra: o par \`(source_type, source_key)\` é único (UPSERT). Re-salvar o mesmo par atualiza o documento.

## Workflow (obrigatório)

\`\`\`
SpecHub Publish:
- [ ] 1. Descobrir docs existentes (list_card_documents)
- [ ] 2. Ler artefatos locais
- [ ] 3. save_spec: techspec → source_type=spec
- [ ] 4. save_spec: architecture → source_type=design
- [ ] 5. save_spec: prd (se houver) → source_type=prd
- [ ] 6. Parsear tasks.md em micro-tasks
- [ ] 7. Criar cada micro-task (update_task_status sem task_id)
- [ ] 8. Verificar (list_card_documents + get_repo_tasks)
- [ ] 9. Reportar IDs / contagens ao usuário
\`\`\`

### 1. Descobrir

\`\`\`
list_card_documents({ source_key })
\`\`\`

Informe ao usuário se já existem \`spec\`/ \`design\` (serão sobrescritos no UPSERT).

### 2. Salvar documentos

Para cada artefato documental (não as micro-tasks):

\`\`\`
save_spec({
  source_type,      // spec | design | prd
  source_key,       // SHELL-XXXX
  title,            // H1 do markdown
  content,          // markdown completo do arquivo
  updated_by
})
\`\`\`

- Conteúdo = arquivo inteiro (não resuma).
- Se o arquivo for muito grande para o MCP, salve o máximo fiel possível preservando headings, contratos e decisões; não invente conteúdo.

### 3. Micro-tasks a partir de \`tasks.md\`

**Não** salve o \`tasks.md\` inteiro como único documento operacional de tasks.

1. Parseie o markdown e extraia **cada** micro-task (ex.: \`### Task 1.1: ...\`, \`### Task 1.2: ...\`).
2. Para cada uma, crie uma task SpecHub vinculada ao **spec** (\`source_type=spec\` + \`source_key\`):

\`\`\`
update_task_status({
  // omitir task_id → cria nova
  source_type: "spec",
  source_key,           // mesmo do card
  repo,                 // do heading "## Repositório: <nome>" (default: gupy-api-darthvader se único/implícito)
  status: "pending",
  intent,               // slug kebab-case único, ex.: expose-evaluator-updated-at
  title,                // "Task 1.1: <nome curto>"
  context_snippet,      // markdown da task: objetivo + critérios de aceite + dependências
  updated_by
})
\`\`\`

#### Parsing de cada task

Do bloco da task, monte \`context_snippet\` com:

- Título / objetivo
- Critérios de aceite (lista)
- Dependências (se houver)

Omita listagens longas de paths de arquivo se já estiverem no spec (prefira o que o agente precisa para executar).

#### \`intent\`

- kebab-case, estável, único por card
- Derive do título (ex.: \`Task 1.3: Implementar use case Nest GetSkillsEvaluations\` → \`implement-get-skills-evaluations-uc\`)
- Máx. ~64 chars; sem espaços

#### Idempotência

Antes de criar em massa:

\`\`\`
get_repo_tasks({ source_type: "spec", source_key })
\`\`\`

- Se já existirem tasks com o mesmo \`intent\` / \`title\` e status ativo: **não duplique** — reporte e pergunte se deve recriar/atualizar.
- Se o usuário pedir republish forçado: atualize via \`task_id\` + \`update_task_status\` ou confirme exclusão manual (SpecHub MCP pode não ter delete).

### 4. Verificar

\`\`\`
list_card_documents({ source_key })
get_repo_tasks({ source_type: "spec", source_key })
\`\`\`

Confirme: docs \`spec\`/ \`design\` presentes; N micro-tasks = N seções de task no \`tasks.md\`.

## Relação com tech-spec-create

Use **depois** que \`techspec.md\`, \`architecture.md\` e \`tasks.md\` existirem e o usuário pedir publicação no SpecHub.

Não regenere artefatos nesta workflow — só publique.

## Output para o usuário

Resposta curta em português:

1. Link/chave do card (\`source_key\`)
2. Documentos salvos (\`source_type\` + \`spec_id\` se retornado)
3. Quantidade de micro-tasks criadas (lista 1.1…N com \`task_id\` se útil)
4. Avisos (UPSERT, tasks já existentes, artefato ausente)

## Anti-padrões

- Salvar \`tasks.md\` só como \`save_spec\` e **pular** micro-tasks
- Criar todas as tasks num único \`context_snippet\`
- Usar \`source_key\` de outro card (ex.: SHELL-3925) por engano
- Inventar conteúdo que não está nos arquivos locais
- Chamar SpecHub sem \`list_card_documents\` primeiro`,
}

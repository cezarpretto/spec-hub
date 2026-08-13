import type { WorkflowResource } from './save-artifacts.js'

export const IMPORT_FROM_SOURCES_WORKFLOW: WorkflowResource = {
  uri: 'spechub://workflows/import-from-sources',
  name: 'Importar Specs do Jira / Confluence',
  description: 'Importa specs que já existem em issues do Jira ou páginas do Confluence para o SpecHub, convertendo o corpo via ContentConverter e montando header de metadados automaticamente.',
  mimeType: 'text/markdown',
  content: `# SpecHub — Importar Specs do Jira / Confluence

Quando o card/issue ou a página já existe na ferramenta de origem, **não reescreva** a spec — importe-a em uma única chamada MCP.

## Quando usar

Use \`save_spec_from_jira\` ou \`save_spec_from_confluence\` quando:

- O conteúdo técnico já está documentado no Jira ou Confluence.
- O usuário pede "importar", "migrar", "trazer pro SpecHub" ou "criar spec a partir de <chave/página>".
- Você quer preservar a estrutura original (tabelas, painéis, code blocks) sem copiar/colar manualmente.

Para artefatos locais (techspec.md, architecture.md, tasks.md) gerados por skills como \`cy-create-techspec\`, use o workflow \`spechub://workflows/save-artifacts\` em vez deste.

## Escolha do formato

Tanto o Jira MCP quanto o Confluence MCP devolvem o corpo em múltiplos formatos:

| Fonte | \`format\` | Fidelidade | Quando usar |
| :--- | :--- | :--- | :--- |
| Jira | \`adf\` | Alta (preserva panels, tables, status badges, mentions) | **Recomendado** |
| Jira | \`markdown\` | Baixa (texto simplificado, perde estrutura) | Só se quiser versão resumida |
| Jira | \`html\` | Média | Raramente — preferir ADF |
| Confluence | \`html\` | Alta (storage format com macros) | **Recomendado** |
| Confluence | \`markdown\` | Baixa | Só se quiser versão resumida |
| Confluence | \`adf\` | Média | Alternativa ao HTML |

Regra: **sempre prefira o formato rico**. Você pode simplificar depois com \`update_spec_chunk\`, mas não consegue reconstruir uma tabela que foi perdida na simplificação.

## Workflow Jira

\`\`\`
1. Buscar issue: getJiraIssue(key, responseContentFormat='adf')
   → envelope JSON + description ADF
2. (Opcional) Buscar comentários no mesmo formato
3. Importar: save_spec_from_jira(
     source_key=key,
     issue_envelope=<envelope do passo 1>,
     description=<description ADF do passo 1>,
     description_format='adf',
     comments=<comentários, se houver>,
     updated_by='<user-or-agent-id>')
4. Verificar: list_card_documents(source_key=key)
   → deve aparecer doc com source_type='JIRA'
\`\`\`

A tool monta automaticamente o Markdown:

\`\`\`markdown
# {issue.fields.summary}

**Source**: JIRA · {key} · **Status**: {fields.status.name} · **Assignee**: ... · **Labels**: ... · **Created**: ... · **Updated**: ...

## Description
{converted ADF → Markdown}

## Comments

### {author} · {created}
{converted body}
\`\`\`

## Workflow Confluence

\`\`\`
1. Buscar página: getConfluencePage(pageId, contentFormat='html')
   → envelope JSON + body HTML (storage format)
2. Importar: save_spec_from_confluence(
     source_key=pageId,
     page_envelope=<envelope do passo 1>,
     content=<body HTML do passo 1>,
     content_format='html',
     updated_by='<user-or-agent-id>')
3. Verificar: list_card_documents(source_key=pageId)
   → deve aparecer doc com source_type='CONFLUENCE'
\`\`\`

A tool monta automaticamente o Markdown:

\`\`\`markdown
# {page.title}

**Source**: CONFLUENCE · {space.key}/{pageId} · **Space**: {space.name} · **Author**: ... · **Version**: ... · **Created**: ... · **Updated**: ...

{converted HTML → Markdown}
\`\`\`

## Macros Confluence preservadas

O conversor HTML→Markdown reconhece as macros mais comuns e gera Markdown limpo:

| Macro Confluence | Saída Markdown |
| :--- | :--- |
| \`{info}\`, \`{note}\`, \`{warning}\`, \`{tip}\` | \`> [!INFO]\`, etc. (GitHub alert blockquote) |
| \`{code} language=ts\` | \`\`\`ts\\n...\\n\`\`\` |
| \`{expand title=...}\` | \`> **Title:** ...\` |
| \`{panel title=...}\` | \`> **Title:** ...\` |
| \`{status title=...}\` | \`[Status: ...]\` |
| Tabelas | GFM table |
| Macros desconhecidas | \`[macro: nome]\` — marcador pra revisão manual |

## Depois de importar

1. \`search_spec_context\` com query na mesma língua do documento pra confirmar indexação.
2. \`update_task_status\` (omitindo \`task_id\`) pra criar micro-tasks vinculadas ao spec importado.
3. Se a fonte original mudar, basta chamar a tool de novo com o mesmo \`(source_type, source_key)\` — UPSERT atualiza o documento e re-gera o embedding.

## Anti-padrões

- Pedir \`responseContentFormat='markdown'\` / \`contentFormat='markdown'\` por padrão — perde estrutura.
- Converter manualmente antes de chamar a tool — duplica lógica e pula o header de metadados.
- Salvar com \`save_spec\` direto após converter fora — sem link com a fonte e sem header.
- Esquecer \`list_card_documents\` antes de importar — pode sobrescrever sem avisar.
- Tentar ler issues/páginas de outro sistema sem credentials — SpecHub não busca; você (agente) busca via MCP da fonte e passa o conteúdo.`,
}

# 📄 PRD: SpecHub MCP Server (Sistema Centralizado de Specs Cross-Repo)

## 1. Visão Geral do Produto
O **SpecHub MCP** é um servidor de protocolo MCP (*Model Context Protocol*) integrado a um banco PostgreSQL (`pgvector`). Ele centraliza o armazenamento, a indexação vetorial, a recuperação contextual e a **edição contínua** de especificações técnicas (Specs), PRDs e tarefas que abrangem múltiplos repositórios.

Ele substitui a dependência do Confluence como repositório estático de refinamento, permitindo que agentes de IA (Cursor, Windsurf, Claude Code) leiam, gravem e **mantenham atualizados** apenas os trechos necessários para cada repositório/task com consumo mínimo de tokens.

---

## 2. Problemas a Resolver
* **Dispersão e Desconexão:** Documentação de refinamento isolada no Confluence/Jira, fora do ambiente de código dos devs/agentes.
* **Complexidade Cross-Repo:** Features que impactam $N$ repositórios (ex: Producer, Consumer, Lib) sofrem com duplicação de informações ou falta de uma "fonte única da verdade".
* **Gargalo de Janela de Contexto:** Colocar a Spec inteira de uma demanda complexa na janela do agente consome muitos tokens e gera ruído ("alucinações") durante a codificação de um serviço específico.
* **Dessincronização de Mudanças:** Durante o desenvolvimento, requisitos e contratos mudam. Se a edição for difícil, o documento original fica defasado rapidamente.

---

## 3. Personas & Casos de Uso

| Persona | Ação Principal | Benefício |
| :--- | :--- | :--- |
| **Pessoa de Refinamento (Tech Lead / Dev)** | Usa skills de refinamento (ex: `gill-me`, `tlc-spec-driven`) para publicar e revisar a Spec no SpecHub. | Elimina a criação manual de páginas no Confluence e centraliza a visão de arquitetura. |
| **Dev / Agente de Implementação** | Executa tarefas consumindo o contexto focado via MCP na IDE e **atualiza a Spec** quando descobre novas regras ou ajustes durante o código. | Mantém a especificação viva e sincronizada diretamente a partir do ambiente de desenvolvimento. |

---

## 4. Requisitos Funcionais

### 4.1. Ingestão e Estruturação de Dados (Escrita Inicial)
* **RF01 - Registro de Spec Central:** O sistema deve permitir salvar uma Spec atrelada a uma demanda/card mãe do Jira (ex: `PROJ-123`).
* **RF02 - Divisão por Repositório (Context Bound):** A Spec deve permitir associar sub-tarefas e requisitos específicos a repositórios alvo (ex: `service-payments-consumer`, `api-gateway`).
* **RF03 - Chunking e Indexação Vetorial:** O conteúdo técnico deve ser automaticamente fragmentado em seções (*chunks*) e indexado com embeddings no Postgres (`pgvector`).

### 4.2. Recuperação de Contexto (Leitura / MCP Tools)
* **RF04 - Busca Contextual Vetorial (`search_spec_context`):** O agente deve conseguir buscar respostas a perguntas específicas (ex: *"Qual o schema do evento Kafka?"*) filtrando apenas pela spec da demanda atual.
* **RF05 - Consulta de Tarefas por Repositório (`get_repo_tasks`):** Dado o nome do repositório onde a IDE está aberta e o ID da demanda, o agente obtém **apenas** o checklist e contexto aplicáveis àquele repositório.
* **RF06 - Leitura de Visão Geral (`get_feature_overview`):** Permitir resgatar a visão arquitetural de alto nível da feature (arquitetura global e contratos).

### 4.3. Edição e Manutenção da Spec
* **RF07 - Atualização Seletiva de Chunks (`update_spec_chunk`):** Permitir editar/sobrescrever um trecho/seção específico da spec (ex: apenas o contrato de um evento ou o fluxo de exceção do Consumer) sem precisar reescrever a spec inteira.
* **RF08 - Re-indexação Automática de Embeddings:** Sempre que um chunk for atualizado ou adicionado, o servidor MCP deve re-gerar o embedding daquele trecho específico no Postgres.
* **RF09 - Atualização de Status/Checklist de Tasks (`update_task_status`):** O agente ou dev deve conseguir marcar sub-tasks de um repositório específico como concluídas (`pending` -> `done`) ou adicionar sub-tasks descobertas durante a implementação.
* **RF10 - Versionamento / Histórico de Alterações:** Manter um registro simples de data/hora e autor (ou agente) que realizou cada modificação no chunk ou na task para fins de auditoria.

---

## 5. Requisitos Não-Funcionais
* **RNF01 - Latência de Busca:** A busca vetorial deve responder em menos de 300ms para não travar a experiência do agente na IDE.
* **RNF02 - Eficiência de Tokens:** As respostas das ferramentas MCP devem retornar dados limpos em Markdown, evitando metadata desnecessária.
* **RNF03 - Compatibilidade Protocolar:** O servidor deve seguir estritamente a especificação do Model Context Protocol (MCP) via `stdio` ou `SSE`.
* **RNF04 - Consistência de Embedding:** O tempo de re-indexação de um chunk alterado deve ser imediato (executado de forma síncrona na chamada da tool de edição) para garantir que buscas posteriores já reflitam a nova versão.

---

## 6. Arquitetura de Dados Resumida

```
Demanda / Card Mãe (Jira Key)
 ├── Visão Geral da Spec & Arquitetura (Global)
 ├── Chunks Vetoriais (Modelos, Contratos, DTOs) [Suporta UPDATE/DELETE/RE-EMBEDDING]
 └── Sub-tasks por Repositório [Suporta UPDATE STATUS / ADD TASK]
      ├── Repositório A (ex: API) -> Lista de Requisitos
      ├── Repositório B (ex: Worker) -> Lista de Requisitos
      └── Repositório C (ex: Frontend) -> Lista de Requisitos
```

---

## 7. Critérios de Aceite para Validação do MVP
1. **Gravação OK:** Conseguir rodar um comando de refinamento e persistir no Postgres uma spec completa quebrada em $N$ repositórios.
2. **Leitura Isolada OK:** Abrir a IDE no *Repositório B*, chamar a tool do MCP e receber **somente** os requisitos do *Repositório B* e o contrato de integração.
3. **Edição e Re-indexação OK:** Solicitar ao agente na IDE a alteração de um campo no contrato do evento, verificar se a tool `update_spec_chunk` atualiza o banco e se a busca vetorial imediatamente seguinte já traz o contrato novo.
4. **Economia de Contexto:** Confirmar que a busca por um contrato específico retorna menos de $500$ tokens em vez da Spec inteira de $10.000$ tokens.

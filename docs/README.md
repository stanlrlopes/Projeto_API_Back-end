# Documentação Técnica e Histórico de Auditorias — EducaAPI

Este diretório reúne os relatórios técnicos de estabilização, planejamento arquitetural, implementação modular do Front-End e auditorias de segurança e integridade do projeto **EducaAPI**.

---

## 1. Estabilização e Segurança do Back-End (Fases 1, 2 e 2.1)

| Documento | Descrição |
| :--- | :--- |
| [ESTABILIZACAO_BACKEND.md](ESTABILIZACAO_BACKEND.md) | Relatório da Fase 1 de estabilização do Back-End, aplicação da migration inicial `20261104000000_init`, seed idempotente e validação dos endpoints. |
| [AUDITORIA_BACKEND.md](AUDITORIA_BACKEND.md) | Auditoria técnica inicial da arquitetura, rotas, serviços, repositórios e modelo de dados do Back-End. |
| [RELATORIO_CORRECOES_SEGURANCA_BACKEND.md](RELATORIO_CORRECOES_SEGURANCA_BACKEND.md) | Implementação das correções de RBAC, isolamento horizontal de dados por perfil (`ADMIN`, `PROFESSOR`, `ALUNO`) e proteção do cadastro de usuários. |
| [RELATORIO_COBERTURA_TESTES_SEGURANCA.md](RELATORIO_COBERTURA_TESTES_SEGURANCA.md) | Expansão da suíte de testes automatizados de negócio e segurança em `tests/business.test.ts`. |
| [RELATORIO_AUDITORIA_COMPLEMENTAR_TESTES.md](RELATORIO_AUDITORIA_COMPLEMENTAR_TESTES.md) | Auditoria complementar de cobertura de testes e validação de regras críticas. |
| [RELATORIO_FASE_2_1_REFORCO_SEGURANCA.md](RELATORIO_FASE_2_1_REFORCO_SEGURANCA.md) | Reforço adicional de segurança (Fase 2.1): revalidação de privilégios JWT contra o banco em tempo real e atomicidade transacional na criação integrada de perfis. |
| [AUDITORIA_SEGURANCA_INTEGRACAO_FRONTEND.md](AUDITORIA_SEGURANCA_INTEGRACAO_FRONTEND.md) | Verificação de segurança e prontidão dos contratos da API antes do início do desenvolvimento do Front-End. |

---

## 2. Planejamento e Implementação do Front-End (Fases 3.1 a 3.3.4.1)

| Documento | Descrição |
| :--- | :--- |
| [PLANEJAMENTO_FRONTEND.md](PLANEJAMENTO_FRONTEND.md) | Arquitetura planejada do Front-End React, Design System institucional e mapeamento de rotas por perfil. |
| [RELATORIO_FASE_3_1_PREPARACAO_FRONTEND.md](RELATORIO_FASE_3_1_PREPARACAO_FRONTEND.md) | Fase 3.1: Configuração da estrutura React + TypeScript + Vite + Tailwind CSS e camada de serviços HTTP. |
| [RELATORIO_FASE_3_2_IDENTIDADE_VISUAL_AUTENTICACAO.md](RELATORIO_FASE_3_2_IDENTIDADE_VISUAL_AUTENTICACAO.md) | Fase 3.2: Implementação do Design System institucional, fluxo de autenticação JWT e proteção de rotas. |
| [REVISAO_COMPLEMENTAR_SEGURANCA_FASE_3_2.md](REVISAO_COMPLEMENTAR_SEGURANCA_FASE_3_2.md) | Revisão de segurança da autenticação no Front-End e isolamento de variáveis auxiliares de desenvolvimento. |
| [RELATORIO_FASE_3_3_1_DASHBOARD.md](RELATORIO_FASE_3_3_1_DASHBOARD.md) | Fase 3.3.1: Implementação do Dashboard Institucional integrado aos endpoints reais da API. |
| [RELATORIO_FASE_3_3_2_ALUNOS_PROFESSORES_DISCIPLINAS.md](RELATORIO_FASE_3_3_2_ALUNOS_PROFESSORES_DISCIPLINAS.md) | Fase 3.3.2: Implementação dos módulos de Alunos, Professores e Disciplinas no Front-End. |
| [RELATORIO_FASE_3_3_3_TURMAS_MATRICULAS.md](RELATORIO_FASE_3_3_3_TURMAS_MATRICULAS.md) | Fase 3.3.3: Implementação dos módulos de Turmas e Matrículas com gestão de status cadastral. |
| [RELATORIO_FASE_3_3_4_CONTEUDOS_ATIVIDADES.md](RELATORIO_FASE_3_3_4_CONTEUDOS_ATIVIDADES.md) | Fase 3.3.4: Implementação dos módulos de Conteúdos Programáticos e Atividades Avaliativas. |
| [REVISAO_COMPLEMENTAR_SEGURANCA_FASE_3_3_4.md](REVISAO_COMPLEMENTAR_SEGURANCA_FASE_3_3_4.md) | Auditoria complementar de autorização de conteúdos e integridade acadêmica de atividades. |
| [AUDITORIA_REGRESSAO_EXCLUSOES_CASCADE.md](AUDITORIA_REGRESSAO_EXCLUSOES_CASCADE.md) | Auditoria das regras de exclusão e prevenção contra exclusões em cascata destrutivas. |
| [RELATORIO_FASE_3_3_4_1_CORRECOES_SEGURANCA_INTEGRIDADE.md](RELATORIO_FASE_3_3_4_1_CORRECOES_SEGURANCA_INTEGRIDADE.md) | Fase 3.3.4.1: Correções de autorização de conteúdos, validação de compatibilidade de disciplinas e travas de exclusão (`409 Conflict`). |

---

## 3. Módulos Acadêmicos Complementares e Estabilização Final (Fases 3.3.5 a 4.2.2)

Além dos relatórios acima, o código-fonte atual contempla:
- **Fase 3.3.5 — Notas e Boletim (`frontend/src/pages/grades/GradesPage.tsx`):** Gestão de notas para `ADMIN` e `PROFESSOR` e boletim individual por disciplina/atividade para `ALUNO`.
- **Fase 3.3.6 — Frequência Escolar (`frontend/src/pages/attendance/AttendancePage.tsx`):** Registro diário de chamada, edição de presença/falta e painel de assiduidade consolidado e individual.
- **Fase 3.3.7 — Indicadores ODS 4 (`frontend/src/pages/indicators/IndicatorsPage.tsx`):** Painel analítico com gráficos de desempenho, assiduidade e acompanhamento de estudantes em risco (`média < 6,0` ou `frequência < 75%`).
- **Fase 4.2.1 — Middleware Zod (`src/middlewares/validateMiddleware.ts`):** Atribuição de `req.body = schema.parse(req.body)` garantindo coerção de datas (`z.coerce.date()`), aplicação de defaults e sanitização `.strip()`.
- **Fase 4.2.2 — Integridade de Contas e Matrículas (`studentRepository.ts`, `teacherRepository.ts`, `enrollmentService.ts`):** Exclusão transacional de perfis sem histórico com remoção segura do `User` associado e proteção de matrículas com notas ou frequências (`409 ENROLLMENT_HAS_HISTORY`).

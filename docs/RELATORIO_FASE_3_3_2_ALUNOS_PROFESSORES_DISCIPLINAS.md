# RELATÓRIO TÉCNICO — FASE 3.3.2
## IMPLEMENTAÇÃO DOS MÓDULOS DE ALUNOS, PROFESSORES E DISCIPLINAS | EDUCAAPI

**Projeto:** EducaAPI — Plataforma de Gestão Educacional (ODS 4 — Educação de Qualidade)  
**Fase:** FASE 3.3.2 — Implementação dos Módulos de Alunos, Professores e Disciplinas  
**Status:** CONCLUÍDA E VALIDADA  
**Data:** 06/11/2026  

---

## 1. Objetivo da Fase

Implementar os três primeiros módulos cadastrais operacionais do Front-End da **EducaAPI** — **Alunos** (`/students`), **Professores** (`/teachers`) e **Disciplinas** (`/subjects`) — integrados de ponta a ponta à API REST (`http://localhost:3000/api`), aproveitando integralmente o Design System institucional, a arquitetura de autenticação JWT e o controle de acesso RBAC das fases anteriores, sem qualquer alteração no Back-End, no schema Prisma ou nos dados seed existentes.

---

## 2. Auditoria dos Contratos da API

Antes do início do desenvolvimento, foram auditados os seguintes arquivos reais do Back-End:
- Schemas Zod: [basicSchemas.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/schemas/basicSchemas.ts)
- Middleware de validação: [validateMiddleware.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/middlewares/validateMiddleware.ts)
- Rotas: [studentRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/studentRoutes.ts), [teacherRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/teacherRoutes.ts), [subjectRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/subjectRoutes.ts)
- Controllers: [studentController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/studentController.ts), [teacherController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/teacherController.ts), [subjectController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/subjectController.ts)
- Services: [studentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/studentService.ts), [teacherService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/teacherService.ts), [subjectService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/subjectService.ts)
- Repositories: [studentRepository.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/studentRepository.ts), [teacherRepository.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/teacherRepository.ts), [subjectRepository.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/subjectRepository.ts)
- Modelo relacional: [schema.prisma](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/prisma/schema.prisma)

### Descobertas Técnicas da Auditoria
1. **Duplo modo de criação em Alunos (`POST /api/students`) e Professores (`POST /api/teachers`):**
   - **Modo 1 — Criação Integrada Transacional (`password`):** Quando `password` (mín. 6 caracteres) é enviado no payload, `StudentService.create` / `TeacherService.create` valida unicidade do e-mail e executa `repository.createWithUser` dentro de `prisma.$transaction`, criando atomicamente o registro `User` com papel `ALUNO` ou `PROFESSOR` e o perfil acadêmico vinculado.
   - **Modo 2 — Vinculação de `userId` existente (`userId`):** Quando `userId` (UUID) é enviado, o serviço verifica se o usuário existe (`404 USER_NOT_FOUND`), se possui o `Role` compatível (`400 INCOMPATIBLE_USER_ROLE`) e se ainda não possui vínculo acadêmico (`409 DUPLICATE_USER_LINK`).
2. **Serialização de `birthDate` (`z.coerce.date()` sem reatribuição de `req.body`):**
   - O middleware `validateMiddleware.ts` executa `schema.parse(req.body)` para validar, mas não sobrescreve `req.body` com o retorno transformado pelo Zod. Como o Prisma exige formato ISO-8601 completo (`YYYY-MM-DDTHH:mm:ss.sssZ`) para colunas `DateTime`, o `studentService.ts` do Front-End normaliza `birthDate` sempre para `new Date(birthDate).toISOString()` antes de enviar `POST` ou `PUT`.
3. **Isolamento Horizontal do `ALUNO` em `/api/students`:**
   - Para `ADMIN` e `PROFESSOR`, `GET /api/students` retorna todos os alunos paginados. Para `ALUNO`, `StudentService.getAll` aplica `where: { userId: requester.id }` e `StudentService.getById` lança `403 FORBIDDEN` caso o ID pertença a outro estudante.
4. **Restrições de Integridade Referencial (`onDelete: Restrict`):**
   - `Class.teacher` e `Class.subject` possuem `onDelete: Restrict` no `schema.prisma`. Quando um administrador tenta excluir um professor ou disciplina que possui turmas associadas, o Front-End intercepta a rejeição e exibe orientação clara ao usuário.

---

## 3. Matriz de Endpoints e Permissões

| Módulo | Listar (`GET`) | Consultar (`GET /:id`) | Criar (`POST`) | Editar (`PUT /:id`) | Excluir (`DELETE /:id`) | Permissões |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Alunos** | `GET /api/students?page=1&limit=10` | `GET /api/students/:id` (+ `/api/indicators/students/:id/average` e `/attendance`) | `POST /api/students` (`name`, `email`, `registration`, `birthDate` ISO-8601, + `password` ou `userId`) | `PUT /api/students/:id` (`name?`, `email?`, `registration?`, `birthDate?`) | `DELETE /api/students/:id` (`204 No Content`) | **Leitura:** `ADMIN`, `PROFESSOR` (todos) e `ALUNO` (isolado ao próprio registro).<br>**Escrita (`POST`/`PUT`/`DELETE`):** Exclusivo `ADMIN`. |
| **Professores** | `GET /api/teachers?page=1&limit=10` | `GET /api/teachers/:id` | `POST /api/teachers` (`name`, `email`, `registration`, + `password` ou `userId`) | `PUT /api/teachers/:id` (`name?`, `email?`, `registration?`) | `DELETE /api/teachers/:id` (`204 No Content`) | **Leitura:** `ADMIN`, `PROFESSOR`, `ALUNO`.<br>**Escrita (`POST`/`PUT`/`DELETE`):** Exclusivo `ADMIN`. |
| **Disciplinas** | `GET /api/subjects?page=1&limit=10` | `GET /api/subjects/:id` | `POST /api/subjects` (`name`, `description?`, `workload`) | `PUT /api/subjects/:id` (`name?`, `description?`, `workload?`) | `DELETE /api/subjects/:id` (`204 No Content`) | **Leitura:** `ADMIN`, `PROFESSOR`, `ALUNO`.<br>**Escrita (`POST`/`PUT`/`DELETE`):** Exclusivo `ADMIN`. |

---

## 4. Funcionalidades Implementadas por Módulo

### 4.1. Módulo de Alunos (`/students` — `StudentsPage.tsx`)
- **Resumo numérico superior:** Total de alunos visíveis no escopo do perfil, página atual e filtro ativo.
- **Listagem responsiva:** Tabela institucional em desktop e cards adaptativos em dispositivos móveis (`md:hidden`), exibindo Nome, E-mail, Matrícula, Data de Nascimento, ID de Usuário vinculado (`UUID` truncado), Data de Cadastro e Ações.
- **Busca e Ordenação:** Busca em tempo real por nome, e-mail ou matrícula + seletor de ordenação (`Nome A-Z`, `Nome Z-A`, `Mais recentes`, `Matrícula`).
- **Paginação real:** Controle de página (`page`) e itens por página (`limit`: 5, 10, 20, 50) sincronizado com a API.
- **Modal de Detalhes do Aluno:** Consulta `GET /api/students/:id` em paralelo com `GET /api/indicators/students/:id/average` e `GET /api/indicators/students/:id/attendance`, apresentando dados cadastrais completos e indicadores reais de **Média Geral** e **Taxa de Presença**.
- **Modal de Criação (`ADMIN`):** Suporta alternância visual entre **Criação Integrada (Recomendado)** com senha inicial (`password`) e **Vincular `userId` existente** (`UUID`), com validação React Hook Form + Zod.
- **Modal de Edição (`ADMIN`):** Atualização de `name`, `email`, `registration` e `birthDate` via `PUT /api/students/:id`.
- **Diálogo de Exclusão (`ADMIN`):** Confirmação explícita em `ConfirmDialog` antes de disparar `DELETE /api/students/:id`.

### 4.2. Módulo de Professores (`/teachers` — `TeachersPage.tsx`)
- **Resumo numérico superior:** Total de docentes cadastrados, página atual e filtro ativo.
- **Listagem responsiva:** Tabela institucional em desktop e cards em mobile com Nome, E-mail, Registro Funcional (`registration`), ID de Usuário vinculado (`userId`), Data de Cadastro e Ações.
- **Busca, Ordenação e Paginação:** Filtro por nome, e-mail ou registro funcional, ordenação (`Nome A-Z`, `Nome Z-A`, `Mais recentes`, `Registro`) e paginação real.
- **Modal de Detalhes do Professor:** Consulta `GET /api/teachers/:id` exibindo metadados completos, vínculo `userId` e timestamps de auditoria.
- **Modal de Criação (`ADMIN`):** Suporta tanto criação transacional integrada (`password` criando conta `PROFESSOR` + `Teacher`) quanto vinculação de `userId` existente.
- **Modal de Edição (`ADMIN`):** Atualização de `name`, `email` e `registration` via `PUT /api/teachers/:id`.
- **Diálogo de Exclusão (`ADMIN`):** Confirmação modal com tratamento amigável caso o docente possua turmas ativas (`onDelete: Restrict`).

### 4.3. Módulo de Disciplinas (`/subjects` — `SubjectsPage.tsx`)
- **Resumo numérico superior:** Total de disciplinas, carga horária acumulada na página e carga horária média.
- **Listagem responsiva:** Tabela em desktop e cards em mobile com Nome, Descrição/Ementa, Carga Horária (`workload` em horas), Classificação pedagógica (`Extensão / Curta`, `Regular`, `Intensiva / Anual`), Data de Cadastro e Ações.
- **Busca, Filtro por Faixa de Carga Horária e Ordenação:** Busca por nome/descrição, filtro por faixa (`Todas`, `Até 40h`, `41h a 80h`, `Acima de 80h`) e ordenação (`Nome A-Z`, `Maior carga horária`, `Menor carga horária`, `Mais recentes`).
- **Modal de Detalhes da Disciplina:** Consulta `GET /api/subjects/:id` exibindo ementa completa, carga horária e metadados.
- **Modais de Criação e Edição (`ADMIN`):** Formulários validados com `name` (mín. 3 caracteres), `workload` (inteiro positivo) e `description` opcional.
- **Diálogo de Exclusão (`ADMIN`):** Confirmação modal com alerta sobre vínculo com turmas (`onDelete: Restrict`) e conteúdos (`onDelete: Cascade`).

---

## 5. Arquivos Criados

1. [studentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/services/studentService.ts) — Serviço tipado de comunicação com `/api/students` e indicadores individuais do aluno.
2. [teacherService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/services/teacherService.ts) — Serviço tipado de comunicação com `/api/teachers`.
3. [subjectService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/services/subjectService.ts) — Serviço tipado de comunicação com `/api/subjects`.
4. [SearchInput.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/components/ui/SearchInput.tsx) — Campo de busca reutilizável com ícone de lupa e botão de limpeza rápida.
5. [Pagination.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/components/ui/Pagination.tsx) — Barra de paginação institucional reutilizável com seletor de limite por página.
6. [ConfirmDialog.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/components/ui/ConfirmDialog.tsx) — Modal reutilizável de confirmação de ações destrutivas com suporte a estado de carregamento e alerta de erro.
7. [StudentsPage.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/pages/students/StudentsPage.tsx) — Página completa do módulo de Alunos.
8. [TeachersPage.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/pages/teachers/TeachersPage.tsx) — Página completa do módulo de Professores.
9. [SubjectsPage.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/pages/subjects/SubjectsPage.tsx) — Página completa do módulo de Disciplinas.
10. [RELATORIO_FASE_3_3_2_ALUNOS_PROFESSORES_DISCIPLINAS.md](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/docs/RELATORIO_FASE_3_3_2_ALUNOS_PROFESSORES_DISCIPLINAS.md) — Relatório técnico oficial da Fase 3.3.2.

---

## 6. Arquivos Modificados

1. [schemas/index.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/schemas/index.ts) — Adicionados schemas Zod `createStudentFormSchema`, `updateStudentFormSchema`, `createTeacherFormSchema`, `updateTeacherFormSchema` e `subjectFormSchema` alinhados com `src/schemas/basicSchemas.ts`.
2. [components/ui/index.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/components/ui/index.ts) — Exportados `SearchInput`, `Pagination` e `ConfirmDialog`.
3. [routes/AppRoutes.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/routes/AppRoutes.tsx) — Conectadas as rotas protegidas `/students`, `/teachers` e `/subjects`.
4. [components/layout/Sidebar.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/components/layout/Sidebar.tsx) — Ativados os itens de navegação `Alunos`, `Professores` e `Disciplinas` (`available: true`), mantendo os módulos de fases futuras sinalizados como `Em breve`.
5. [pages/dashboard/AdminDashboardView.tsx](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/frontend/src/pages/dashboard/AdminDashboardView.tsx) — Adicionados atalhos rápidos diretos para `/students`, `/teachers` e `/subjects` no painel administrativo.

---

## 7. Componentes Reutilizados

- `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Spinner`, `Skeleton`, `Alert`, `EmptyState` e `ErrorState` de `frontend/src/components/ui/`.
- `RoleGuard` (`frontend/src/components/auth/RoleGuard.tsx`) para ocultar botões administrativos (`Novo`, `Editar`, `Excluir`) para perfis `PROFESSOR` e `ALUNO`.
- `useAuth` (`frontend/src/contexts/AuthContext.tsx`) e `useToast` (`frontend/src/contexts/ToastContext.tsx`).
- Utilitários `formatDate`, `formatNumber`, `formatGrade`, `formatPercentage`, `truncateText` e `getApiErrorMessage` (`frontend/src/utils/formatters.ts`).

---

## 8. Formulários e Validações

Todos os formulários utilizam **React Hook Form + `@hookform/resolvers/zod`**:
- **`createStudentFormSchema` / `updateStudentFormSchema`:**
  - `name`: obrigatório, mínimo 3 caracteres.
  - `email`: obrigatório, formato de e-mail válido.
  - `registration`: obrigatório, mínimo 3 caracteres.
  - `birthDate`: obrigatório, data válida não futura.
  - `linkMode`: `'password'` (exige `password` com mín. 6 caracteres) ou `'existing'` (exige `userId` em formato UUID válido via `superRefine`).
- **`createTeacherFormSchema` / `updateTeacherFormSchema`:**
  - `name`: obrigatório, mínimo 3 caracteres.
  - `email`: obrigatório, formato de e-mail válido.
  - `registration`: obrigatório, mínimo 3 caracteres.
  - `linkMode`: `'password'` (mín. 6 caracteres) ou `'existing'` (UUID válido).
- **`subjectFormSchema`:**
  - `name`: obrigatório, mínimo 3 caracteres.
  - `workload`: número inteiro positivo (`>= 1` hora).
  - `description`: texto opcional.

---

## 9. Regras de Autorização

- **Controle na Interface (UX):** Botões de criação, edição e exclusão são encapsulados em `<RoleGuard allowedRoles={[Role.ADMIN]}>`. Perfis `PROFESSOR` e `ALUNO` visualizam um badge informativo de **Modo Leitura** e possuem acesso somente à listagem, busca, filtros e modal de detalhes.
- **Isolamento do `ALUNO`:** Na página `/students`, o perfil `ALUNO` visualiza um banner explicativo informando que a listagem exibe exclusivamente seu próprio registro acadêmico (garantido pelo Back-End).
- **Garantia no Back-End:** Todas as operações de escrita (`POST`, `PUT`, `DELETE`) exigem `authMiddleware` + `roleMiddleware([Role.ADMIN])` no servidor.

---

## 10. Integração com a API

- Gerenciamento de cache e sincronização via **TanStack Query (`useQuery`, `useMutation`, `queryClient.invalidateQueries`)**.
- Sempre que um aluno, professor ou disciplina é criado, editado ou removido, as queries do módulo (`['students']`, `['teachers']`, `['subjects']`) e do Dashboard (`['dashboard']`) são invalidadas automaticamente para manter os contadores institucionais sincronizados.

---

## 11. Testes Executados (22 Validações Obrigatórias)

| # | Validação | Resultado | Evidência Técnica |
| :--- | :--- | :--- | :--- |
| 1 | `npm run lint` | **APROVADO** | `tsc --noEmit` concluído com `0` erros (`exit code 0`). |
| 2 | `npm run build` | **APROVADO** | `tsc -b && vite build` concluído com `0` erros (`2339 modules transformed`). |
| 3 | Inicialização do Front-End | **APROVADO** | Vite ativo em `http://localhost:5173` (`HTTP 200` na raiz e nos módulos `StudentsPage`, `TeachersPage`, `SubjectsPage`). |
| 4 | Listagem de alunos | **APROVADO** | `GET /api/students?page=1&limit=100` (`ADMIN`) retornou `HTTP 200` com `2` alunos seed. |
| 5 | Cadastro de aluno | **APROVADO** | `POST /api/students` criou aluno temporário transacional (`HTTP 201 Created`). |
| 6 | Edição de aluno | **APROVADO** | `PUT /api/students/:id` atualizou o nome do aluno temporário (`HTTP 200 OK`). |
| 7 | Exclusão de aluno temporário | **APROVADO** | `DELETE /api/students/:id` removeu o registro temporário (`HTTP 204 No Content`), restaurando total inicial (`2`). |
| 8 | Listagem de professores | **APROVADO** | `GET /api/teachers?page=1&limit=100` (`ADMIN`) retornou `HTTP 200` com `1` professor seed. |
| 9 | Cadastro de professor | **APROVADO** | `POST /api/teachers` criou professor temporário transacional (`HTTP 201 Created`). |
| 10 | Edição de professor | **APROVADO** | `PUT /api/teachers/:id` atualizou o nome do professor temporário (`HTTP 200 OK`). |
| 11 | Exclusão de professor temporário | **APROVADO** | `DELETE /api/teachers/:id` removeu o registro temporário (`HTTP 204 No Content`), restaurando total inicial (`1`). |
| 12 | Listagem de disciplinas | **APROVADO** | `GET /api/subjects?page=1&limit=100` (`ADMIN`) retornou `HTTP 200` com `1` disciplina seed. |
| 13 | Cadastro de disciplina | **APROVADO** | `POST /api/subjects` criou disciplina temporária de `60h` (`HTTP 201 Created`). |
| 14 | Edição de disciplina | **APROVADO** | `PUT /api/subjects/:id` atualizou carga horária para `80h` (`HTTP 200 OK`). |
| 15 | Exclusão de disciplina temporária | **APROVADO** | `DELETE /api/subjects/:id` removeu a disciplina temporária (`HTTP 204 No Content`), restaurando total inicial (`1`). |
| 16 | Validação de formulários | **APROVADO** | Schemas Zod bloqueiam campos vazios, nomes `< 3` caracteres, carga horária `<= 0` e senhas `< 6` caracteres. |
| 17 | Tratamento de erros da API | **APROVADO** | Testados `400 VALIDATION_ERROR` e `409 DUPLICATE_RECORD` com extração amigável via `getApiErrorMessage`. |
| 18 | Tratamento de `401` e `403` | **APROVADO** | Requisição sem token retornou `401`; tentativas de escrita por `PROFESSOR` e `ALUNO` retornaram `403`. |
| 19 | Teste de acesso com `ADMIN` | **APROVADO** | Acesso completo de leitura e escrita (`POST`, `PUT`, `DELETE`) nos 3 módulos. |
| 20 | Teste de acesso com `PROFESSOR` | **APROVADO** | Leitura permitida (`200`), escrita bloqueada na UI (`RoleGuard`) e na API (`403 Forbidden`). |
| 21 | Teste de acesso com `ALUNO` | **APROVADO** | Leitura isolada em `/api/students` (`1` registro próprio retornado), leitura de professores/disciplinas (`200`) e escrita bloqueada (`403`). |
| 22 | Responsividade | **APROVADO** | Tabelas em `hidden md:block`, cards responsivos em `md:hidden`, barras de filtro empilháveis e modais adaptativos. |

---

## 12. Resultados do Lint e Build

- **`npm run lint` (`tsc --noEmit`):** `0` erros e `0` avisos.
- **`npm run build` (`tsc -b && vite build`):** `2339` módulos transformados com sucesso em `dist/`.

---

## 13. Responsividade

- **Mobile (`< 768px`):** Listagens renderizadas em cartões verticais (`md:hidden`) com badges, metadados estruturados e botões de ação com toque confortável; filtros empilhados em coluna única.
- **Tablet e Desktop (`>= 768px`):** Tabelas institucionais (`hidden md:block`) com cabeçalhos fixos, truncamento seguro de textos longos e barra de paginação horizontal.

---

## 14. Limitações Encontradas

1. **Busca textual e ordenação client-side sobre a página carregada:** Os endpoints `GET /api/students`, `GET /api/teachers` e `GET /api/subjects` aceitam apenas `page` e `limit` na query string (não possuem parâmetros de filtro textual no Back-End). Para permitir filtrar conjuntos maiores sem alterar o Back-End, o seletor de paginação oferece opções de até `50` registros por página.
2. **Exclusão de `Student` ou `Teacher` na API:** No Back-End (`studentRepository.delete` / `teacherRepository.delete`), o comando executado é `prisma.student.delete` / `prisma.teacher.delete`. Como `onDelete: Cascade` está configurado no sentido `User -> Student/Teacher`, a exclusão remove o perfil acadêmico mantendo o registro base na tabela `users`.

---

## 15. Pendências

- Nenhuma pendência para a Fase 3.3.2. Os módulos de Turmas, Matrículas, Conteúdos, Atividades, Notas e Frequência pertencem às próximas subfases planejadas (Fase 3.3.3 e seguintes).

---

## 16. Evidências

Saída consolidada da bateria de validação (`validate-phase-3-3-2.mjs`):

```text
=== BATERIA DE VALIDAÇÃO FASE 3.3.2 (22 ITENS) ===
[3] Vite Server & Módulos: root=200, StudentsPage=200, TeachersPage=200, SubjectsPage=200
[4] Listagem de Alunos (ADMIN): status=200, totalInicial=2
[5] Cadastro de Aluno Temporário (POST /api/students): status=201, registration=S-TMP-1793981746362
[6] Edição de Aluno Temporário (PUT /api/students/:id): status=200, nomeAtualizado="Aluno Temporario Fase 332 Editado"
[7] Exclusão do Aluno Temporário (DELETE /api/students/:id): status=204, totalRestaurado=2 (esperado=2)
[8] Listagem de Professores (ADMIN): status=200, totalInicial=1
[9] Cadastro de Professor Temporário (POST /api/teachers): status=201, registration=T-TMP-1793981746362
[10] Edição de Professor Temporário (PUT /api/teachers/:id): status=200, nomeAtualizado="Professor Temporario Fase 332 Editado"
[11] Exclusão do Professor Temporário (DELETE /api/teachers/:id): status=204, totalRestaurado=1 (esperado=1)
[12] Listagem de Disciplinas (ADMIN): status=200, totalInicial=1
[13] Cadastro de Disciplina Temporária (POST /api/subjects): status=201, workload=60h
[14] Edição de Disciplina Temporária (PUT /api/subjects/:id): status=200, workloadAtualizado=80h
[15] Exclusão da Disciplina Temporária (DELETE /api/subjects/:id): status=204, totalRestaurado=1 (esperado=1)
[16 & 17] Validação e Erro 400 da API (POST /api/subjects inválido): status=400, code=VALIDATION_ERROR
[17b] Tratamento de Duplicidade 409 (POST /api/students duplicado): status=409, code=DUPLICATE_RECORD
[18, 20 & 21] Autorização e Isolamento: semToken=401, professorPostSubject=403, alunoDeleteSubject=403, alunoListStudentsCount=1
=== TODOS OS TESTES AUTOMATIZADOS DA FASE 3.3.2 APROVADOS ===
```

---

## 17. Confirmação de Preservação do Back-End, Prisma e Banco de Dados

Confirma-se formalmente que:
- **Nenhum arquivo do Back-End (`src/`) foi modificado.**
- **O arquivo `prisma/schema.prisma` e as migrations permaneceram intactos.**
- **Todos os registros temporários criados durante os testes foram excluídos, preservando integralmente os registros originais do banco `educa_api`.**

# RELATÓRIO DE AUDITORIA TÉCNICA DO BACK-END — EDUCAAPI (SPRINT 2 / FASE 1)

**Data da Auditoria:** 04/11/2026  
**Escopo:** Inspeção estática completa do código-fonte, configuração, banco de dados (Prisma), segurança, documentação Swagger e execução real de build, lint, testes automatizados e verificação de infraestrutura local.  
**Regra de Preservação:** Nenhum arquivo do Back-End foi modificado durante esta auditoria.

---

## 1. Matriz Geral de Auditoria

| Funcionalidade | Status | Evidência | Problema identificado |
|---|---|---|---|
| **Estrutura de Diretórios (`src/`)** | PARCIALMENTE CONFORME | `src/controllers`, `src/services`, `src/repositories`, `src/routes`, `src/middlewares`, `src/schemas`, `src/docs`, `src/types` existem e seguem arquitetura em camadas. | As pastas `src/config` e `src/utils` estão vazias. Não há instância singleton do `PrismaClient` (há 12 instâncias separadas de `new PrismaClient()` espalhadas no código). |
| **Configuração & Dependências (`package.json`)** | NÃO CONFORME | Inspecionado `package.json` e executado `npm run build` e `npm run lint`. | 1) Conflito grave de versões: `@prisma/client: ^7.10.0` vs `prisma: ^5.19.1` (Cliente Prisma não gerado em `node_modules/.prisma/client`, quebrando o `tsc`).<br>2) `eslint: ^9.10.0` exige `eslint.config.js`, mas o projeto usa `.eslintrc.json` (legado v8), quebrando `npm run lint`.<br>3) Script `"seed"` não existe na seção `"scripts"` (embora citado no `README.md` como `npm run seed`). |
| **Controle de Versão (`.gitignore` / `.env`)** | NÃO CONFORME | Verificado via `Test-Path .gitignore` (`False`) e inspeção de `.env` e `.env.example`. | O arquivo `.gitignore` **não existe** no repositório. O arquivo `.env` está presente na raiz (com credenciais genéricas `usuario:senha`). |
| **Prisma Schema (`prisma/schema.prisma`)** | CONFORME | Inspecionado `prisma/schema.prisma` (176 linhas). | As 10 entidades (`User`, `Student`, `Teacher`, `Subject`, `Class`, `Enrollment`, `Content`, `Activity`, `Grade`, `Attendance`), enums (`Role`, `EnrollmentStatus`), PKs UUID, FKs e constraints únicas (`@@unique`) estão corretamente modeladas. |
| **Migrations (`prisma/migrations`)** | NÃO IMPLEMENTADO | Inspecionado diretório `prisma/`. | A pasta `prisma/migrations` não foi versionada/gerada no projeto (há apenas `schema.prisma` e `seed.ts`). |
| **Seed (`prisma/seed.ts`)** | PARCIALMENTE CONFORME | Inspecionado `prisma/seed.ts` (187 linhas). | O script é idempotente e cria Admin, Professor, 2 Alunos (Ana com média 8.75 e João com média 4.75), Disciplina, Turma, Matrículas, Conteúdo, Atividades, Notas e Frequências. Contudo, não pôde ser executado pois o Prisma Client não está gerado e o banco `educa_api` não está configurado com as credenciais do `.env`. |
| **Compilação TypeScript (`npm run build`)** | NÃO CONFORME | Executado `npm.cmd run build` (`tsc`). | Falha com 61 erros de compilação: ausência dos tipos gerados em `@prisma/client`, erro `TS18048` (`'req.user' is possibly 'undefined'` em `indicatorController.ts:14`) e falha ao copiar `src/docs/swagger.json` para `dist/docs/swagger.json`. |
| **Testes Automatizados (`npm test`)** | NÃO CONFORME | Executado `npm.cmd test` (`jest`). | A suíte `tests/business.test.ts` falha antes de rodar qualquer teste (`ReferenceError: Cannot access 'mockPrisma' before initialization` na linha 30 devido ao hoisting do `jest.mock` combinado com instanciação top-level do `PrismaClient` nos repositórios). Além disso, cobre apenas 4 dos 11 módulos. |
| **Auth: `POST /api/auth/register`** | PARCIALMENTE CONFORME | Inspecionado `authRoutes.ts`, `authSchema.ts`, `authController.ts`, `authService.ts`. | Registra `User` com hash `bcrypt` e valida duplicidade de e-mail (`409`). **Falha de Segurança:** permite enviar `"role": "ADMIN"` livremente em rota pública. **Lacuna de Fluxo:** cria apenas `User`, sem criar `Student`/`Teacher` vinculado. |
| **Auth: `POST /api/auth/login`** | CONFORME | Inspecionado `authService.ts` (linhas 30-53). | Valida e-mail e senha com `bcrypt.compare`, gera JWT com `{ id, role }` e expiração de `1d`, retornando `{ success: true, data: { token, user } }` sem expor a senha. |
| **Auth: `GET /api/auth/me`** | PARCIALMENTE CONFORME | Inspecionado `authController.ts` e `authService.ts` (linhas 55-63). | Protegido por `authMiddleware`. Retorna os dados de `User` (sem senha), porém não inclui o relacionamento `student` ou `teacher` (`studentId` / `teacherId`), exigindo busca adicional no Front-End para descobrir o ID de aluno/professor do usuário logado. |
| **Middlewares de Autenticação e RBAC** | CONFORME | Inspecionado `authMiddleware.ts` e `roleMiddleware.ts`. | Valida presença e formato `Bearer <token>`, verifica assinatura/expiração com `jwt.verify` (`401`) e restringe perfis não autorizados (`403 FORBIDDEN`). |
| **Módulo 2: Alunos (`/api/students`)** | PARCIALMENTE CONFORME | Inspecionado `studentRoutes.ts`, `studentController.ts`, `studentService.ts`, `studentRepository.ts`, `basicSchemas.ts`. | CRUD completo (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) com paginação e validação de duplicidade no `POST` (`409`). **Problemas:** 1) `POST /api/students` exige `userId` (UUID), mas não existe endpoint `GET /api/users` para listar usuários; 2) Não há filtro de pesquisa (`?search=`) no back-end; 3) `PUT` não trata conflito de e-mail/matrícula duplicada (gera 500). |
| **Módulo 3: Professores (`/api/teachers`)** | PARCIALMENTE CONFORME | Inspecionado `teacherRoutes.ts`, `teacherController.ts`, `teacherService.ts`, `teacherRepository.ts`, `basicSchemas.ts`. | CRUD completo com paginação e validação de duplicidade no `POST` (`409`). **Problemas:** 1) `POST /api/teachers` exige `userId` (UUID) sem endpoint de listagem de `users`; 2) `DELETE /:id` retorna erro `500` não tratado caso o professor possua turmas vinculadas (`onDelete: Restrict`). |
| **Módulo 4: Disciplinas (`/api/subjects`)** | PARCIALMENTE CONFORME | Inspecionado `subjectRoutes.ts`, `subjectController.ts`, `subjectService.ts`, `subjectRepository.ts`, `basicSchemas.ts`. | CRUD completo (`GET`, `POST`, `PUT`, `DELETE`) com paginação e validação Zod (`workload > 0`). **Problema:** `DELETE /:id` retorna erro `500` se houver turmas vinculadas (`onDelete: Restrict`). |
| **Módulo 5: Turmas (`/api/classes`)** | CONFORME | Inspecionado `classRoutes.ts`, `classController.ts`, `classService.ts`, `classRepository.ts`, `academicSchemas.ts`. | CRUD completo com paginação e `include: { teacher: true, subject: true }` nas listagens e busca por ID. Valida `year >= 2000` e `semester` (1 ou 2). |
| **Módulo 6: Matrículas (`/api/enrollments`)** | CONFORME | Inspecionado `enrollmentRoutes.ts`, `enrollmentController.ts`, `enrollmentService.ts`, `enrollmentRepository.ts`, `academicSchemas.ts`. | CRUD completo com paginação, `include: { student: true, class: true }`, prevenção de matrícula duplicada na mesma turma (`409 DUPLICATE_ENROLLMENT`) e atualização de `status` (`ACTIVE`, `INACTIVE`, `CANCELLED`, `COMPLETED`). |
| **Módulo 7: Conteúdos (`/api/contents`)** | CONFORME | Inspecionado `contentRoutes.ts`, `contentController.ts`, `contentService.ts`, `contentRepository.ts`, `contentSchemas.ts`. | CRUD completo com paginação, `include: { subject: true }`, escrita liberada para `ADMIN` e `PROFESSOR`. |
| **Módulo 8: Atividades (`/api/activities`)** | CONFORME | Inspecionado `activityRoutes.ts`, `activityController.ts`, `activityService.ts`, `activityRepository.ts`, `contentSchemas.ts`. | CRUD completo com paginação, `include: { content: true, class: true }`, validação de `dueDate` e `maxScore > 0`, escrita liberada para `ADMIN` e `PROFESSOR`. |
| **Módulo 9: Notas (`/api/grades`)** | CONFORME | Inspecionado `gradeRoutes.ts`, `gradeController.ts`, `gradeService.ts`, `gradeRepository.ts`, `evaluationSchemas.ts`. | CRUD completo com paginação, `include: { student: true, activity: true }`, validação de duplicidade (`409 DUPLICATE_GRADE`) e validação de regra de negócio `score <= activity.maxScore` (`400 INVALID_SCORE`) tanto no `POST` quanto no `PUT`. |
| **Módulo 10: Frequência (`/api/attendance`)** | CONFORME | Inspecionado `attendanceRoutes.ts`, `attendanceController.ts`, `attendanceService.ts`, `attendanceRepository.ts`, `evaluationSchemas.ts`. | CRUD completo com paginação, `include: { student: true, class: true }`, normalização de data (`setUTCHours(0,0,0,0)`) e validação de duplicidade no mesmo dia (`409 DUPLICATE_ATTENDANCE`). |
| **Indicador: Média Individual (`GET /api/indicators/students/:id/average`)** | CONFORME | Inspecionado `indicatorRoutes.ts`, `indicatorController.ts`, `indicatorService.ts`. | Calcula média aritmética real das notas do aluno com arredondamento de 2 casas decimais e protege o acesso para que um `ALUNO` só consulte o próprio boletim (`checkStudentAccess`). |
| **Indicador: Frequência Individual (`GET /api/indicators/students/:id/attendance`)** | CONFORME | Inspecionado `indicatorRoutes.ts`, `indicatorController.ts`, `indicatorService.ts`. | Calcula `totalClasses`, `present`, `absent` e `attendancePercentage` real com 2 casas decimais e proteção `checkStudentAccess`. |
| **Indicador: Baixo Desempenho (`GET /api/indicators/low-performance`)** | CONFORME | Inspecionado `indicatorRoutes.ts`, `indicatorController.ts`, `indicatorService.ts`. | Identifica alunos com notas cuja média seja `< 6.0`, retornando `[{ studentId, name, average }]`. Restrito a `ADMIN` e `PROFESSOR`. |
| **Indicador: Dashboard (`GET /api/indicators/dashboard`)** | PARCIALMENTE CONFORME | Inspecionado `indicatorRoutes.ts`, `indicatorController.ts`, `indicatorService.ts`. | Retorna contagens reais (`totalStudents`, `totalTeachers`, `totalClasses`, `totalSubjects`), `generalAverage`, `generalAttendancePercentage` e `lowPerformanceCount`. **Observação:** Rota bloqueada para perfil `ALUNO` (`403 FORBIDDEN`) e não retorna séries históricas/distribuições prontas para gráficos (exigindo composição com os endpoints de listagem ou visão específica para aluno). |
| **Documentação Swagger (`/api-docs`)** | PARCIALMENTE CONFORME | Inspecionado `src/docs/swagger.json` (262 linhas) e `src/app.ts`. | Todos os 47 endpoints de `/api/*` estão listados, porém a maioria dos `POST` possui `schema: { type: "object" }` vazio, os `PUT` não documentam `requestBody`, falta paginação na documentação de 7 módulos e falta o endpoint `/health`. |
| **Execução HTTP em Tempo Real (End-to-End)** | NÃO FOI POSSÍVEL TESTAR | Testadas portas `3000` (`False`) e `5432` (`True`), `node_modules/.prisma/client` (`False`). | Como a regra da Fase 1 proíbe modificar o Back-End antes da aprovação e o `@prisma/client` está quebrado por incompatibilidade de versão no `package.json` (`^7.10.0` vs `^5.19.1`), o servidor Express não pode ser iniciado sem antes corrigir o Prisma Client e sincronizar o banco. |

---

## 2. Detalhamento dos Pontos da Auditoria

### 2.1. Funcionalidades Aprovadas (Implementação Lógica Conforme)
1. **Modelagem de Dados (`prisma/schema.prisma`)**: Todas as 10 entidades do domínio acadêmico e seus relacionamentos estão bem estruturados, com constraints de unicidade para matrículas (`[studentId, classId]`), notas (`[studentId, activityId]`) e frequência diária (`[studentId, classId, date]`).
2. **Padronização de Respostas HTTP**: Todos os controllers retornam o envelope `{ success: true, data: ... }` (com `pagination: { page, limit, total, totalPages }` nas listagens) e `{ success: false, error: { message, code } }` nos erros.
3. **Validação de Entrada com Zod (`validateMiddleware.ts`)**: Todos os endpoints `POST` e `PUT` validam o payload antes de chegar aos controllers, retornando `400 VALIDATION_ERROR` com os detalhes do Zod.
4. **Regras de Negócio de Avaliação e Frequência**:
   - Bloqueio de nota acima do `maxScore` da atividade (`400 INVALID_SCORE`) tanto na criação quanto na edição.
   - Bloqueio de nota duplicada para o mesmo aluno e atividade (`409 DUPLICATE_GRADE`).
   - Normalização de data para `00:00:00 UTC` e bloqueio de dupla chamada no mesmo dia (`409 DUPLICATE_ATTENDANCE`).
   - Bloqueio de matrícula duplicada do mesmo aluno na mesma turma (`409 DUPLICATE_ENROLLMENT`).
5. **Cálculos Matemáticos dos Indicadores (`indicatorService.ts`)**: Todos os cálculos (média aritmética individual, percentual de presença, contagem de faltas, filtragem de alunos com média `< 6.0` e agregações do dashboard) estão implementados com consultas reais ao banco via Prisma.

---

### 2.2. Funcionalidades Incompletas
1. **Pesquisa e Filtros nas Listagens (`GET`)**:
   - Os endpoints `GET /api/students`, `/teachers`, `/subjects`, `/classes`, `/enrollments`, `/contents`, `/activities`, `/grades` e `/attendance` aceitam **apenas** `?page=` e `?limit=`.
   - Não há suporte a query params de busca textual (`?search=`) nem filtros relacionais no back-end (ex.: filtrar notas por `studentId`, atividades por `classId`, conteúdos por `subjectId`).
2. **Ausência de Endpoint ou Fluxo Integrado para `User` no Cadastro de Alunos e Professores**:
   - `POST /api/students` e `POST /api/teachers` exigem um `userId` (UUID válido da tabela `users`), mas não existe endpoint `GET /api/users` para selecionar usuários existentes, nem criação automática do `User` dentro de `StudentService.create` / `TeacherService.create`.
3. **Dados de Perfil em `/api/auth/me` e `/api/auth/login`**:
   - O retorno de usuário traz `{ id, name, email, role, createdAt, updatedAt }`, mas não inclui o `student` ou `teacher` associado (`student.id` / `teacher.id`).
4. **Ausência de `.gitignore` e `prisma/migrations`**:
   - Não há arquivo `.gitignore` na raiz do repositório e não há pasta `prisma/migrations`.

---

### 2.3. Erros Críticos (Impedem Build, Testes ou Execução do Back-End)
1. **[CRÍTICO 1] Incompatibilidade de Versão do Prisma (`@prisma/client@^7.10.0` vs `prisma@^5.19.1`) e Client Não Gerado**:
   - **Evidência**: `package.json` linha 15 (`"@prisma/client": "^7.10.0"`) e linha 43 (`"prisma": "^5.19.1"`). `Test-Path node_modules\.prisma\client` retornou `False`.
   - **Impacto**: O servidor não compila (`npm run build` falha com dezenas de erros `TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'`) e não inicia em desenvolvimento.
2. **[CRÍTICO 2] Falha Total da Suíte de Testes (`tests/business.test.ts`)**:
   - **Evidência**: Execução real de `npm test` falhou com `ReferenceError: Cannot access 'mockPrisma' before initialization` em `tests/business.test.ts:30`.
   - **Impacto**: `jest.mock('@prisma/client', ...)` sofre hoisting acima da declaração `const mockPrisma = ...`, e como os repositórios instanciam `new PrismaClient()` no carregamento do módulo, todos os testes quebram antes de iniciar.
3. **[CRÍTICO 3] Erro de Compilação Estrita em `src/controllers/indicatorController.ts`**:
   - **Evidência**: `src/controllers/indicatorController.ts(14,41): error TS18048: 'req.user' is possibly 'undefined'`.
   - **Impacto**: Impede a conclusão do `npm run build` (`tsc`) mesmo após gerar o Prisma Client.
4. **[CRÍTICO 4] Quebra no Boot de Produção (`dist/docs/swagger.json` ausente)**:
   - **Evidência**: `src/app.ts:22` lê `path.resolve(__dirname, './docs/swagger.json')` de forma síncrona no boot, mas o script `"build": "tsc"` não copia arquivos `.json` para `dist/docs/`.
   - **Impacto**: `npm start` (`node dist/server.js`) e o container Docker quebram ao iniciar com erro `ENOENT`.

---

### 2.4. Erros Importantes
1. **Quebra do comando `npm run lint`**:
   - **Evidência**: `ESLint: 9.39.5 - ESLint couldn't find an eslint.config.(js|mjs|cjs) file.`
   - **Causa**: ESLint v9 não lê `.eslintrc.json` por padrão sem flag ou migração para Flat Config.
2. **Múltiplas Instâncias de `PrismaClient` (12 conexões independentes)**:
   - **Evidência**: Cada repositório (`src/repositories/*.ts`), `indicatorService.ts` e `indicatorController.ts` executa `const prisma = new PrismaClient()`.
   - **Impacto**: Degradação de performance e risco de esgotar o limite de conexões do PostgreSQL (`Too many clients`).
3. **Erros de Chave Estrangeira / Unicidade no Prisma Retornando `500 INTERNAL_ERROR`**:
   - **Evidência**: Deletar um `Teacher` ou `Subject` que possui `Class` vinculada (`onDelete: Restrict`), ou criar `Class`/`Content`/`Activity`/`Grade`/`Attendance` com um UUID inexistente de FK, ou atualizar `Student`/`Teacher` com e-mail/matrícula já usada por outro registro, dispara exceções do Prisma (`P2002`, `P2003`) que não possuem `error.status`, caindo no `catch` dos controllers como `500 INTERNAL_ERROR`.
4. **Script `npm run seed` ausente no `package.json`**:
   - O `README.md` orienta executar `npm run seed`, mas o script não foi declarado em `"scripts"` no `package.json`.

---

### 2.5. Divergências entre Swagger (`src/docs/swagger.json`) e Implementação Real
1. **Rota não documentada**: `GET /health` existe em `src/app.ts`, mas não está documentada no `swagger.json`.
2. **Payloads (`requestBody`) omitidos ou genéricos no Swagger**:
   - Nos endpoints `POST` de `teachers`, `subjects`, `classes`, `enrollments`, `contents`, `activities`, `grades` e `attendance`, o Swagger define apenas `"schema": { "type": "object" }` sem listar os campos obrigatórios exigidos pelos schemas Zod.
   - Em **todos** os endpoints `PUT` (`students`, `teachers`, `subjects`, `classes`, `enrollments`, `contents`, `activities`, `grades`, `attendance`), o campo `requestBody` foi omitido no `swagger.json` (impossibilitando testar `PUT` pelo botão *Try it out* do Swagger UI!).
3. **Parâmetros de Paginação Omitidos**:
   - Os query params `page` e `limit` estão documentados apenas em `GET /api/students` e `GET /api/teachers`, embora sejam suportados em todas as 9 rotas de listagem.

---

### 2.6. Problemas de Segurança
1. **Escalação de Privilégio em `POST /api/auth/register` (Alta Gravidade)**:
   - Qualquer usuário anônimo pode enviar `{ "name": "...", "email": "...", "password": "...", "role": "ADMIN" }` para `/api/auth/register` e criar uma conta de Administrador.
2. **Exposição de Dados Acadêmicos entre Alunos (Privacidade / LGPD)**:
   - As rotas `GET /api/students`, `GET /api/grades`, `GET /api/attendance` e `GET /api/enrollments` permitem que um usuário com perfil `ALUNO` liste todas as notas, faltas e matrículas de todos os demais alunos da instituição.
3. **CORS Totalmente Aberto (`app.use(cors())`)**:
   - Aceita requisições de qualquer origem (adequado para desenvolvimento local, mas recomendável permitir configuração via `CORS_ORIGIN` no `.env`).

---

### 2.7. Problemas que Podem Impedir ou Prejudicar a Integração Front-End × Back-End
1. **Servidor Back-End incapaz de rodar sem alinhamento do Prisma Client**:
   - Enquanto `@prisma/client` estiver na versão `^7.10.0` e `prisma` na `^5.19.1` (sem cliente gerado e sem banco migrado/populado), o Back-End não responde a nenhuma requisição do Front-End.
2. **Fluxo de Cadastro de Aluno (`POST /api/students`) e Professor (`POST /api/teachers`) exige `userId`**:
   - Como o schema `createStudentSchema` e `createTeacherSchema` exige `userId: z.string().uuid()`, para que o formulário de cadastro de Aluno/Professor funcione no Front-End sem alterar o contrato do Back-End (ou com ajuste mínimo), há dois caminhos:
     - **Alternativa A (Sem alterar rotas do Back-End)**: No Front-End, ao cadastrar um novo Aluno ou Professor, o `studentService` / `teacherService` primeiro chama `POST /api/auth/register` (criando a conta de acesso `User` com `role: 'ALUNO'` ou `'PROFESSOR'` e senha inicial definida no formulário) para obter o `user.id` recém-criado e, em seguida, chama `POST /api/students` ou `POST /api/teachers` passando esse `userId`.
     - **Alternativa B (Pequeno aprimoramento opcional no Back-End)**: Permitir que `StudentService.create` e `TeacherService.create` aceitem `userId` opcional (criando automaticamente o `User` caso `userId` não seja enviado) e/ou expor `GET /api/users`.
3. **Dashboard para o Perfil `ALUNO` (`403 FORBIDDEN` em `GET /api/indicators/dashboard`)**:
   - Como `GET /api/indicators/dashboard` permite apenas `ADMIN` e `PROFESSOR`, quando um `ALUNO` fizer login e acessar o Dashboard, o Front-End não deve chamar `/api/indicators/dashboard` (que retornaria `403`), mas sim identificar o registro do aluno logado e exibir o **Dashboard do Aluno** consumindo `/api/indicators/students/:id/average`, `/api/indicators/students/:id/attendance`, suas turmas, atividades, notas e frequência.
4. **Gráficos do Dashboard e Paginação (`limit=10` padrão)**:
   - O endpoint `GET /api/indicators/dashboard` retorna apenas contadores escalares (`totalStudents`, `generalAverage`, etc.), enquanto as listagens retornam páginas de 10 itens por padrão (`?page=1&limit=10`). Para alimentar gráficos reais (como distribuição de desempenho, comparativo de notas e visão geral das atividades) e selects de formulários sem inventar dados, o Front-End deverá requisitar os endpoints reais (`/api/indicators/low-performance`, `/api/grades?limit=100`, `/api/activities?limit=100`, `/api/attendance?limit=100`) e tratar adequadamente estados vazios quando não houver registros.

---

### 2.8. Recomendações e Plano de Correção (Aguardando Aprovação)

Para viabilizar a execução real do Back-End e a integração 100% funcional na Sprint 2, respeitando a **Regra Fundamental de Preservar o Back-End** (sem alterar rotas existentes, sem mudar tecnologias e sem quebrar contratos), propomos o seguinte **Plano de Correção Cirúrgica**:

1. **Alinhar versão do `@prisma/client` com `prisma` (`^5.19.1`) no `package.json` e gerar o Prisma Client (`npx prisma generate`)**:
   - Resolve os 58 erros de importação do `@prisma/client` no TypeScript e permite iniciar o servidor.
2. **Configurar e sincronizar o banco PostgreSQL local + executar o Seed (`prisma/seed.ts`)**:
   - Sincronizar o schema (`npx prisma db push` ou `npx prisma migrate dev --name init`) e popular o banco com os dados reais do `seed.ts` (Admin, Prof. Carlos, Alunos Ana e João, Disciplina, Turma, Matrículas, Conteúdo, Atividades, Notas e Frequências). Adicionar `"seed": "ts-node prisma/seed.ts"` em `"scripts"` no `package.json`.
3. **Corrigir o erro de compilação TypeScript em `src/controllers/indicatorController.ts` (linha 14)**:
   - Usar `req.user?.id` (ou guardar `const currentUser = req.user`) em `checkStudentAccess` para eliminar o erro `TS18048` no `npm run build`, e garantir cópia de `src/docs/swagger.json` no script de build.
4. **Corrigir o mock em `tests/business.test.ts`**:
   - Renomear `mockPrisma` (ou defini-lo dentro de `jest.mock`) para respeitar as regras de hoisting do Jest e fazer a suíte de testes unitários passar (`100% PASS`).
5. **Criar o arquivo `.gitignore` na raiz do projeto**:
   - Ignorando `node_modules/`, `.env`, `dist/`, `coverage/`.
6. **Completar os schemas de `requestBody` (POST/PUT) e parâmetros no `src/docs/swagger.json`**:
   - Garantir que o Swagger reflita fielmente 100% dos schemas Zod implementados e inclua `/health`.

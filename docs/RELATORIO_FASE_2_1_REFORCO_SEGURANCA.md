# RELATÓRIO DA FASE 2.1 — REFORÇO FINAL DE SEGURANÇA DO BACK-END (OPÇÃO B)

**Data:** 05/11/2026  
**Objetivo:** Execução das correções das duas lacunas de autorização identificadas na auditoria complementar e ampliação completa da cobertura de testes automatizados em `tests/business.test.ts`.

---

## 1. Arquivos Modificados

1. [`src/middlewares/authMiddleware.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/middlewares/authMiddleware.ts): Revalidação assíncrona do usuário no banco (`userRepository.findById(decoded.id)`) após `jwt.verify`, rejeitando usuários inexistentes (`401 UNAUTHORIZED`) e atribuindo sempre o `role` atual do banco a `req.user`.
2. [`src/services/authService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/authService.ts): Revalidação no banco do usuário solicitante (`userRepository.findById(requester.id)`) em `AuthService.register`, garantindo que apenas um `ADMIN` atualmente ativo e autorizado no banco possa criar contas `ADMIN` ou `PROFESSOR`.
3. [`src/repositories/classRepository.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/classRepository.ts): Inclusão de `enrollments: { include: { student: true } }` em `ClassRepository.findById`.
4. [`src/services/classService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/classService.ts): Validação em `ClassService.getById` exigindo matrícula ativa (`status === 'ACTIVE'`) quando `requester.role === Role.ALUNO`, bloqueando o acesso a turmas alheias com `403 FORBIDDEN`.
5. [`tests/business.test.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/tests/business.test.ts): Ampliação de 19 para **31 testes automatizados** cobrindo todos os cenários de privilégios, revalidação de JWT após mudança de papel no banco, isolamento de `ALUNO` (`getAll` e `getById` nos 6 módulos), isolamento de `PROFESSOR` (`getAll`, `getById`, `create`, `update`, `delete` e `IndicatorController`), validação de matrícula ativa, integridade de vínculos em `Student`/`Teacher`, criação integrada com `password` e *rollback* transacional (`prisma.$transaction`).

---

## 2. Descrição Técnica das Duas Correções de Autorização

### 2.1. Revalidação do JWT e do Papel Atual do Usuário no Banco
- **Vulnerabilidade anterior:** `authMiddleware` confiava apenas no payload decodificado do JWT (`decoded.role`), permitindo que um usuário cujo papel fosse alterado no banco (ex.: `ADMIN` rebaixado para `ALUNO`) continuasse executando operações administrativas enquanto o token antigo não expirasse.
- **Como foi corrigida:**
  - Em [`src/middlewares/authMiddleware.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/middlewares/authMiddleware.ts#L24-L35), após `jwt.verify`, o middleware consulta `const currentUser = await userRepository.findById(decoded.id)`. Se `!currentUser`, retorna `401 UNAUTHORIZED`. Caso exista, define `req.user = { id: currentUser.id, role: currentUser.role }` com o papel atual persistido no PostgreSQL.
  - Em [`src/services/authService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/authService.ts#L17-L31), `AuthService.register` também consulta `userRepository.findById(requester.id)` e utiliza `dbRequester.role` para validar se o requisitante possui efetivamente perfil `ADMIN`.

### 2.2. Isolamento de Turmas (`Classes`) em `ClassService.getById` para `ALUNO`
- **Vulnerabilidade anterior:** `ClassService.getById` validava o vínculo apenas para `PROFESSOR`, permitindo que um `ALUNO` consultasse por ID os detalhes de uma turma na qual não possuía matrícula ativa.
- **Como foi corrigida:**
  - Em [`src/services/classService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/classService.ts#L28-L35), quando `requester?.role === Role.ALUNO`, verifica-se `classEntity.enrollments?.some((e) => e.student?.userId === requester.id && e.status === 'ACTIVE')`. Caso falso, lança `{ status: 403, message: 'Acesso negado. Você só pode consultar turmas nas quais possua matrícula ativa.', code: 'FORBIDDEN' }`.

---

## 3. Resultados das Validações Obrigatórias

- **`npx.cmd prisma validate`**: Schema `prisma/schema.prisma` válido (preservado integralmente, sem novas migrations).
- **`npm.cmd test`**: **31 testes aprovados**, **0 reprovados**, **0 não executados** (`Test Suites: 1 passed, 1 total | Tests: 31 passed, 31 total`).
- **`npm.cmd run build`**: Compilação TypeScript (`tsc`) concluída com **0 erros**.
- **`npm.cmd run lint`**: ESLint concluído com **0 erros** e **61 warnings** pré-existentes (`@typescript-eslint/no-explicit-any` nos blocos `catch (error: any)` dos controllers e imports de tipos Prisma nos repositories).
- **Problemas não corrigidos / Limitações:** Nenhum problema de segurança ou de cobertura pendente.

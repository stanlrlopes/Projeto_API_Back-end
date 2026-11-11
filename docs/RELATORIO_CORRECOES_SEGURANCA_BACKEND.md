# RELATÓRIO DE CORREÇÕES DE SEGURANÇA DO BACK-END — EDUCAAPI

**Data Inicial:** 04/11/2026  
**Atualização Pós-Reforço Final (Fase 2.1 / Opção B):** 05/11/2026  
**Escopo:** Consolidação de todas as correções de segurança do Back-End (Opção A + Opção B / Fase 2.1) e ampliação completa da suíte de testes automatizados antes do início da Fase 3 (Configuração do Front-End).  
**Banco de Dados / Schema:** Nenhuma tabela ou registro foi removido e `prisma/schema.prisma` foi 100% preservado sem novas migrations.

---

## 1. Vulnerabilidades Corrigidas

### 1.1. Cadastro Público, Criação Administrativa e Revalidação de Privilégios JWT
- **Arquivos:**
  - [`src/middlewares/authMiddleware.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/middlewares/authMiddleware.ts#L8-L38)
  - [`src/controllers/authController.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/authController.ts#L9-L34)
  - [`src/services/authService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/authService.ts#L11-L52)
- **Correções:**
  1. Visitantes anônimos em `POST /api/auth/register` criam exclusivamente usuários `ALUNO`; tentativas de informar `role: "ADMIN"` ou `"PROFESSOR"` sem autorização são bloqueadas com `403 FORBIDDEN`.
  2. Tanto `authMiddleware` quanto `AuthService.register` consultam o usuário no banco (`userRepository.findById`) após validar o JWT, garantindo que o usuário ainda exista (`401 UNAUTHORIZED` caso removido) e utilizando sempre o `role` **atual do banco de dados** (impedindo uso de JWT antigo após perda de privilégio administrativo).

### 1.2. Integridade dos Vínculos (`Student` e `Teacher`) e Criação Transacional (`prisma.$transaction`)
- **Arquivos:**
  - [`src/schemas/basicSchemas.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/schemas/basicSchemas.ts#L3-L21)
  - [`src/repositories/studentRepository.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/studentRepository.ts#L26-L39)
  - [`src/repositories/teacherRepository.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/teacherRepository.ts#L27-L40)
  - [`src/services/studentService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/studentService.ts#L35-L84)
  - [`src/services/teacherService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/teacherService.ts#L24-L71)
- **Correções:**
  1. Validação de existência do `userId` (`404 USER_NOT_FOUND`), compatibilidade estrita de papel (`400 INCOMPATIBLE_USER_ROLE`) e bloqueio de vínculo duplicado (`409 DUPLICATE_USER_LINK`) tanto para `Student` quanto para `Teacher`.
  2. Criação integrada e atômica de `User` + `Student`/`Teacher` via `prisma.$transaction` (`createWithUser`) quando `password` é informado, garantindo *rollback* automático sem usuários órfãos caso ocorra falha.

### 1.3. Isolamento Completo de Dados do `ALUNO` (Incluindo `Classes`)
- **Arquivos:**
  - [`src/services/studentService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/studentService.ts#L16-L33)
  - [`src/services/gradeService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/gradeService.ts#L14-L37)
  - [`src/services/attendanceService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/attendanceService.ts#L14-L37)
  - [`src/services/enrollmentService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/enrollmentService.ts#L10-L32)
  - [`src/services/activityService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/activityService.ts#L12-L52)
  - [`src/services/classService.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/classService.ts#L10-L36)
  - [`src/controllers/indicatorController.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/indicatorController.ts#L11-L37)
- **Correções:**
  - `getAll` e `getById` isolam estritamente os dados do próprio `ALUNO` em `Students`, `Grades`, `Attendance` e `Enrollments`, e restringem `Activities` e `Classes` exclusivamente às turmas em que o aluno possui matrícula ativa (`status === 'ACTIVE'`), bloqueando acessos indevidos com `403 FORBIDDEN`.

### 1.4. Isolamento Completo do `PROFESSOR` e Validação de Matrícula Ativa
- **Correções:**
  - Em `Classes`, `Enrollments`, `Activities`, `Grades`, `Attendance` e `Indicators`, o `PROFESSOR` só acessa e modifica registros vinculados às suas próprias turmas (`class.teacher.userId === req.user.id`), recebendo `403 FORBIDDEN` ao tentar acessar ou modificar dados de outro professor.
  - `GradeService.create` e `AttendanceService.create` exigem que o aluno possua matrícula ativa (`ACTIVE`) na turma (`400 STUDENT_NOT_ENROLLED`).

### 1.5. Sessão Autenticada (`studentId` e `teacherId`)
- `POST /api/auth/login` e `GET /api/auth/me` retornam `studentId` e `teacherId` junto aos dados do usuário autenticado.

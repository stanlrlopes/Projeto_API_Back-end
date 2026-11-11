# RELATÓRIO DE COBERTURA DE TESTES DE SEGURANÇA — EDUCAAPI (OPÇÃO B / FASE 2.1)

**Data:** 05/11/2026  
**Arquivo de Testes Auditado:** [`tests/business.test.ts`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/tests/business.test.ts)  
**Objetivo:** Comprovar a cobertura automatizada de todos os cenários de segurança, autorização (RBAC/IDOR), revalidação de JWT em banco, integridade transacional (`prisma.$transaction`) e paginação identificados na auditoria complementar.

---

## 1. Matriz de Cobertura por Cenário

| # | Bloco | Cenário Avaliado | Arquivo e Função de Produção | Teste Correspondente em `tests/business.test.ts` | Resultado |
|---|---|---|---|---|---|
| **1.1** | Cadastro e JWT | Cadastro público padrão como `ALUNO` | `AuthService.register` | `deve registrar usuário público como ALUNO por padrão` | **COBERTO E APROVADO** |
| **1.2** | Cadastro e JWT | Login expondo `studentId` e `teacherId` | `AuthService.login` | `deve realizar login e retornar studentId/teacherId na sessão` | **COBERTO E APROVADO** |
| **1.3** | Cadastro e JWT | Anônimo tentando criar `ADMIN` (`403`) | `AuthService.register` | `deve rejeitar tentativa de cadastro público como ADMIN (403 FORBIDDEN)` | **COBERTO E APROVADO** |
| **1.4** | Cadastro e JWT | Anônimo tentando criar `PROFESSOR` (`403`) | `AuthService.register` | `deve rejeitar tentativa de cadastro público como PROFESSOR (403 FORBIDDEN)` | **COBERTO E APROVADO** |
| **1.5** | Cadastro e JWT | `ADMIN` autenticado criando `PROFESSOR` (`201`) | `AuthController.register` / `AuthService.register` | `deve permitir que ADMIN autenticado crie usuário PROFESSOR (201)` | **COBERTO E APROVADO** |
| **1.6** | Cadastro e JWT | `ADMIN` autenticado criando `ADMIN` (`201`) | `AuthController.register` / `AuthService.register` | `deve permitir que ADMIN autenticado crie outro usuário ADMIN (201)` | **COBERTO E APROVADO** |
| **1.7** | Cadastro e JWT | Token inválido/expirado tentando criar conta privilegiada (`403`) | `AuthController.register` / `AuthService.register` | `deve rejeitar criação de ADMIN/PROFESSOR quando o token enviado no register é inválido ou expirado (403 FORBIDDEN)` | **COBERTO E APROVADO** |
| **1.8** | Cadastro e JWT | Token antigo após alteração de papel no banco (`ADMIN` $\rightarrow$ `ALUNO`) | `authMiddleware`, `roleMiddleware`, `AuthController.register`, `AuthService.register` | `deve bloquear criação privilegiada e acesso administrativo se o papel do usuário no banco foi alterado de ADMIN para ALUNO após emissão do JWT` | **COBERTO E APROVADO** |
| **1.9** | Cadastro e JWT | Usuário removido do banco após emissão do JWT (`401`) | `authMiddleware` | `deve rejeitar em authMiddleware quando o usuário do JWT foi removido do banco (401 UNAUTHORIZED)` | **COBERTO E APROVADO** |
| **1.10** | Cadastro e JWT | Bloqueio de acesso administrativo em `roleMiddleware` (`403`) e token expirado em `authMiddleware` (`401`) | `roleMiddleware`, `authMiddleware` | `deve bloquear acesso sem permissão a operações administrativas em roleMiddleware (403 FORBIDDEN)` e `deve rejeitar JWT inválido ou expirado com 401 INVALID_TOKEN` | **COBERTO E APROVADO** |
| **2.1** | Isolamento `ALUNO` | `Students` (`getAll` filtrado e `getById` próprio vs. terceiro `403`) | `StudentService.getAll`, `StudentService.getById` | `Students: getAll deve filtrar pelo userId do ALUNO e getById deve permitir o próprio e bloquear outro aluno (403)` | **COBERTO E APROVADO** |
| **2.2** | Isolamento `ALUNO` | `Grades` (`getAll` filtrado e `getById` próprio vs. terceiro `403`) | `GradeService.getAll`, `GradeService.getById` | `Grades: getAll deve filtrar pelas notas do ALUNO e getById deve permitir própria nota e bloquear a de outro aluno (403)` | **COBERTO E APROVADO** |
| **2.3** | Isolamento `ALUNO` | `Attendance` (`getAll` filtrado e `getById` próprio vs. terceiro `403`) | `AttendanceService.getAll`, `AttendanceService.getById` | `Attendance: getAll deve filtrar pelas frequências do ALUNO e getById deve permitir própria e bloquear a de outro aluno (403)` | **COBERTO E APROVADO** |
| **2.4** | Isolamento `ALUNO` | `Enrollments` (`getAll` filtrado e `getById` próprio vs. terceiro `403`) | `EnrollmentService.getAll`, `EnrollmentService.getById` | `Enrollments: getAll deve filtrar pelas matrículas do ALUNO e getById deve permitir própria e bloquear a de outro aluno (403)` | **COBERTO E APROVADO** |
| **2.5** | Isolamento `ALUNO` | `Activities` (`getAll` filtrado por matrícula `ACTIVE` e `getById` bloqueando turma sem matrícula ativa `403`) | `ActivityService.getAll`, `ActivityService.getById` | `Activities: getAll deve filtrar por turmas com matrícula ACTIVE e getById deve bloquear turma sem matrícula ativa (403)` | **COBERTO E APROVADO** |
| **2.6** | Isolamento `ALUNO` | `Classes` (`getAll` filtrado por matrícula `ACTIVE` e `getById` bloqueando turma sem matrícula ativa `403`) | `ClassService.getAll`, `ClassService.getById` | `Classes: getAll deve filtrar por turmas com matrícula ACTIVE e getById deve bloquear turma sem matrícula ativa do ALUNO (403)` | **COBERTO E APROVADO** |
| **3.1** | Isolamento `PROFESSOR` | `Classes` e `Enrollments` (`getAll` filtrado e `getById` bloqueando turma de outro professor `403`) | `ClassService`, `EnrollmentService` | `Classes e Enrollments: deve filtrar getAll pelas turmas do PROFESSOR e bloquear getById de turma de outro professor (403)` | **COBERTO E APROVADO** |
| **3.2** | Isolamento `PROFESSOR` | `Activities` (`getAll`, `getById`, `create`, `update`, transferência de `classId` e `delete`) | `ActivityService` | `Activities: deve isolar getAll, getById, create, update (incluindo troca de classId) e delete para turmas do próprio PROFESSOR` | **COBERTO E APROVADO** |
| **3.3** | Isolamento `PROFESSOR` | `Grades` (`getAll`, `getById`, `create`, `update` e `delete`) | `GradeService` | `Grades: deve isolar getAll, getById, create, update e delete para turmas do próprio PROFESSOR (403 para turma alheia)` | **COBERTO E APROVADO** |
| **3.4** | Isolamento `PROFESSOR` | `Attendance` (`getAll`, `getById`, `create`, `update` e `delete`) | `AttendanceService` | `Attendance: deve isolar getAll, getById, create, update e delete para turmas do próprio PROFESSOR (403 para turma alheia)` | **COBERTO E APROVADO** |
| **3.5** | Isolamento `PROFESSOR` | Validação de matrícula ativa (`400 STUDENT_NOT_ENROLLED`) e `maxScore` (`400 INVALID_SCORE`) | `GradeService.create`, `AttendanceService.create` | `Grade e Attendance: deve validar matrícula ativa (400 STUDENT_NOT_ENROLLED) e barrar nota acima de maxScore (400 INVALID_SCORE)` | **COBERTO E APROVADO** |
| **3.6** | Isolamento `PROFESSOR` / `ALUNO` | Indicadores individuais (`IndicatorController.getAverage` e `getAttendance`) | `IndicatorController.checkStudentAccess` | `Indicators Individuais (IndicatorController): deve isolar acesso de ALUNO e PROFESSOR com 403 FORBIDDEN` | **COBERTO E APROVADO** |
| **4.1** | Vínculos e Transação | `userId` inexistente (`404`), `role` incompatível (`400`) e vínculo duplicado (`409`) em `Student` e `Teacher` | `StudentService.create`, `TeacherService.create` | `deve rejeitar userId inexistente (404), role incompatível (400) e vínculo duplicado (409) tanto em Student quanto em Teacher` | **COBERTO E APROVADO** |
| **4.2** | Vínculos e Transação | Criação integrada com `password` e *rollback* atômico em `prisma.$transaction` sem deixar `User` órfão | `StudentRepository.createWithUser`, `TeacherRepository.createWithUser` | `deve realizar criação integrada com password e comprovar rollback atômico em prisma.$transaction sem deixar User órfão em caso de falha` | **COBERTO E APROVADO** |
| **5.1** | Paginação | Paginação de 250 registros distribuídos em 3 páginas (`100`, `100`, `50`) | `StudentService.getAll` | `deve paginar corretamente 250 registros distribuídos em 3 páginas (100, 100 e 50)` | **COBERTO E APROVADO** |

---

## 2. Lacunas Restantes

- **Nenhuma lacuna restante.** Todos os 23 subcenários apontados na auditoria complementar foram integralmente cobertos e validados na suíte automatizada (`tests/business.test.ts`).

# AUDITORIA DE REGRESSÃO E PROTEÇÃO CONTRA EXCLUSÕES EM CASCATA | EDUCAAPI

**Fase:** 3.3.4.1 — Correções de Segurança e Integridade Acadêmica  
**Escopo:** `prisma/schema.prisma`, Repositórios (`*Repository.ts`) e Serviços (`*Service.ts`)  
**Status:** Concluída e Protegida na Camada de Domínio (`HTTP 409 Conflict`)

---

## 1. Objetivo da Auditoria

Inspecionar integralmente todas as relações e políticas referenciais (`onDelete: Cascade` e `onDelete: Restrict`) definidas em [schema.prisma](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/prisma/schema.prisma), avaliando as consequências acadêmicas da exclusão física de cada entidade e implementando guardas explícitas de domínio na camada de serviço (`Service`) para impedir a destruição acidental de histórico escolar, notas, frequências, matrículas, turmas, atividades e conteúdos programáticos.

---

## 2. Mapeamento Integral das Relações no Prisma (`prisma/schema.prisma`)

| Entidade Pai | Entidade Filha | Campo de Chave Estrangeira | Política no `schema.prisma` | Consequência Acadêmica sem Guarda de Serviço | Proteção Implementada na Camada de Serviço (`FASE 3.3.4.1`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `User` | `Student` | `Student.userId` | `onDelete: Cascade` | Exclusão do usuário removeria o perfil do aluno | Fluxo controlado; exclusão de `Student` passa por `StudentService.delete` |
| `User` | `Teacher` | `Teacher.userId` | `onDelete: Cascade` | Exclusão do usuário removeria o perfil docente | Fluxo controlado; exclusão de `Teacher` passa por `TeacherService.delete` |
| `Student` | `Enrollment` | `Enrollment.studentId` | `onDelete: Cascade` | **Crítico:** excluir aluno apagaria histórico de matrículas (`ACTIVE`, `CANCELLED`, `COMPLETED`) | **Bloqueado (`409 STUDENT_HAS_HISTORY`)** em [`StudentService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/studentService.ts) |
| `Student` | `Grade` | `Grade.studentId` | `onDelete: Cascade` | **Crítico:** excluir aluno apagaria notas lançadas | **Bloqueado (`409 STUDENT_HAS_HISTORY`)** em [`StudentService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/studentService.ts) |
| `Student` | `Attendance` | `Attendance.studentId` | `onDelete: Cascade` | **Crítico:** excluir aluno apagaria registros de frequência | **Bloqueado (`409 STUDENT_HAS_HISTORY`)** em [`StudentService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/studentService.ts) |
| `Teacher` | `Class` | `Class.teacherId` | `onDelete: Restrict` | Erro bruto de chave estrangeira do Prisma (`P2003`) ao tentar excluir professor com turmas | **Bloqueado com erro semântico (`409 TEACHER_HAS_DEPENDENCIES`)** em [`TeacherService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/teacherService.ts) |
| `Subject` | `Class` | `Class.subjectId` | `onDelete: Restrict` | Erro bruto de chave estrangeira (`P2003`) ao excluir disciplina com turmas | **Bloqueado com erro semântico (`409 SUBJECT_HAS_DEPENDENCIES`)** em [`SubjectService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/subjectService.ts) |
| `Subject` | `Content` | `Content.subjectId` | `onDelete: Cascade` | **Crítico:** excluir disciplina apagaria conteúdos programáticos e, em cadeia, atividades e notas | **Bloqueado (`409 SUBJECT_HAS_DEPENDENCIES`)** em [`SubjectService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/subjectService.ts) |
| `Class` | `Enrollment` | `Enrollment.classId` | `onDelete: Cascade` | **Crítico:** excluir turma apagaria matrículas vinculadas | **Bloqueado (`409 CLASS_HAS_DEPENDENCIES`)** em [`ClassService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/classService.ts) |
| `Class` | `Activity` | `Activity.classId` | `onDelete: Cascade` | **Crítico:** excluir turma apagaria atividades e, em cascata, todas as notas (`Grade`) | **Bloqueado (`409 CLASS_HAS_DEPENDENCIES`)** em [`ClassService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/classService.ts) |
| `Class` | `Attendance` | `Attendance.classId` | `onDelete: Cascade` | **Crítico:** excluir turma apagaria diários de frequência | **Bloqueado (`409 CLASS_HAS_DEPENDENCIES`)** em [`ClassService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/classService.ts) |
| `Content` | `Activity` | `Activity.contentId` | `onDelete: Cascade` | **Crítico:** excluir conteúdo apagaria todas as atividades associadas e todas as notas (`Grade`) | **Bloqueado (`409 CONTENT_HAS_DEPENDENCIES`)** em [`ContentService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/contentService.ts) |
| `Activity` | `Grade` | `Grade.activityId` | `onDelete: Cascade` | **Crítico:** excluir atividade apagaria todas as notas já atribuídas aos alunos | **Bloqueado (`409 ACTIVITY_HAS_GRADES`)** em [`ActivityService.delete`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/activityService.ts) |

---

## 3. Detalhamento das Regras de Bloqueio Implementadas

### 3.1. Exclusão e Alteração Estrutural de Conteúdos (`ContentService`)
- **Arquivo:** [contentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/contentService.ts)
- **Regra de Exclusão (`delete`):** Verifica `existing.activities && existing.activities.length > 0`. Caso existam atividades vinculadas, lança `AppError('Não é possível excluir um conteúdo que possui atividades associadas.', 409, 'CONTENT_HAS_DEPENDENCIES')`.
- **Regra de Alteração de Disciplina (`update`):** Se `data.subjectId !== existing.subjectId` e o conteúdo já possuir atividades associadas (`existing.activities.length > 0`), lança `AppError('Não é possível alterar a disciplina de um conteúdo que já possui atividades associadas.', 409, 'CONTENT_HAS_DEPENDENCIES')`, evitando inconsistência indireta entre a disciplina do conteúdo e a disciplina da turma das atividades.

### 3.2. Exclusão e Edição de Atividades com Notas (`ActivityService`)
- **Arquivo:** [activityService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/activityService.ts)
- **Regra de Exclusão (`delete`):** Verifica `existing.grades && existing.grades.length > 0`. Caso existam notas lançadas, lança `AppError('Não é possível excluir uma atividade que já possui notas lançadas.', 409, 'ACTIVITY_HAS_GRADES')`.
- **Regra de Troca de Turma (`update`):** Se `data.classId !== existing.classId` e `hasGrades === true`, lança `AppError('Não é possível alterar a turma de uma atividade que já possui notas lançadas.', 409, 'ACTIVITY_HAS_GRADES')`.
- **Regra de Redução de `maxScore` (`update`):** Se `data.maxScore !== undefined` e `hasGrades === true`, calcula `highestGrade = Math.max(...existing.grades.map(g => g.score))`. Se `data.maxScore < highestGrade`, lança `AppError(..., 409, 'INVALID_MAX_SCORE')`.

### 3.3. Exclusão de Turmas (`ClassService`)
- **Arquivo:** [classService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/classService.ts)
- **Regra de Exclusão (`delete`):** Inspeciona `enrollments`, `activities` e `attendances` carregados em `ClassRepository.findById`. Caso qualquer uma das coleções não esteja vazia, lança `AppError(..., 409, 'CLASS_HAS_DEPENDENCIES')` informando exatamente quais vínculos impedem a remoção.

### 3.4. Exclusão de Alunos (`StudentService`)
- **Arquivo:** [studentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/studentService.ts)
- **Regra de Exclusão (`delete`):** Inspeciona `enrollments`, `grades` e `attendances` carregados em `StudentRepository.findById`. Caso exista qualquer histórico acadêmico, lança `AppError(..., 409, 'STUDENT_HAS_HISTORY')`. Alunos recém-cadastrados sem histórico continuam podendo ser excluídos limpa e transacionalmente junto ao `User`.

### 3.5. Exclusão de Professores (`TeacherService`)
- **Arquivo:** [teacherService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/teacherService.ts)
- **Regra de Exclusão (`delete`):** Inspeciona `classes` carregadas em `TeacherRepository.findById`. Se `classes.length > 0`, lança `AppError('Não é possível excluir o professor pois ele possui turmas vinculadas.', 409, 'TEACHER_HAS_DEPENDENCIES')`.

### 3.6. Exclusão de Disciplinas (`SubjectService`)
- **Arquivo:** [subjectService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/subjectService.ts)
- **Regra de Exclusão (`delete`):** Inspeciona `classes` e `contents` carregados em `SubjectRepository.findById`. Se houver turmas ou conteúdos vinculados, lança `AppError(..., 409, 'SUBJECT_HAS_DEPENDENCIES')`.

---

## 4. Decisão sobre Migrações Prisma

Como todas as guardas de integridade foram implementadas preventivamente na camada de domínio (`Service`) antes da chamada ao `Repository.delete`, nenhuma operação destrutiva chega ao banco de dados quando existem dependências acadêmicas. Dessa forma:
- O arquivo [schema.prisma](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/prisma/schema.prisma) permaneceu 100% compatível com a migration existente (`20261104000000_init`).
- Nota sobre a entidade `User`: Não existem `UserService`, `UserController`, `UserRoutes` nem método `delete` em [`UserRepository`](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/userRepository.ts) (`findByEmail`, `findById`, `create`). Portanto, não há endpoint nem operação de serviço que realize exclusão física de `User`.
- Não houve necessidade de executar `prisma migrate reset` nem de alterar constraints físicas no PostgreSQL, preservando integralmente todos os registros do banco `educa_api`.

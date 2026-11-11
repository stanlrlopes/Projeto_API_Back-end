# REVISÃO COMPLEMENTAR DE SEGURANÇA E INTEGRIDADE — FASE 3.3.4
## AUDITORIA DE PERMISSÕES DE CONTEÚDOS, EXCLUSÕES EM CASCATA E EDIÇÃO DE ATIVIDADES | EDUCAAPI

**Projeto:** EducaAPI — Plataforma de Gestão Educacional (ODS 4 — Educação de Qualidade)  
**Etapa:** Revisão Complementar de Segurança e Integridade da Fase 3.3.4 (Somente Leitura)  
**Data:** 06/11/2026  
**Natureza da Auditoria:** Inspeção estática do código-fonte real do Back-End e do modelo Prisma, sem modificações em arquivos ou banco de dados.

---

## 1. Escopo da Revisão e Arquivos Inspecionados

Esta auditoria examinou o controle de acesso (RBAC e isolamento horizontal), a integridade referencial, o comportamento das exclusões em cascata (`onDelete: Cascade`) e as regras de validação de criação, edição e exclusão nos domínios de **Conteúdos (`Content`)** e **Atividades (`Activity`)**, bem como seus efeitos colaterais sobre **Turmas (`Class`)** e **Notas (`Grade`)**.

### Arquivos Inspecionados (Somente Leitura)
- [src/routes/contentRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/contentRoutes.ts)
- [src/controllers/contentController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/contentController.ts)
- [src/services/contentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/contentService.ts)
- [src/repositories/contentRepository.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/contentRepository.ts)
- [src/schemas/contentSchemas.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/schemas/contentSchemas.ts)
- [src/routes/activityRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/activityRoutes.ts)
- [src/controllers/activityController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/activityController.ts)
- [src/services/activityService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/activityService.ts)
- [src/repositories/activityRepository.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/activityRepository.ts)
- [src/services/gradeService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/gradeService.ts)
- [prisma/schema.prisma](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/prisma/schema.prisma)

---

## 2. Auditoria das Permissões de Conteúdos (`Content`)

### 2.1. Um `PROFESSOR` pode criar qualquer conteúdo associado a qualquer disciplina?
**Resposta: SIM.**  
Na implementação real do Back-End, qualquer usuário autenticado com perfil `PROFESSOR` pode criar conteúdos (`POST /api/contents`) vinculados a **qualquer `subjectId` existente no banco**, mesmo que o professor não ministre nenhuma turma daquela disciplina.

**Evidências do Código:**
- Em [contentRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/contentRoutes.ts#L16):
  ```ts
  router.post('/', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), validate(createContentSchema), controller.create.bind(controller));
  ```
- Em [contentController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/contentController.ts#L27-L34), o método `create` **não repassa `req.user`** para a camada de serviço:
  ```ts
  async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await service.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) { ... }
  }
  ```
- Em [contentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/contentService.ts#L19-L21), o método `create` insere diretamente no repositório sem verificar `requester`:
  ```ts
  async create(data: z.infer<typeof createContentSchema>) {
    return repository.create(data);
  }
  ```

---

### 2.2. Um `PROFESSOR` pode editar qualquer conteúdo por ID?
**Resposta: SIM.**  
Qualquer `PROFESSOR` autenticado pode executar `PUT /api/contents/:id` sobre **qualquer registro de conteúdo do banco**, alterando seu `title`, `description` ou até mesmo transferindo seu `subjectId` para outra disciplina.

**Evidências do Código:**
- Em [contentRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/contentRoutes.ts#L17):
  ```ts
  router.put('/:id', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), validate(updateContentSchema), controller.update.bind(controller));
  ```
- Em [contentController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/contentController.ts#L36-L43) e [contentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/contentService.ts#L22-L25):
  ```ts
  async update(id: string, data: z.infer<typeof updateContentSchema>) {
    await this.getById(id);
    return repository.update(id, data);
  }
  ```
  O método apenas verifica se o conteúdo existe (`getById(id)`), sem qualquer validação de autoria, vínculo docente ou impacto em atividades existentes.

---

### 2.3. Um `PROFESSOR` pode excluir qualquer conteúdo por ID?
**Resposta: SIM.**  
Qualquer `PROFESSOR` autenticado pode executar `DELETE /api/contents/:id` sobre **qualquer conteúdo do banco**, independentemente de quem o criou ou de quais turmas o utilizam.

**Evidências do Código:**
- Em [contentRoutes.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/routes/contentRoutes.ts#L18):
  ```ts
  router.delete('/:id', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), controller.delete.bind(controller));
  ```
- Em [contentController.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/controllers/contentController.ts#L45-L52) e [contentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/contentService.ts#L26-L29):
  ```ts
  async delete(id: string) {
    await this.getById(id);
    return repository.delete(id);
  }
  ```

---

### 2.4. Existe alguma relação que permita identificar quais conteúdos pertencem ou estão vinculados ao professor?
**Resposta: NÃO existe relação direta de autoria (`teacherId`, `createdBy` ou `classId`) na tabela `contents`; existe apenas uma relação indireta e compartilhada via `Subject -> Class -> Teacher`.**

**Evidências do Código:**
- Em [prisma/schema.prisma](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/prisma/schema.prisma#L117-L129):
  ```prisma
  model Content {
    id          String   @id @default(uuid())
    title       String
    description String?
    subjectId   String
    subject     Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    activities  Activity[]

    @@map("contents")
  }
  ```
- Como `Content` liga-se apenas a `Subject` (`subjectId`), e múltiplos professores podem lecionar turmas diferentes da mesma disciplina (`Class.subjectId` + `Class.teacherId`), o modelo atual trata `Content` como um catálogo curricular da disciplina, sem coluna de proprietário (`teacherId`) nem vínculo exclusivo com uma turma (`classId`).
- A única forma de inferir vínculo no schema atual sem migrates é verificar:
  1. Se o professor leciona ao menos uma turma daquela disciplina (`prisma.class.findFirst({ where: { subjectId, teacher: { userId: requester.id } } })`); e
  2. Se o conteúdo está referenciado por `activities` pertencentes a turmas de outros professores.

---

### 2.5. Um professor consegue alterar ou excluir conteúdos utilizados em atividades de turmas de outros professores?
**Resposta: SIM.**  
Embora `ActivityService` impeça que o Professor B exclua diretamente uma atividade do Professor A (`DELETE /api/activities/:id` retorna `403 FORBIDDEN`), o Professor B consegue excluir o `Content` ao qual aquela atividade está vinculada (`DELETE /api/contents/:id` retorna `204 No Content`). Devido ao `onDelete: Cascade` no Prisma, **isso apaga indiretamente todas as atividades do Professor A vinculadas àquele conteúdo e todas as notas (`Grades`) lançadas nelas**.

---

### 2.6. A API valida as consequências dessa operação antes de permitir a exclusão?
**Resposta: NÃO.**  
Nem `ContentService.delete` ([contentService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/contentService.ts#L26-L29)) nem `ActivityService.delete` ([activityService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/activityService.ts#L74-L77)) verificam a existência de registros dependentes (`activities` ou `grades`) antes de invocar `prisma.content.delete` ou `prisma.activity.delete`.

---

## 3. Auditoria das Exclusões em Cascata (`onDelete: Cascade`)

### 3.1. Mapeamento Real no `prisma/schema.prisma`
Inspecionando [prisma/schema.prisma](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/prisma/schema.prisma#L117-L161), verifica-se a seguinte cadeia de cascata no PostgreSQL:

1. **`Subject` -> `Content` (`onDelete: Cascade` na linha 122):**
   - Excluir uma disciplina (caso não possua `Class`, pois `Class.subject` é `onDelete: Restrict`) apaga todos os seus `Content`.
2. **`Content` -> `Activity` (`onDelete: Cascade` na linha 136):**
   ```prisma
   contentId   String
   content     Content  @relation(fields: [contentId], references: [id], onDelete: Cascade)
   ```
3. **`Class` -> `Activity` (`onDelete: Cascade` na linha 138):**
   ```prisma
   classId     String
   class       Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
   ```
4. **`Activity` -> `Grade` (`onDelete: Cascade` na linha 153):**
   ```prisma
   activityId  String
   activity    Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
   ```

### 3.2. Cenários Concretos de Perda de Histórico Acadêmico

#### Cenário 1: Exclusão de um `Content` (`DELETE /api/contents/:id`)
- **Ação:** Um `ADMIN` ou **qualquer `PROFESSOR`** executa `DELETE /api/contents/:id` sobre o conteúdo `"Introdução aos Limites"`.
- **O que o banco remove automaticamente em cascata:**
  1. O registro `Content` na tabela `contents`;
  2. **Todas as `Activity`** na tabela `activities` que possuam `contentId = id` (inclusive atividades de turmas de outros professores);
  3. **Todas as `Grade`** na tabela `grades` vinculadas a qualquer uma dessas atividades removidas.
- **Consequência:** Perda imediata e silenciosa de avaliações e notas lançadas, alterando retroativamente as médias dos alunos (`/api/indicators/students/:id/average` e `/api/indicators/dashboard`).

#### Cenário 2: Exclusão de uma `Activity` (`DELETE /api/activities/:id`)
- **Ação:** Um `ADMIN` ou o `PROFESSOR` titular da turma executa `DELETE /api/activities/:id` sobre uma atividade que já possui notas lançadas.
- **O que o banco remove automaticamente em cascata:**
  1. O registro `Activity` na tabela `activities`;
  2. **Todas as `Grade`** na tabela `grades` cujo `activityId` corresponda à atividade excluída.
- **Consequência:** Destruição do histórico de notas já atribuídas aos estudantes naquela avaliação, sem bloqueio prévio (`409 Conflict`) da API.

---

## 4. Auditoria de Edição de Atividades (`PUT /api/activities/:id`)

Inspeção detalhada de `ActivityService.update` em [src/services/activityService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/activityService.ts#L63-L73):

```ts
  async update(id: string, data: z.infer<typeof updateActivitySchema>, requester?: Requester) {
    await this.getById(id, requester);
    if (requester?.role === Role.PROFESSOR && data.classId) {
      const targetClass = await classRepository.findById(data.classId);
      if (!targetClass) throw { status: 404, message: 'Turma não encontrada', code: 'CLASS_NOT_FOUND' };
      if (targetClass.teacher?.userId !== requester.id) {
        throw { status: 403, message: 'Acesso negado. Você só pode associar atividades às suas próprias turmas.', code: 'FORBIDDEN' };
      }
    }
    return repository.update(id, data);
  }
```

### Verificação dos 4 Pontos Solicitados:

1. **Valida se a atividade original pertence a uma turma sob responsabilidade do professor?**
   - **SIM (PROTEGIDO).** Na linha 64, `await this.getById(id, requester)` carrega a atividade existente e verifica na linha 48:
     ```ts
     if (requester?.role === Role.PROFESSOR && entity.class?.teacher?.userId !== requester.id) {
       throw { status: 403, message: 'Acesso negado. Esta atividade pertence a uma turma de outro professor.', code: 'FORBIDDEN' };
     }
     ```
2. **Valida se a nova turma informada (`data.classId`) também pertence a ele?**
   - **SIM (PROTEGIDO).** Nas linhas 65–71, se `requester?.role === Role.PROFESSOR && data.classId`, o serviço busca `targetClass` no banco e rejeita com `403 FORBIDDEN` caso `targetClass.teacher?.userId !== requester.id`.
3. **Valida se o novo conteúdo informado (`data.contentId`) é compatível com a disciplina da turma (`class.subjectId === content.subjectId`)?**
   - **NÃO (VULNERÁVEL — Tanto em `create` quanto em `update`).** Nem `ActivityService.create` (linhas 53–62) nem `ActivityService.update` (linhas 63–73) verificam se `content.subjectId` é igual a `classEntity.subjectId`. A API permite associar uma atividade de uma turma de *Matemática* a um conteúdo de *História* caso os UUIDs sejam enviados diretamente à API.
4. **Valida se a alteração (`classId` ou `maxScore`) pode afetar notas (`Grade`) já lançadas?**
   - **NÃO (VULNERÁVEL).** `ActivityService.update` permite:
     - **Reduzir `maxScore` abaixo de notas já lançadas:** Se uma atividade tinha `maxScore = 10` e um aluno já recebeu `score = 9.5`, reduzir `maxScore` para `5.0` via `PUT /api/activities/:id` é aceito pela API, deixando notas existentes (`9.5 > 5.0`) em estado inconsistente com a regra de negócio de `GradeService.create` ([gradeService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/gradeService.ts#L60-L66)).
     - **Alterar `classId` de uma atividade que já possui notas lançadas:** Se a atividade já possui notas de alunos da Turma A e seu `classId` é alterado para a Turma B, as notas continuam apontando para alunos da Turma A que não estão matriculados na Turma B.

---

## 5. Matriz Consolidada de Permissões e Controles Reais

| Operação | `ADMIN` | `PROFESSOR` (Própria Turma/Disciplina) | `PROFESSOR` (Turma/Disciplina Alheia) | `ALUNO` | Situação da Segurança no Back-End |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/contents` | Permitido (`200`) | Permitido (`200`) | **Permitido (`200`)** — sem filtro no Back-End | **Permitido (`200`)** — sem filtro no Back-End | **Parcial** (`ContentService` não recebe `requester`) |
| `POST /api/contents` | Permitido (`201`) | Permitido (`201`) | **Permitido (`201`)** — qualquer `subjectId` | Bloqueado (`403`) | **Vulnerável** (Falta validar vínculo do professor com a disciplina) |
| `PUT /api/contents/:id` | Permitido (`200`) | Permitido (`200`) | **Permitido (`200`)** — qualquer ID | Bloqueado (`403`) | **Vulnerável** (Professor altera conteúdo utilizado por outro professor) |
| `DELETE /api/contents/:id` | Permitido (`204`) | Permitido (`204`) | **Permitido (`204`)** — apaga `Activities` e `Grades` em cascata | Bloqueado (`403`) | **Crítico** (Bypass indireto de exclusão de atividades e notas alheias) |
| `GET /api/activities` | Permitido (`200`) | Permitido (`200`) | Bloqueado (filtrado no `where`) | Permitido apenas em turmas `ACTIVE` | **Seguro** |
| `GET /api/activities/:id` | Permitido (`200`) | Permitido (`200`) | Bloqueado (`403`) | Bloqueado (`403`) se não matriculado `ACTIVE` | **Seguro** |
| `POST /api/activities` | Permitido (`201`) | Permitido (`201`) | Bloqueado (`403`) | Bloqueado (`403`) | **Parcial** (Valida posse da turma, mas não valida `content.subjectId === class.subjectId`) |
| `PUT /api/activities/:id` | Permitido (`200`) | Permitido (`200`) | Bloqueado (`403` na origem e no destino) | Bloqueado (`403`) | **Parcial** (Valida posse das turmas, mas não valida `maxScore` vs. `Grades` existentes nem troca de `classId` com notas) |
| `DELETE /api/activities/:id` | Permitido (`204`) | Permitido (`204`) | Bloqueado (`403`) | Bloqueado (`403`) | **Parcial** (Valida posse da turma, mas apaga `Grades` em cascata sem bloqueio prévio) |

---

## 6. Classificação de Risco dos Achados

### ACHADO 01 — Exclusão e Edição Irrestrita de Conteúdos por Qualquer Professor com Efeito Cascata sobre Atividades e Notas Alheias
- **Classificação de Risco:** **CRÍTICO**
- **Arquivos Afetados:** `src/controllers/contentController.ts`, `src/services/contentService.ts`, `prisma/schema.prisma`.
- **Impacto:** Embora `ActivityService` e `GradeService` bloqueiem com `403` qualquer tentativa de o Professor B modificar ou excluir atividades e notas do Professor A, o Professor B pode chamar `DELETE /api/contents/:id` em um conteúdo utilizado pelo Professor A. O PostgreSQL executará `ON DELETE CASCADE`, destruindo todas as `Activities` vinculadas àquele conteúdo e todas as `Grades` dos alunos naquelas atividades.
- **Possibilidade de Exploração:** Alta e trivial para qualquer conta autenticada com `Role.PROFESSOR` (basta uma chamada HTTP `DELETE /api/contents/:id`).

### ACHADO 02 — Exclusão Silenciosa de Histórico Acadêmico (`Grades` e `Activities`) por Cascata sem Verificação de Dependências
- **Classificação de Risco:** **ALTO**
- **Arquivos Afetados:** `src/services/contentService.ts`, `src/services/activityService.ts`, `prisma/schema.prisma`.
- **Impacto:** A exclusão acidental de um `Content` que já possui `Activities` ou de uma `Activity` que já possui `Grades` apaga permanentemente notas lançadas sem exigir que a avaliação esteja vazia ou sem retornar erro `409 Conflict` (`DEPENDENCY_CONFLICT`).
- **Possibilidade de Exploração:** Alta em operação cotidiana (erro humano administrativo ou docente).

### ACHADO 03 — Edição de `Activity` (`maxScore` ou `classId`) Invalida Notas Já Lançadas (`Grades`)
- **Classificação de Risco:** **MÉDIO**
- **Arquivos Afetados:** `src/services/activityService.ts`.
- **Impacto:** Reduzir `maxScore` abaixo da maior nota já lançada para a atividade ou mudar o `classId` de uma atividade que já possui notas cria inconsistência matemática e cadastral nos indicadores de desempenho (`Grade.score > Activity.maxScore` ou notas de alunos não matriculados na nova turma).
- **Possibilidade de Exploração:** Média (ocorre quando um professor ou administrador reconfigura uma atividade após o lançamento de notas).

### ACHADO 04 — Ausência de Validação de Compatibilidade entre a Disciplina do Conteúdo (`content.subjectId`) e a Disciplina da Turma (`class.subjectId`)
- **Classificação de Risco:** **MÉDIO**
- **Arquivos Afetados:** `src/services/activityService.ts`.
- **Impacto:** Embora a interface `ActivitiesPage.tsx` filtre os conteúdos pela disciplina da turma selecionada, requisições diretas para `POST /api/activities` ou `PUT /api/activities/:id` podem vincular um `contentId` de uma disciplina diferente do `subjectId` da turma.
- **Possibilidade de Exploração:** Baixa/Média (requer chamada direta à API fora do fluxo padrão da UI ou em cenários onde a turma não possui conteúdos da própria disciplina).

### ACHADO 05 — Ausência de Isolamento Horizontal na Leitura de Conteúdos (`GET /api/contents` e `GET /api/contents/:id`) no Back-End
- **Classificação de Risco:** **BAIXO**
- **Arquivos Afetados:** `src/controllers/contentController.ts`, `src/services/contentService.ts`.
- **Impacto:** Um `ALUNO` ou `PROFESSOR` que consulte `GET /api/contents` diretamente via API visualiza os títulos e descrições programáticas de todas as disciplinas da instituição, e não apenas das disciplinas de suas turmas.
- **Possibilidade de Exploração:** Baixa criticidade (ementas e tópicos programáticos não contêm dados pessoais sensíveis, mas o isolamento por escopo de turma torna o contrato mais consistente).

---

## 7. Recomendações Técnicas de Correção (Apenas no Back-End — Sem Alterar o Schema Prisma)

Todas as vulnerabilidades acima podem ser corrigidas **exclusivamente na camada de Controller/Service/Repository do Back-End**, sem necessidade de alterar `prisma/schema.prisma` ou criar migrations:

1. **Isolamento e Proteção de Escrita/Exclusão em `ContentController` e `ContentService` (Corrige Achados 01, 02 e 05):**
   - Passar `req.user` (`requester`) em todos os métodos de `ContentController` para `ContentService`.
   - Em `ContentService.getAll` e `getById`:
     - Para `ALUNO`, permitir apenas conteúdos cujas disciplinas (`subjectId`) possuam turma com matrícula `ACTIVE` do aluno.
     - Para `PROFESSOR`, permitir apenas conteúdos cujas disciplinas (`subjectId`) sejam lecionadas pelo professor em ao menos uma turma (`classes.some(teacher.userId === requester.id)`).
   - Em `ContentService.create`:
     - Para `PROFESSOR`, validar que o professor leciona ao menos uma turma vinculada ao `data.subjectId` informado (`403 FORBIDDEN` caso contrário).
   - Em `ContentService.update` e `ContentService.delete`:
     - Para `PROFESSOR`, validar que ele leciona a disciplina do conteúdo atual (e da nova disciplina, se `data.subjectId` for enviado) **e** verificar se o conteúdo está vinculado a alguma atividade de outro professor (`403 FORBIDDEN` caso exista atividade de outro professor usando aquele conteúdo).
     - Em `ContentService.delete` (para qualquer perfil, inclusive `ADMIN`): verificar se existem `activities` vinculadas ao conteúdo (`prisma.activity.count({ where: { contentId: id } })`). Se `count > 0`, rejeitar com `409 Conflict` (`CONTENT_HAS_ACTIVITIES` — `"Não é possível excluir um conteúdo que possui atividades vinculadas"`), impedindo a exclusão em cascata acidental de atividades e notas.

2. **Proteção de Integridade em `ActivityService.create`, `update` e `delete` (Corrige Achados 02, 03 e 04):**
   - **Compatibilidade `Content.subjectId === Class.subjectId`:** Em `create` e `update`, carregar a turma (`targetClass`) e o conteúdo (`targetContent`) e validar que `targetContent.subjectId === targetClass.subjectId`; caso divirjam, lançar `400 Bad Request` (`INCOMPATIBLE_CONTENT_SUBJECT`).
   - **Proteção de Notas Existentes em `ActivityService.update`:**
     - Se a atividade já possuir notas lançadas (`grades.length > 0`) e `data.classId` for diferente de `existingActivity.classId`, rejeitar com `409 Conflict` (`ACTIVITY_HAS_GRADES` — `"Não é possível alterar a turma de uma atividade que já possui notas lançadas"`).
     - Se `data.maxScore` for informado e houver alguma nota lançada na atividade com `score > data.maxScore`, rejeitar com `400 Bad Request` (`INVALID_MAX_SCORE` — `"A nova nota máxima não pode ser inferior às notas já lançadas nesta atividade"`).
   - **Bloqueio de Exclusão de Atividade com Notas Lançadas em `ActivityService.delete`:**
     - Verificar se existem notas vinculadas à atividade (`grades`). Caso existam, rejeitar com `409 Conflict` (`ACTIVITY_HAS_GRADES` — `"Não é possível excluir uma atividade que já possui notas lançadas"`), preservando o histórico acadêmico.

---

## 8. Conclusão Técnica

A revisão complementar comprovou que:
- O módulo de **Atividades (`ActivityService`)** já possui isolamento horizontal de leitura e escrita entre professores e alunos por turma, mas carece de trava contra exclusão de atividades já avaliadas (`Grades`), validação de redução de `maxScore` abaixo de notas existentes e verificação de compatibilidade entre `content.subjectId` e `class.subjectId`.
- O módulo de **Conteúdos (`ContentService`)** no Back-End não recebe `req.user`, permitindo que qualquer `PROFESSOR` crie, edite ou exclua conteúdos de qualquer disciplina — o que, combinado ao `onDelete: Cascade` de `Content -> Activity -> Grade`, representa um **risco CRÍTICO** de exclusão cruzada de atividades e notas de outros professores.

Recomenda-se autorizar uma etapa pontual de **Reforço de Segurança e Integridade de Conteúdos e Atividades no Back-End** (nos moldes da Fase 2.1) antes de prosseguir para a **FASE 3.3.5 (Notas e Frequência)**.

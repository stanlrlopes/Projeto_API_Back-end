# PLANEJAMENTO VISUAL E ARQUITETURA DO FRONT-END — EDUCAAPI (FASE 2)

**Data:** 04/11/2026  
**Objetivo:** Especificar a identidade visual (Design System), arquitetura de pastas, árvore de componentes, estratégia de autenticação e sessão, controle de acesso por perfil (`ADMIN`, `PROFESSOR`, `ALUNO`), mapeamento 1:1 entre telas e endpoints reais da API, responsividade multi-dispositivo, dashboards analíticos (ODS 4), tratamento de estados de interface e plano de execução e testes da Sprint 2.

---

## 1. Proposta de Identidade Visual e Design System

### 1.1. Direção Estética e Conceito Visual
A interface da **EducaAPI** foi projetada como uma plataforma **SaaS Educacional Corporativa e Acadêmica**, alinhada ao **ODS 4 (Educação de Qualidade)**. O design prioriza:
- **Clareza Cognitiva:** Hierarquia tipográfica rigorosa para leitura rápida de tabelas acadêmicas, boletins e indicadores de risco escolar.
- **Minimalismo Funcional:** Superfícies claras, bordas sutis (`1px solid`), espaçamento generoso em múltiplos de `4px`/`8px` e ausência de sombras pesadas ou gradientes artificiais.
- **Feedback Visual Semântico:** Cores de status reservadas exclusivamente para significados pedagógicos reais (aprovação/bom desempenho em verde, atenção/risco em laranja, reprovação/crítico em vermelho).

### 1.2. Paleta de Cores (Tokens Tailwind CSS)

| Categoria | Token Semântico | Hexadecimal | Classe Tailwind | Aplicação na Interface |
|---|---|---|---|---|
| **Primária (Institucional)** | `primary-900` (Azul-Marinho) | `#0F172A` / `#1E3A8A` | `bg-slate-900` / `bg-blue-950` | Sidebar lateral, cabeçalhos de destaque, identidade institucional e confiança. |
| **Primária (Ação / Educação)** | `primary-600` (Azul) | `#2563EB` | `bg-blue-600` / `text-blue-600` | Botões primários (CTA), links ativos, indicadores de foco (`ring-blue-600`), abas selecionadas. |
| **Primária Hover** | `primary-700` | `#1D4ED8` | `hover:bg-blue-700` | Estado hover de botões primários e ações principais. |
| **Superfície Principal** | `surface-white` | `#FFFFFF` | `bg-white` | Fundo de cards, tabelas, modais, cabeçalho superior e formulários. |
| **Fundo da Aplicação** | `bg-canvas` (Cinza-Claro) | `#F8FAFC` | `bg-slate-50` | Plano de fundo da área de conteúdo principal (`main`) para contraste suave com os cards brancos. |
| **Bordas e Divisores** | `border-subtle` | `#E2E8F0` | `border-slate-200` | Linhas divisórias de tabelas, contornos de cards e inputs de formulário. |
| **Texto Principal** | `text-primary` | `#0F172A` | `text-slate-900` | Títulos, nomes de alunos, notas e valores de indicadores em destaque. |
| **Texto Secundário** | `text-secondary` | `#475569` | `text-slate-600` | Labels de formulários, subtítulos, cabeçalhos de colunas e descrições. |
| **Texto Auxiliar / Muted** | `text-muted` | `#94A3B8` | `text-slate-400` | Placeholders, metadados de paginação, timestamps e breadcrumbs inativos. |
| **Sucesso / Positivo** | `status-success` (Verde) | `#16A34A` / `#DCFCE7` | `text-emerald-700 bg-emerald-50` | Média $\ge 6.0$, presença registrada (`present: true`), matrícula `ACTIVE`, toasts de sucesso. |
| **Alerta / Atenção** | `status-warning` (Laranja) | `#D97706` / `#FEF3C7` | `text-amber-700 bg-amber-50` | Alertas de alunos em risco (baixo desempenho $< 6.0$), frequência próxima ao limite, matrícula `INACTIVE`. |
| **Perigo / Crítico** | `status-danger` (Vermelho) | `#DC2626` / `#FEE2E2` | `text-red-700 bg-red-50` | Faltas (`present: false`), exclusões destrutivas, matrícula `CANCELLED`, erros de validação. |

### 1.3. Tipografia
- **Família Tipográfica Principal:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (alta legibilidade para números tabulares e interfaces densas).
- **Números Tabulares:** Uso de `tabular-nums` em notas (`score`, `maxScore`), médias (`average`) e percentuais de frequência (`attendancePercentage`) para alinhamento vertical perfeito nas tabelas.
- **Escala Tipográfica:**
  - **Título de Página (`H1`):** `text-2xl font-bold tracking-tight text-slate-900` (`24px`)
  - **Título de Seção / Card (`H2`):** `text-lg font-semibold text-slate-900` (`18px`)
  - **Subtítulo / Modal Header (`H3`):** `text-base font-semibold text-slate-800` (`16px`)
  - **Corpo Padrão / Células de Tabela:** `text-sm text-slate-700` (`14px`)
  - **Labels e Badges:** `text-xs font-medium uppercase tracking-wider` (`12px`)

### 1.4. Elevação, Bordas e Espaçamento
- **Cards e Painéis:** `bg-white rounded-xl border border-slate-200 shadow-sm p-6`
- **Inputs e Selects:** `h-10 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`
- **Botões:** Altura mínima de `40px` (`h-10 px-4 py-2 rounded-lg font-medium text-sm transition-colors`) no desktop e `44px` (`min-h-[44px]`) em áreas de toque mobile.
- **Ícones:** Biblioteca **Lucide React** com traço consistente (`strokeWidth={1.75}`, tamanhos `16px` em botões/badges e `20px` na navegação).

---

## 2. Arquitetura de Pastas e Componentes do Front-End

O Front-End será estruturado no diretório `frontend/` na raiz do workspace, mantendo isolamento limpo de dependências em relação ao Back-End:

```text
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/                        # Logotipos e ilustrações SVG minimalistas
│   ├── components/
│   │   ├── ui/                        # Design System atômico
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── ToastContainer.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── Pagination.tsx
│   │   ├── forms/                     # Componentes de formulário integrados ao React Hook Form
│   │   │   ├── FormField.tsx
│   │   │   └── SelectField.tsx
│   │   ├── tables/                    # Tabela responsiva com visão híbrida (Table Desktop / Card Mobile)
│   │   │   └── DataTable.tsx
│   │   ├── charts/                    # Visualizações Recharts baseadas em dados reais da API
│   │   │   ├── PerformanceChart.tsx
│   │   │   ├── AttendancePieChart.tsx
│   │   │   └── LowPerformanceBarChart.tsx
│   │   └── layout/                    # Estrutura mestre e guardas de navegação
│   │       ├── AppLayout.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── PageHeader.tsx
│   │       ├── ProtectedRoute.tsx
│   │       └── RoleGuard.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Sessão JWT, usuário logado, perfil e vínculo Student/Teacher
│   │   └── ToastContext.tsx           # Sistema de notificações (sucesso, erro, alerta)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useToast.ts
│   │   └── usePagination.ts
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx      # Visão Geral (ADMIN/PROFESSOR) e Visão Acadêmica (ALUNO)
│   │   ├── students/
│   │   │   ├── StudentsPage.tsx
│   │   │   └── StudentDetailsModal.tsx
│   │   ├── teachers/
│   │   │   └── TeachersPage.tsx
│   │   ├── subjects/
│   │   │   └── SubjectsPage.tsx
│   │   ├── classes/
│   │   │   └── ClassesPage.tsx
│   │   ├── enrollments/
│   │   │   └── EnrollmentsPage.tsx
│   │   ├── contents/
│   │   │   └── ContentsPage.tsx
│   │   ├── activities/
│   │   │   └── ActivitiesPage.tsx
│   │   ├── grades/
│   │   │   └── GradesPage.tsx
│   │   ├── attendance/
│   │   │   └── AttendancePage.tsx
│   │   └── indicators/
│   │       └── IndicatorsPage.tsx     # Consulta analítica individual e listagem de baixo desempenho
│   ├── routes/
│   │   └── AppRoutes.tsx
│   ├── services/                      # Cliente HTTP Axios e serviços modulares 1:1 com a API
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── studentService.ts
│   │   ├── teacherService.ts
│   │   ├── subjectService.ts
│   │   ├── classService.ts
│   │   ├── enrollmentService.ts
│   │   ├── contentService.ts
│   │   ├── activityService.ts
│   │   ├── gradeService.ts
│   │   ├── attendanceService.ts
│   │   └── indicatorService.ts
│   ├── types/                         # Contratos TypeScript espelhando 100% o Prisma Schema e Respostas
│   │   └── api.types.ts
│   ├── utils/
│   │   ├── formatters.ts              # Datas, médias (2 casas decimais), percentuais e status
│   │   └── errorParser.ts             # Extração amigável de erros da API e Zod
│   ├── styles/
│   │   └── index.css                  # Diretivas Tailwind CSS e variáveis globais
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 3. Mapeamento das Telas e Funcionalidades por Perfil (RBAC)

A matriz abaixo reflete **exatamente** as regras implementadas nos arquivos `src/routes/*.ts` e `src/controllers/indicatorController.ts` do Back-End:

| Tela / Módulo | Rota Front-End | `ADMIN` | `PROFESSOR` | `ALUNO` | Comportamento da UI conforme Permissões Reais da API |
|---|---|---|---|---|---|
| **Login** | `/login` | Público | Público | Público | Autentica via `POST /api/auth/login` e redireciona para `/dashboard`. |
| **Registro de Conta** | `/register` | Público | Público | Público | Registra conta via `POST /api/auth/register`. |
| **Dashboard** | `/dashboard` | Completo (Institucional) | Completo (Institucional) | Visão do Aluno | `ADMIN` e `PROFESSOR` consomem `/api/indicators/dashboard` e `/low-performance`. `ALUNO` vê seus próprios cards de média, frequência, atividades e notas (pois `/dashboard` retorna `403` para `ALUNO`). |
| **Alunos** | `/students` | CRUD Completo + Indicadores | Leitura + Indicadores | Leitura + Próprio Boletim | Botões "Novo Aluno", "Editar" e "Excluir" visíveis apenas para `ADMIN`. Modal de detalhes exibe notas, frequência e indicadores. |
| **Professores** | `/teachers` | CRUD Completo | Leitura | Leitura | Botões "Novo Professor", "Editar" e "Excluir" exclusivos para `ADMIN`. |
| **Disciplinas** | `/subjects` | CRUD Completo | Leitura | Leitura | Botões "Nova Disciplina", "Editar" e "Excluir" exclusivos para `ADMIN`. |
| **Turmas** | `/classes` | CRUD Completo | Leitura | Leitura | Exibe professor responsável e disciplina vinculada. Criação/edição/exclusão exclusiva para `ADMIN`. |
| **Matrículas** | `/enrollments` | CRUD Completo | Leitura | Leitura | Associação aluno $\leftrightarrow$ turma e alteração de `status` (`ACTIVE`, `INACTIVE`, `CANCELLED`, `COMPLETED`) exclusivos para `ADMIN`. |
| **Conteúdos** | `/contents` | CRUD Completo | CRUD Completo | Leitura | Criação, edição e exclusão habilitadas para `ADMIN` e `PROFESSOR`. `ALUNO` apenas consulta. |
| **Atividades** | `/activities` | CRUD Completo | CRUD Completo | Leitura | Criação, edição e exclusão (com `dueDate` e `maxScore`) para `ADMIN` e `PROFESSOR`. `ALUNO` apenas consulta. |
| **Notas** | `/grades` | CRUD Completo | CRUD Completo | Leitura | Lançamento, edição e exclusão de notas para `ADMIN` e `PROFESSOR` (validando `score <= maxScore`). `ALUNO` apenas consulta. |
| **Frequência** | `/attendance` | CRUD Completo | CRUD Completo | Leitura | Registro de presença/falta (`present: boolean`) para `ADMIN` e `PROFESSOR`. `ALUNO` apenas consulta. |
| **Indicadores (ODS 4)** | `/indicators` | Geral + Individual + Risco | Geral + Individual + Risco | Individual Próprio | `ADMIN` e `PROFESSOR` consultam qualquer aluno e a lista `/low-performance`. `ALUNO` consulta automaticamente sua própria média e frequência (`checkStudentAccess` no Back-End bloqueia consulta a terceiros com `403`). |

---

## 4. Mapeamento Detalhado: Telas × Endpoints Reais × Contratos da API

Nenhum endpoint ou campo foi inventado. Todos os formulários seguirão rigorosamente os schemas Zod de `src/schemas/*.ts`:

### 4.1. Módulo de Autenticação (`authService.ts`)
| Tela / Ação | Método e Endpoint Real | Payload Enviado (Body) | Resposta Esperada da API |
|---|---|---|---|
| **Login (`LoginPage`)** | `POST /api/auth/login` | `{ email: string, password: string }` | `200 OK`: `{ success: true, data: { token: string, user: { id, name, email, role, createdAt, updatedAt } } }` |
| **Cadastro (`RegisterPage`)** | `POST /api/auth/register` | `{ name: string, email: string, password: string, role?: 'ADMIN' \| 'PROFESSOR' \| 'ALUNO' }` | `201 Created`: `{ success: true, data: { id, name, email, role, createdAt, updatedAt } }` |
| **Sessão Atual (`AuthContext`)** | `GET /api/auth/me` | *(Header `Authorization: Bearer <token>`)* | `200 OK`: `{ success: true, data: { id, name, email, role, createdAt, updatedAt } }` |

### 4.2. Módulo de Alunos (`studentService.ts`)
| Ação na Tela `StudentsPage` | Método e Endpoint Real | Parâmetros / Body Real (`basicSchemas.ts`) | Resposta / Observação Técnica de Integração |
|---|---|---|---|
| **Listar Alunos** | `GET /api/students` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Student[], pagination: { page, limit, total, totalPages } }` |
| **Visualizar Detalhes** | `GET /api/students/:id` | Path: `:id` (UUID do `Student`) | `200 OK`: `{ success: true, data: Student }` |
| **Cadastrar Aluno (`ADMIN`)** | `POST /api/students` | Body: `{ userId: string (UUID), name: string, email: string, birthDate: string (ISO Date), registration: string }` | `201 Created`. **Fluxo Integrado:** Como o schema exige `userId` (UUID da tabela `users`) e não há `GET /api/users`, o formulário oferecerá a criação integrada da conta de usuário (`POST /api/auth/register` com `role: 'ALUNO'` $\rightarrow$ obtém `user.id` $\rightarrow$ `POST /api/students`) ou a inserção direta de um `userId` existente. |
| **Editar Aluno (`ADMIN`)** | `PUT /api/students/:id` | Body: `{ name?: string, email?: string, birthDate?: string, registration?: string }` *(sem `userId`)* | `200 OK`: `{ success: true, data: Student }` |
| **Excluir Aluno (`ADMIN`)** | `DELETE /api/students/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.3. Módulo de Professores (`teacherService.ts`)
| Ação na Tela `TeachersPage` | Método e Endpoint Real | Parâmetros / Body Real (`basicSchemas.ts`) | Resposta / Observação Técnica de Integração |
|---|---|---|---|
| **Listar Professores** | `GET /api/teachers` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Teacher[], pagination }` |
| **Visualizar Detalhes** | `GET /api/teachers/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Teacher }` |
| **Cadastrar Professor (`ADMIN`)** | `POST /api/teachers` | Body: `{ userId: string (UUID), name: string, email: string, registration: string }` | `201 Created`. **Fluxo Integrado:** Permite criar a conta base via `POST /api/auth/register` (`role: 'PROFESSOR'`) para obter o `userId` automaticamente e em seguida registrar em `POST /api/teachers`, ou informar um `userId` existente. |
| **Editar Professor (`ADMIN`)** | `PUT /api/teachers/:id` | Body: `{ name?: string, email?: string, registration?: string }` | `200 OK`: `{ success: true, data: Teacher }` |
| **Excluir Professor (`ADMIN`)** | `DELETE /api/teachers/:id` | Path: `:id` (UUID) | `204 No Content` (Tratar erro caso o professor possua turmas vinculadas devido a `onDelete: Restrict`). |

### 4.4. Módulo de Disciplinas (`subjectService.ts`)
| Ação na Tela `SubjectsPage` | Método e Endpoint Real | Parâmetros / Body Real (`basicSchemas.ts`) | Resposta Esperada |
|---|---|---|---|
| **Listar Disciplinas** | `GET /api/subjects` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Subject[], pagination }` |
| **Visualizar Disciplina** | `GET /api/subjects/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Subject }` |
| **Criar Disciplina (`ADMIN`)** | `POST /api/subjects` | Body: `{ name: string, description?: string, workload: number }` | `201 Created`: `{ success: true, data: Subject }` |
| **Editar Disciplina (`ADMIN`)** | `PUT /api/subjects/:id` | Body: `{ name?: string, description?: string, workload?: number }` | `200 OK`: `{ success: true, data: Subject }` |
| **Excluir Disciplina (`ADMIN`)** | `DELETE /api/subjects/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.5. Módulo de Turmas (`classService.ts`)
| Ação na Tela `ClassesPage` | Método e Endpoint Real | Parâmetros / Body Real (`academicSchemas.ts`) | Resposta Esperada |
|---|---|---|---|
| **Listar Turmas** | `GET /api/classes` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Class[], pagination }` *(inclui objetos aninhados `teacher` e `subject`)* |
| **Visualizar Turma** | `GET /api/classes/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Class }` *(inclui `teacher` e `subject`)* |
| **Criar Turma (`ADMIN`)** | `POST /api/classes` | Body: `{ name: string, year: number (>=2000), semester: 1 \| 2, teacherId: string (UUID), subjectId: string (UUID) }` | `201 Created` (Selects populados via `GET /api/teachers` e `GET /api/subjects`). |
| **Editar Turma (`ADMIN`)** | `PUT /api/classes/:id` | Body parcial de `createClassSchema` | `200 OK` |
| **Excluir Turma (`ADMIN`)** | `DELETE /api/classes/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.6. Módulo de Matrículas (`enrollmentService.ts`)
| Ação na Tela `EnrollmentsPage` | Método e Endpoint Real | Parâmetros / Body Real (`academicSchemas.ts`) | Resposta Esperada |
|---|---|---|---|
| **Listar Matrículas** | `GET /api/enrollments` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Enrollment[], pagination }` *(inclui `student` e `class`)* |
| **Visualizar Matrícula** | `GET /api/enrollments/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Enrollment }` |
| **Matricular Aluno (`ADMIN`)** | `POST /api/enrollments` | Body: `{ studentId: string (UUID), classId: string (UUID), status?: 'ACTIVE' \| 'INACTIVE' \| 'CANCELLED' \| 'COMPLETED' }` | `201 Created` ou `409 DUPLICATE_ENROLLMENT` |
| **Atualizar Status (`ADMIN`)** | `PUT /api/enrollments/:id` | Body: `{ status: 'ACTIVE' \| 'INACTIVE' \| 'CANCELLED' \| 'COMPLETED' }` | `200 OK` |
| **Excluir Matrícula (`ADMIN`)** | `DELETE /api/enrollments/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.7. Módulo de Conteúdos (`contentService.ts`)
| Ação na Tela `ContentsPage` | Método e Endpoint Real | Parâmetros / Body Real (`contentSchemas.ts`) | Resposta Esperada |
|---|---|---|---|
| **Listar Conteúdos** | `GET /api/contents` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Content[], pagination }` *(inclui `subject`)* |
| **Visualizar Conteúdo** | `GET /api/contents/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Content }` |
| **Criar Conteúdo (`ADMIN`/`PROFESSOR`)** | `POST /api/contents` | Body: `{ title: string, description?: string, subjectId: string (UUID) }` | `201 Created` |
| **Editar Conteúdo (`ADMIN`/`PROFESSOR`)** | `PUT /api/contents/:id` | Body: `{ title?: string, description?: string, subjectId?: string }` | `200 OK` |
| **Excluir Conteúdo (`ADMIN`/`PROFESSOR`)** | `DELETE /api/contents/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.8. Módulo de Atividades (`activityService.ts`)
| Ação na Tela `ActivitiesPage` | Método e Endpoint Real | Parâmetros / Body Real (`contentSchemas.ts`) | Resposta Esperada |
|---|---|---|---|
| **Listar Atividades** | `GET /api/activities` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Activity[], pagination }` *(inclui `content` e `class`)* |
| **Visualizar Atividade** | `GET /api/activities/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Activity }` |
| **Criar Atividade (`ADMIN`/`PROFESSOR`)** | `POST /api/activities` | Body: `{ title: string, description?: string, contentId: string (UUID), classId: string (UUID), dueDate: string (ISO Date), maxScore: number (>0) }` | `201 Created` |
| **Editar Atividade (`ADMIN`/`PROFESSOR`)** | `PUT /api/activities/:id` | Body parcial de `createActivitySchema` | `200 OK` |
| **Excluir Atividade (`ADMIN`/`PROFESSOR`)** | `DELETE /api/activities/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.9. Módulo de Notas (`gradeService.ts`)
| Ação na Tela `GradesPage` | Método e Endpoint Real | Parâmetros / Body Real (`evaluationSchemas.ts`) | Resposta Esperada |
|---|---|---|---|
| **Listar Notas** | `GET /api/grades` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Grade[], pagination }` *(inclui `student` e `activity`)* |
| **Visualizar Nota** | `GET /api/grades/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Grade }` |
| **Registrar Nota (`ADMIN`/`PROFESSOR`)** | `POST /api/grades` | Body: `{ studentId: string (UUID), activityId: string (UUID), score: number (>=0) }` | `201 Created`, `400 INVALID_SCORE` (se `score > activity.maxScore`), `409 DUPLICATE_GRADE` |
| **Atualizar Nota (`ADMIN`/`PROFESSOR`)** | `PUT /api/grades/:id` | Body: `{ score: number (>=0) }` *(Não enviar `studentId` ou `activityId` no `PUT`)* | `200 OK`, `400 INVALID_SCORE` |
| **Excluir Nota (`ADMIN`/`PROFESSOR`)** | `DELETE /api/grades/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.10. Módulo de Frequência (`attendanceService.ts`)
| Ação na Tela `AttendancePage` | Método e Endpoint Real | Parâmetros / Body Real (`evaluationSchemas.ts`) | Resposta Esperada |
|---|---|---|---|
| **Listar Frequências** | `GET /api/attendance` | Query: `?page=1&limit=10` | `200 OK`: `{ success: true, data: Attendance[], pagination }` *(inclui `student` e `class`)* |
| **Visualizar Frequência** | `GET /api/attendance/:id` | Path: `:id` (UUID) | `200 OK`: `{ success: true, data: Attendance }` |
| **Registrar Presença (`ADMIN`/`PROFESSOR`)** | `POST /api/attendance` | Body: `{ studentId: string (UUID), classId: string (UUID), date: string (YYYY-MM-DD), present: boolean }` | `201 Created`, `409 DUPLICATE_ATTENDANCE` |
| **Atualizar Presença (`ADMIN`/`PROFESSOR`)** | `PUT /api/attendance/:id` | Body: `{ present: boolean }` *(Apenas `present` é aceito no `updateAttendanceSchema`)* | `200 OK` |
| **Excluir Frequência (`ADMIN`/`PROFESSOR`)** | `DELETE /api/attendance/:id` | Path: `:id` (UUID) | `204 No Content` |

### 4.11. Módulo de Indicadores e Dashboard (`indicatorService.ts`)
| Ação na Tela `DashboardPage` / `IndicatorsPage` | Método e Endpoint Real | Parâmetros / Permissão Real | Resposta Esperada |
|---|---|---|---|
| **Média Individual do Aluno** | `GET /api/indicators/students/:id/average` | Path: `:id` (`student.id`). Permitido a `ADMIN`, `PROFESSOR` e ao próprio `ALUNO`. | `200 OK`: `{ success: true, data: { studentId: string, average: number } }` |
| **Frequência Individual do Aluno** | `GET /api/indicators/students/:id/attendance` | Path: `:id` (`student.id`). Permitido a `ADMIN`, `PROFESSOR` e ao próprio `ALUNO`. | `200 OK`: `{ success: true, data: { studentId: string, totalClasses: number, present: number, absent: number, attendancePercentage: number } }` |
| **Alunos com Baixo Desempenho** | `GET /api/indicators/low-performance` | Restrito a `ADMIN` e `PROFESSOR`. | `200 OK`: `{ success: true, data: Array<{ studentId: string, name: string, average: number }> }` |
| **Agregações do Dashboard** | `GET /api/indicators/dashboard` | Restrito a `ADMIN` e `PROFESSOR`. | `200 OK`: `{ success: true, data: { totalStudents, totalTeachers, totalClasses, totalSubjects, generalAverage, generalAttendancePercentage, lowPerformanceCount } }` |

---

## 5. Estratégia de Autenticação, Controle de Acesso e Sessão

1. **Armazenamento e Ciclo de Vida do Token JWT:**
   - O Back-End ([src/services/authService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/authService.ts#L41-L45)) emite um Bearer Token JWT stateless (`expiresIn: '1d'`) no corpo de `POST /api/auth/login` e o valida via [authMiddleware.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/middlewares/authMiddleware.ts) no header `Authorization: Bearer <token>`. Não há cookies `HttpOnly` nem *refresh token* implementados na API.
   - O token será armazenado na chave `@EducaAPI:token` (`localStorage`) e validado no boot da aplicação (`AuthContext`) através de chamada imediata a `GET /api/auth/me`.
2. **Estrutura Real de `GET /api/auth/me` e Resolução do Vínculo `User` $\leftrightarrow$ `Student` / `Teacher`:**
   - Atualmente, `GET /api/auth/me` ([userRepository.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/repositories/userRepository.ts#L10-L12)) retorna `{ id, name, email, role, createdAt, updatedAt }` da tabela `users`.
   - Caso o objeto retornado já inclua `student?.id` / `teacher?.id` (se aprimorado no Back-End), o `AuthContext` o utilizará diretamente; caso contrário, percorrerá as páginas de `/api/students` (ou `/api/teachers`) via `fetchAllPages` até localizar o registro onde `record.userId === user.id`, armazenando `linkedStudentId` / `linkedTeacherId` no contexto da sessão.
3. **Comportamento Distinto para HTTP `401` vs. HTTP `403` nos Interceptors (`src/services/api.ts`):**
   - **HTTP `401 Unauthorized` (`UNAUTHORIZED` / `INVALID_TOKEN`):** Indica ausência de token, token malformado ou JWT expirado/inválido. O interceptor de resposta limpa `@EducaAPI:token`, reseta o `AuthContext` e redireciona imediatamente para `/login` (exceto quando o `401 INVALID_CREDENTIALS` vier da própria tentativa de login em `POST /api/auth/login`).
   - **HTTP `403 Forbidden` (`FORBIDDEN`):** Indica que o usuário está autenticado com sessão válida, porém seu perfil (`role`) ou vínculo (`checkStudentAccess`) não possui autorização para o recurso solicitado. O Front-End **mantém a sessão ativa**, bloqueia a operação e exibe mensagem clara de acesso negado.
4. **Cadastro Público (`RegisterPage`) vs. Controle de Acesso Real:**
   - Na tela pública `/register`, o formulário enviará apenas `{ name, email, password }` (sem expor seletor de `role` para evitar indução a erro), mas fica registrado em [docs/AUDITORIA_SEGURANCA_INTEGRACAO_FRONTEND.md](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/docs/AUDITORIA_SEGURANCA_INTEGRACAO_FRONTEND.md) que a proteção efetiva contra elevação de privilégio e o isolamento horizontal de dados de `ALUNO` e `PROFESSOR` dependem de validação no Back-End, nunca apenas de filtragem visual no Front-End.

---

## 6. Planejamento de Responsividade (Desktop, Tablet e Mobile)

A aplicação será projetada *Mobile-First* com Tailwind CSS, garantindo **zero rolagem horizontal indevida (`overflow-x-hidden`)** na página em qualquer resolução (`360px`, `390px`, `768px`, `1024px`, `1440px`):

| Dispositivo / Breakpoint | Navegação (Sidebar & Header) | Grids de Cards e Indicadores | Tabelas de Dados (`DataTable`) | Formulários e Modais |
|---|---|---|---|---|
| **Mobile (`< 768px` — `360px` / `390px`)** | Sidebar oculta por padrão; abre como **Drawer deslizante** com *backdrop* escuro ao tocar no botão Menu (`44x44px`). Fecha automaticamente ao navegar. | 1 coluna empilhada (`grid-cols-1 gap-4`). | **Modo Card Mobile (`md:hidden`)**: cada linha da tabela é renderizada como um card estruturado com rótulos claros e botões de ação grandes adequados ao toque, eliminando tabelas espremidas. | Coluna única (`grid-cols-1`), botões com largura total (`w-full`) e altura mínima de `44px`. Modais ocupam a largura útil da tela (`w-[95vw] max-h-[90vh] overflow-y-auto`). |
| **Tablet (`768px – 1023px` — `md:`)** | Sidebar recolhível (modo compacto com ícones e tooltips ou drawer rápido) para maximizar a área útil de conteúdo. | 2 colunas (`md:grid-cols-2 gap-4`). | Tabela com container de rolagem horizontal suave e isolada (`overflow-x-auto`) e colunas prioritárias visíveis. | 2 colunas para campos curtos (`md:grid-cols-2 gap-4`), botões alinhados à direita no rodapé do modal. |
| **Desktop (`1024px – 1440px+` — `lg:` / `xl:`)** | Sidebar fixa à esquerda (`w-64` expandida ou `w-20` recolhida pelo usuário), Header com Breadcrumb, busca rápida e perfil completo. | 3 a 4 colunas (`lg:grid-cols-4 gap-6`). | Tabela completa (`hidden md:block`) com cabeçalho fixo, alinhamento numérico tabular e ações inline. | Layout em 2 colunas organizadas por contexto semântico, modais centralizados (`max-w-lg` ou `max-w-2xl`). |

---

## 7. Definição dos Componentes Reutilizáveis

1. **`Sidebar`**: Navegação lateral com logotipo EducaAPI, indicador de rota ativa, recolhimento no desktop, modo Drawer no mobile e botão de Logout.
2. **`Header`**: Barra superior com gatilho do menu mobile, Breadcrumb dinâmico, badge do perfil autenticado (`ADMIN`, `PROFESSOR`, `ALUNO`), nome/e-mail do usuário e ação de sair.
3. **`PageHeader`**: Cabeçalho padronizado de módulo com título `H1`, descrição contextual e slot de ações principais (ex.: botão `+ Novo Aluno` envolto em `RoleGuard`).
4. **`StatCard`**: Card de KPI para o Dashboard exibindo título, valor formatado, ícone temático, subtítulo explicativo e variante semântica (`primary`, `success`, `warning`, `danger`).
5. **`DataTable<T>`**: Componente genérico tipado que renderiza automaticamente:
   - Tabela tradicional em telas `md+`;
   - Lista de cards estruturados em telas `< md` (Mobile);
   - Integração nativa com `LoadingState`, `EmptyState` e `Pagination`.
6. **`SearchInput`**: Campo de pesquisa com ícone de lupa, botão para limpar termo e filtragem instantânea.
7. **`Pagination`**: Controles de navegação entre páginas (`Anterior`, números de página, `Próxima`), exibindo total de registros e página atual com base no objeto `pagination: { page, limit, total, totalPages }` retornado pela API.
8. **`Modal` & `ConfirmDialog`**:
   - `Modal`: Janela acessível com fechamento via tecla `ESC`, clique no backdrop, bloqueio de scroll de fundo e cabeçalho/rodapé fixos.
   - `ConfirmDialog`: Diálogo de confirmação obrigatória antes de operações destrutivas (`DELETE`), exibindo o nome do item que será excluído e estado de carregamento no botão de confirmação.
9. **`FormField` & `SelectField`**: Wrappers acessíveis para `<input>`, `<textarea>` e `<select>` integrados ao `react-hook-form`, exibindo `<label htmlFor>`, indicador de campo obrigatório (`*`), estado de erro em vermelho e mensagem de validação do Zod.
10. **`LoadingState`, `EmptyState`, `ErrorState`**: Componentes padronizados para feedback visual durante requisições assíncronas, listas sem registros e falhas de comunicação com botão "Tentar novamente".
11. **`ToastContainer`**: Notificações flutuantes não intrusivas para confirmar cadastros, edições, exclusões e alertar sobre erros da API (como nota maior que `maxScore` ou matrícula duplicada).

---

## 8. Planejamento de Dashboards, Paginação Completa e Indicadores (Recharts + Dados Reais)

Seguindo a regra estrita de **jamais inventar ou simular dados inexistentes**, os gráficos e indicadores serão alimentados exclusivamente pelos dados reais retornados pela EducaAPI:

### 8.1. Estratégia de Paginação Completa (`fetchAllPages` — Suporte a $> 100$ Registros)
- Os endpoints de listagem do Back-End retornam o contrato `{ success: true, data: T[], pagination: { page, limit, total, totalPages } }`.
- O Front-End **não assumirá `limit=100` como total garantido**. Será implementado o utilitário `fetchAllPages<T>(endpoint, pageSize = 100)` em `src/utils/paginationHelper.ts`:
  1. Requisita a página `1` (`?page=1&limit=100`);
  2. Inspeciona `pagination.totalPages` e `pagination.total`;
  3. Caso `pagination.totalPages > 1` (cenários com mais de 100 registros), requisita todas as páginas restantes (`2..totalPages`) e concatena os arrays `data`, garantindo que 100% dos registros sejam recuperados sem truncamento silencioso.

### 8.2. Parametrização da Nota Mínima de Corte (`6.0`)
- No Back-End, o corte de baixo desempenho está formalizado de forma fixa em [src/services/indicatorService.ts](file:///c:/Users/Stanlr/Documents/Projetos_Dev_Stanlr/Projeto_Back-end_API/src/services/indicatorService.ts#L45) (`.filter((s) => s !== null && s.average < 6.0)`).
- No Front-End, esse limiar será centralizado na constante configurável `MIN_PASSING_AVERAGE = Number(import.meta.env.VITE_MIN_PASSING_AVERAGE ?? 6.0)` em `src/utils/formatters.ts`, mantendo total consistência com o `6.0` da API e evitando valores mágicos espalhados nos componentes.

### 8.3. Dashboard Institucional (`ADMIN` e `PROFESSOR`)
1. **7 Cards de Indicadores (Fonte: `GET /api/indicators/dashboard`)**:
   - **Total de Alunos** (`totalStudents`)
   - **Total de Professores** (`totalTeachers`)
   - **Total de Turmas** (`totalClasses`)
   - **Total de Disciplinas** (`totalSubjects`)
   - **Média Geral da Instituição** (`generalAverage` formatado com 2 casas decimais)
   - **Frequência Média Geral** (`generalAttendancePercentage` formatado em `%`)
   - **Alunos em Baixo Desempenho** (`lowPerformanceCount` — destaque em laranja/vermelho se $> 0$, verde se $0$)
2. **Gráficos Reais com Recharts**:
   - **Gráfico 1 — Comparativo de Desempenho por Aluno / Alunos em Risco (`BarChart`):** Consumindo `GET /api/indicators/low-performance` e a varredura completa de `GET /api/grades` via `fetchAllPages`, exibe as médias reais calculadas por aluno comparadas à linha de referência `MIN_PASSING_AVERAGE` (`6.0`). Caso não haja notas lançadas, exibe `EmptyState`.
   - **Gráfico 2 — Taxa Geral de Presença vs. Ausência (`PieChart` / `Donut`):** Consumindo `generalAttendancePercentage` de `GET /api/indicators/dashboard` (e contagem real de `GET /api/attendance` via `fetchAllPages`), plota a proporção exata de presenças (`%`) vs. faltas (`100% - %`). Caso não haja registros de chamada, exibe `EmptyState`.
   - **Gráfico 3 — Visão Geral das Atividades e Notas Máximas (`BarChart`):** Consumindo `GET /api/activities` e `GET /api/grades` via `fetchAllPages`, apresenta a média obtida pelos alunos em cada atividade avaliativa em relação ao seu `maxScore`.

### 8.4. Dashboard do Estudante (`ALUNO`)
Como `GET /api/indicators/dashboard` retorna `403 FORBIDDEN` para `ALUNO`, quando um `ALUNO` acessa `/dashboard`, a página consome os endpoints permitidos ao seu perfil:
- **Card Minha Média Geral:** `GET /api/indicators/students/:studentId/average`
- **Card Minha Frequência (%):** `GET /api/indicators/students/:studentId/attendance` (`attendancePercentage`, `present`, `absent`, `totalClasses`)
- **Gráfico de Rosca (`PieChart`) de Presenças × Faltas Individuais:** Baseado em `present` e `absent` reais do aluno.
- **Gráfico de Barras (`BarChart`) de Minhas Notas por Atividade:** Filtrando os registros de `GET /api/grades` (recuperados via `fetchAllPages`) pelo `studentId` do aluno logado (`score` vs `activity.maxScore`).

---

## 9. Estratégia de Tratamento de Erros, Carregamento e Estados Vazios

1. **Mapeamento de Códigos de Erro do Back-End (`errorParser.ts`):**
   O Back-End retorna `{ success: false, error: { message, code, details? } }`. O Front-End traduzirá e exibirá cada caso com clareza:
   - `VALIDATION_ERROR` (`400`): Exibe a mensagem específica de cada campo vinda de `error.details` (Zod) ou no Toast.
   - `INVALID_SCORE` (`400`): Exibe alerta claro: *"A nota informada excede a nota máxima permitida para esta atividade"*.
   - `INVALID_CREDENTIALS` (`401`): Exibe alerta no formulário de login: *"E-mail ou senha incorretos"*.
   - `UNAUTHORIZED` / `INVALID_TOKEN` (`401`): Redireciona para `/login` limpando a sessão expirada.
   - `FORBIDDEN` (`403`): Exibe mensagem: *"Você não possui permissão para realizar esta operação"* (preservando a sessão).
   - `DUPLICATE_RECORD` / `EMAIL_ALREADY_EXISTS` / `DUPLICATE_ENROLLMENT` / `DUPLICATE_GRADE` / `DUPLICATE_ATTENDANCE` (`409`): Exibe a mensagem exata do conflito retornada pela API.
   - `INTERNAL_ERROR` (`500` em exclusão com `onDelete: Restrict`, como excluir Professor ou Disciplina que possui Turma vinculada): Exibe mensagem orientativa amigável explicando que o registro possui vínculos ativos que impedem a exclusão direta.
   - **Erro de Rede (`ERR_NETWORK`):** Exibe `ErrorState` com botão *"Tentar novamente"* caso o servidor esteja inacessível.
2. **Estados de Carregamento (`LoadingState`):**
   - Skeletons e spinners suaves durante o carregamento inicial de tabelas e cards do Dashboard;
   - Botões de submissão de formulário desabilitados (`disabled={isSubmitting}`) com spinner interno para impedir envios duplicados.
3. **Estados Vazios (`EmptyState`):**
   - Quando uma listagem retornar `data: []` ou uma busca não encontrar resultados, será exibido o componente `EmptyState` com ícone ilustrativo, explicação clara e botão de ação.

---

## 10. Plano de Implementação por Fases e Plano de Testes de Segurança e Integração

### 10.1. Cronograma de Execução das Próximas Fases (Fases 3 a 14)

| Fase | Escopo de Implementação | Entregáveis Principais |
|---|---|---|
| **FASE 3** | Configuração do Front-End | Projeto Vite + React + TypeScript em `frontend/`, Tailwind CSS, React Router, Axios, Lucide React, React Hook Form, Zod, Recharts, `.env` (`VITE_API_URL=http://localhost:3000/api`), `.env.example`, `paginationHelper.ts` e tipos globais (`api.types.ts`). |
| **FASE 4** | Design System e Layout Principal | Paleta e estilos base, `Button`, `Badge`, `Card`, `StatCard`, `Modal`, `ConfirmDialog`, `FormField`, `SelectField`, `DataTable`, `Pagination`, `SearchInput`, `LoadingState`, `EmptyState`, `ErrorState`, `ToastContext`, `Sidebar`, `Header` e `AppLayout` responsivo. |
| **FASE 5** | Autenticação e Controle de Acesso | `api.ts` (Axios + Interceptors `401`/`403`), `authService.ts`, `AuthContext.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `ProtectedRoute.tsx`, `RoleGuard.tsx` e teste real de login com os perfis do seed. |
| **FASE 6** | Dashboard e Gráficos | `indicatorService.ts`, `DashboardPage.tsx` (visão `ADMIN`/`PROFESSOR` e visão `ALUNO`) e gráficos Recharts consumindo dados reais via `fetchAllPages`. |
| **FASE 7** | Cadastros Básicos | `studentService.ts`, `StudentsPage.tsx` (com modal de detalhes e indicadores individuais), `teacherService.ts`, `TeachersPage.tsx`, `subjectService.ts` e `SubjectsPage.tsx`. |
| **FASE 8** | Estrutura Acadêmica | `classService.ts`, `ClassesPage.tsx`, `enrollmentService.ts` e `EnrollmentsPage.tsx` (com gestão de status de matrícula). |
| **FASE 9** | Conteúdos e Atividades | `contentService.ts`, `ContentsPage.tsx`, `activityService.ts` e `ActivitiesPage.tsx` (com `dueDate` e `maxScore`). |
| **FASE 10** | Avaliações (Notas e Frequência) | `gradeService.ts`, `GradesPage.tsx` (com validação de `maxScore`), `attendanceService.ts` e `AttendancePage.tsx` (com chamada diária e toggle de presença). |
| **FASE 11** | Módulo de Indicadores Educacionais | `IndicatorsPage.tsx` dedicada à análise individual de alunos (média, frequência detalhada) e painel de intervenção para alunos com baixo desempenho (ODS 4). |
| **FASE 12** | Responsividade e Refinamento UX | Testes e ajustes finos em `360px`, `390px`, `768px`, `1024px` e `1440px`, acessibilidade por teclado, foco visível e contraste. |
| **FASE 13** | Testes Completos e Auditoria Final | Execução da bateria completa de testes de segurança, integração e geração de `docs/AUDITORIA_SPRINT_2.md`. |
| **FASE 14** | Entrega Final | Atualização do `README.md` raiz e do `frontend/README.md` com instruções completas para avaliação e publicação no GitHub. |

### 10.2. Matriz Obrigatória de Testes de Segurança e Integração
1. **Cadastro público com tentativa de criação de `ADMIN`:** Validar que a tela pública `/register` não permite seleção de `ADMIN`/`PROFESSOR` e testar se a API bloqueia/força `role: ALUNO`.
2. **Aluno tentando consultar dados de outro aluno:** Autenticar como `ana@educaapi.com` (`ALUNO`) e testar tentativa de acesso a `/api/indicators/students/:id_do_joao/average` e `/attendance` (deve receber `403 FORBIDDEN`) e verificar isolamento nas listagens acadêmicas.
3. **Professor tentando acessar/modificar dados fora de sua autorização:** Autenticar como `carlos@educaapi.com` (`PROFESSOR`) e testar tentativa de `POST`/`PUT`/`DELETE` em `/api/students`, `/api/teachers`, `/api/subjects`, `/api/classes` e `/api/enrollments` (deve receber `403 FORBIDDEN`), além de verificar restrição às suas próprias turmas.
4. **Acesso indevido a módulos administrativos:** Autenticar como `ALUNO` e verificar que todas as rotas de escrita e os endpoints `/api/indicators/dashboard` e `/api/indicators/low-performance` retornam `403 FORBIDDEN`.
5. **JWT expirado ou inválido:** Injetar token corrompido/expirado em `@EducaAPI:token` e verificar que a API responde `401 INVALID_TOKEN` e o interceptor do Front-End limpa a sessão e redireciona para `/login`.
6. **Paginação com mais de 100 registros:** Validar o funcionamento de `Pagination` nas tabelas e do helper `fetchAllPages` quando `pagination.total > 100` (`totalPages > 1`), garantindo recuperação integral de todas as páginas.
7. **Navegação direta para páginas protegidas:** Acessar diretamente via barra de endereços `/dashboard`, `/students`, `/grades`, `/indicators` sem sessão ativa (deve redirecionar imediatamente para `/login` via `ProtectedRoute`).
8. **Falhas de comunicação com a API:** Simular indisponibilidade de rede/servidor e validar que a UI renderiza o componente `ErrorState` com opção de nova tentativa e nunca exibe falso sucesso.


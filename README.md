# EducaAPI — Plataforma de Gestão Educacional e Inteligência Acadêmica (ODS 4)

A **EducaAPI** é uma plataforma *full-stack* de gestão educacional composta por uma **API RESTful em Node.js + TypeScript + Express + Prisma + PostgreSQL** e uma **aplicação Web SPA em React + TypeScript + Vite + Tailwind CSS**. O sistema centraliza o ciclo de vida acadêmico de instituições de ensino e disponibiliza indicadores analíticos em tempo real para prevenção da evasão escolar e acompanhamento pedagógico.

---

## Sumário

1. [Apresentação do EducaAPI](#1-apresentação-do-educaapi)
2. [Objetivo do Projeto e Relação com o ODS 4 — Educação de Qualidade](#2-objetivo-do-projeto-e-relação-com-o-ods-4--educação-de-qualidade)
3. [Principais Funcionalidades](#3-principais-funcionalidades)
4. [Perfis de Acesso (RBAC): ADMIN, PROFESSOR e ALUNO](#4-perfis-de-acesso-rbac-admin-professor-e-aluno)
5. [Tecnologias Utilizadas](#5-tecnologias-utilizadas)
6. [Arquitetura Geral do Projeto](#6-arquitetura-geral-do-projeto)
7. [Estrutura de Pastas](#7-estrutura-de-pastas)
8. [Pré-requisitos de Instalação](#8-pré-requisitos-de-instalação)
9. [Configuração do PostgreSQL](#9-configuração-do-postgresql)
10. [Configuração das Variáveis de Ambiente](#10-configuração-das-variáveis-de-ambiente)
11. [Instalação das Dependências do Back-End](#11-instalação-das-dependências-do-back-end)
12. [Instalação das Dependências do Front-End](#12-instalação-das-dependências-do-front-end)
13. [Validação do Prisma e Geração do Prisma Client](#13-validação-do-prisma-e-geração-do-prisma-client)
14. [Execução Segura das Migrations em Ambiente Local](#14-execução-segura-das-migrations-em-ambiente-local)
15. [Execução do Seed Inicial](#15-execução-do-seed-inicial)
16. [Como Iniciar o Back-End](#16-como-iniciar-o-back-end)
17. [Como Iniciar o Front-End](#17-como-iniciar-o-front-end)
18. [Endereços Locais da API, Swagger e Aplicação Web](#18-endereços-locais-da-api-swagger-e-aplicação-web)
19. [Como Executar Testes, Lint e Build](#19-como-executar-testes-lint-e-build)
20. [Observações sobre Segurança e Limitações Conhecidas](#20-observações-sobre-segurança-e-limitações-conhecidas)

---

## 1. Apresentação do EducaAPI

O **EducaAPI** foi projetado para resolver a fragmentação de dados escolares e a dificuldade de monitoramento contínuo do desempenho discente. Além das operações cadastrais e letivas (usuários, alunos, professores, disciplinas, turmas, matrículas, conteúdos, atividades, notas e frequência), o sistema consolida métricas acadêmicas para apoiar decisões pedagógicas baseadas em evidências.

---

## 2. Objetivo do Projeto e Relação com o ODS 4 — Educação de Qualidade

Alinhado ao **Objetivo de Desenvolvimento Sustentável 4 (ODS 4 — Educação de Qualidade)** da Agenda 2030 da ONU, o **EducaAPI** atua diretamente no combate à defasagem de aprendizagem e à evasão escolar:

- **Monitoramento Preventivo:** Calcula automaticamente médias aritméticas e taxas de assiduidade por estudante e turma.
- **Identificação Precoce de Risco Acadêmico:** Sinaliza estudantes com média inferior ao patamar institucional (`< 6,0`) ou com baixa frequência escolar (`< 75%`), permitindo intervenção pedagógica antes da reprovação ou abandono.
- **Transparência para o Estudante:** Oferece boletim estruturado, histórico de frequência e acompanhamento individual de indicadores para fortalecer a autonomia nos estudos.

---

## 3. Principais Funcionalidades

- **Autenticação e Sessão Segura (`/api/auth`):** Registro de contas, login com criptografia `bcrypt`, emissão de token JWT e consulta de perfil autenticado (`GET /api/auth/me`) com resolução automática de vínculos (`studentId` / `teacherId`).
- **Gestão de Alunos, Professores e Disciplinas (`/api/students`, `/api/teachers`, `/api/subjects`):** Criação integrada de usuário e perfil acadêmico em transação atômica (`prisma.$transaction`), listagem paginada, edição e exclusão protegida contra perda de histórico.
- **Turmas e Matrículas (`/api/classes`, `/api/enrollments`):** Oferta de disciplinas por ano/semestre, associação de docente responsável, controle do ciclo de vida da matrícula (`ACTIVE`, `INACTIVE`, `CANCELLED`, `COMPLETED`) e prevenção de duplicidade `(studentId, classId)`.
- **Conteúdos Programáticos e Atividades Avaliativas (`/api/contents`, `/api/activities`):** Organização curricular por disciplina, publicação de atividades avaliativas com data de entrega (`dueDate`) e pontuação máxima (`maxScore`), validando a compatibilidade entre a disciplina do conteúdo e a disciplina da turma.
- **Notas e Boletim Escolar (`/api/grades`):** Lançamento e retificação de notas para alunos com matrícula ativa (`ACTIVE`), travas contra pontuação superior ao `maxScore` da atividade e visão consolidada de boletim no Front-End.
- **Frequência Escolar (`/api/attendance`):** Registro de chamadas diárias (`present: true/false`), prevenção de duplicidade por `(studentId, classId, date)` e acompanhamento de assiduidade consolidada e individual.
- **Indicadores Educacionais ODS 4 (`/api/indicators`):**
  - `GET /api/indicators/dashboard`: Panorama institucional (totais de alunos, professores, turmas, disciplinas, média geral, frequência média e total de alunos em baixo desempenho).
  - `GET /api/indicators/low-performance`: Lista de estudantes com média inferior a `6,0`.
  - `GET /api/indicators/students/:id/average`: Média individual do estudante.
  - `GET /api/indicators/students/:id/attendance`: Resumo de aulas, presenças, faltas e percentual de frequência do estudante.

---

## 4. Perfis de Acesso (RBAC): ADMIN, PROFESSOR e ALUNO

O controle de acesso é aplicado no Back-End (`authMiddleware`, `roleMiddleware` e filtros de escopo na camada de `Service`) e refletido na interface do Front-End:

| Módulo / Recurso | `ADMIN` | `PROFESSOR` | `ALUNO` |
| :--- | :--- | :--- | :--- |
| **Dashboard e Indicadores ODS 4** | Visão institucional completa | Indicadores das próprias turmas e alunos vinculados | Exclusivamente os próprios indicadores |
| **Alunos (`Students`)** | CRUD completo | Consulta de alunos | Consulta exclusivamente do próprio cadastro |
| **Professores (`Teachers`)** | CRUD completo | Consulta de professores | Consulta de professores |
| **Disciplinas (`Subjects`)** | CRUD completo | Consulta de disciplinas | Consulta de disciplinas |
| **Turmas (`Classes`)** | CRUD completo | Consulta apenas das próprias turmas | Consulta apenas de turmas com matrícula `ACTIVE` |
| **Matrículas (`Enrollments`)** | CRUD e gestão de status | Consulta de matrículas das próprias turmas | Consulta exclusivamente das próprias matrículas |
| **Conteúdos (`Contents`)** | CRUD completo | Leitura dos conteúdos das disciplinas que leciona | Leitura dos conteúdos de turmas com matrícula `ACTIVE` |
| **Atividades (`Activities`)** | CRUD completo | CRUD exclusivamente nas próprias turmas | Consulta de atividades de turmas com matrícula `ACTIVE` |
| **Notas (`Grades`)** | CRUD completo | Lançamento, edição, exclusão e leitura nas próprias turmas | Consulta exclusivamente das próprias notas (Boletim) |
| **Frequência (`Attendance`)** | CRUD completo | Chamada, edição, exclusão e leitura nas próprias turmas | Consulta exclusivamente da própria frequência |

---

## 5. Tecnologias Utilizadas

### Back-End
- **Runtime & Linguagem:** Node.js + TypeScript (`^5.6.2`)
- **Framework Web:** Express.js (`^4.21.0`)
- **ORM & Banco de Dados:** Prisma ORM (`^5.19.1`) + PostgreSQL
- **Validação de Esquemas:** Zod (`^3.23.8`)
- **Autenticação & Segurança:** JSON Web Token (`jsonwebtoken`), `bcrypt`, `helmet`, `cors`, `dotenv`
- **Documentação da API:** Swagger UI (`swagger-ui-express` / OpenAPI 3.0)
- **Testes & Qualidade:** Jest (`^29.7.0`), `ts-jest`, ESLint (`^9.10.0`), Prettier (`^3.3.3`)

### Front-End (`frontend/`)
- **Biblioteca UI & Build Tool:** React 18 (`^18.3.1`) + TypeScript + Vite (`^5.4.10`)
- **Roteamento:** React Router DOM (`^6.28.0`)
- **Gerenciamento de Estado Assíncrono:** TanStack React Query (`^5.59.20`) + Axios (`^1.7.7`)
- **Formulários & Validação:** React Hook Form (`^7.53.2`) + `@hookform/resolvers` + Zod
- **Estilização & Visualização de Dados:** Tailwind CSS (`^3.4.14`), Lucide React (`^0.454.0`), Recharts (`^2.13.3`)

---

## 6. Arquitetura Geral do Projeto

O projeto adota **Arquitetura em Camadas** com estrita separação de responsabilidades (SoC):

```text
[Front-End React SPA (Vite)]
        │  HTTP / JSON (Bearer JWT)
        ▼
[Express Router (src/routes)]
        │
        ▼
[Middlewares (authMiddleware -> roleMiddleware -> validateMiddleware Zod)]
        │
        ▼
[Controllers (src/controllers)]  ── Padronização HTTP ({ success, data, error })
        │
        ▼
[Services (src/services)]        ── Regras de negócio, RBAC horizontal e integridade
        │
        ▼
[Repositories (src/repositories)] ── Acesso a dados e transações Prisma ($transaction)
        │
        ▼
[PostgreSQL Database (prisma/schema.prisma)]
```

---

## 7. Estrutura de Pastas

```text
Projeto_Back-end_API/
├── docs/                        # Relatórios técnicos de auditoria, segurança e fases do projeto
├── frontend/                    # Aplicação Web SPA (React + TypeScript + Vite + Tailwind CSS)
│   ├── public/
│   ├── src/
│   │   ├── components/          # Design System reutilizável e layouts protegidos
│   │   ├── contexts/            # Contextos de autenticação e notificações (Toast)
│   │   ├── hooks/               # Hooks customizados (useAuth, useToast)
│   │   ├── pages/               # Páginas modulares (Dashboard, Alunos, Turmas, Notas, Frequência, ODS 4, etc.)
│   │   ├── routes/              # Configuração de rotas e guardas de perfil
│   │   ├── schemas/             # Schemas Zod de validação de formulários
│   │   ├── services/            # Clientes HTTP Axios por domínio da API
│   │   ├── types/               # Contratos TypeScript alinhados à API
│   │   └── utils/               # Formatadores e utilitários
│   ├── .env.example             # Exemplo de variáveis de ambiente do Front-End
│   ├── package.json
│   └── vite.config.ts
├── prisma/
│   ├── migrations/              # Histórico de migrations SQL versionadas
│   │   └── 20261104000000_init/ # Migration inicial do esquema relacional
│   ├── schema.prisma            # Modelagem das 10 entidades e enums no Prisma
│   └── seed.ts                  # Script de seed idempotente (upsert)
├── src/
│   ├── controllers/             # Controladores HTTP
│   ├── docs/
│   │   └── swagger.json         # Especificação OpenAPI 3.0 servida em /api-docs
│   ├── middlewares/             # Autenticação JWT, autorização RBAC, validação Zod e erros
│   ├── repositories/            # Camada de persistência Prisma ORM
│   ├── routes/                  # Definição das rotas da API
│   ├── schemas/                 # Schemas Zod de entrada da API
│   ├── services/                # Regras de negócio e cálculos de indicadores
│   ├── types/                   # Extensões de tipagem do Express (req.user)
│   ├── app.ts                   # Configuração do Express, middlewares e rotas
│   └── server.ts                # Entrypoint HTTP da API
├── tests/
│   └── business.test.ts         # Suíte de testes automatizados (Jest)
├── .dockerignore
├── .env.example                 # Exemplo de variáveis de ambiente do Back-End
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js
├── jest.config.js
├── package.json
├── README.md
└── tsconfig.json
```

---

## 8. Pré-requisitos de Instalação

- **Node.js:** v20.x LTS ou superior (compatível com v20/v22/v24)
- **npm:** v10.x ou superior
- **PostgreSQL:** v15 ou superior (local ou via Docker)
- **Git:** para clonagem e controle de versão

---

## 9. Configuração do PostgreSQL

Crie um banco de dados dedicado no seu servidor PostgreSQL local (nome padrão sugerido: `educa_api`):

```sql
CREATE DATABASE educa_api;
```

Alternativamente, caso deseje subir apenas o banco via Docker ou o ambiente conteinerizado, consulte o arquivo [`docker-compose.yml`](docker-compose.yml).

---

## 10. Configuração das Variáveis de Ambiente

### 10.1. Back-End (`.env` na raiz)
Copie o arquivo [`.env.example`](.env.example) para `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com os dados do seu ambiente local:

```env
PORT=3000
JWT_SECRET="substitua_por_uma_chave_secreta_jwt_forte_e_exclusiva"
DATABASE_URL="postgresql://usuario:senha_ficticia@localhost:5432/educa_api?schema=public"
```

### 10.2. Front-End (`frontend/.env`)
Copie o arquivo [`frontend/.env.example`](frontend/.env.example) para `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

Conteúdo padrão de `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_MIN_PASSING_AVERAGE=6.0
```

> **Nota:** Os arquivos `.env` e `.env.*` (como `.env.development`) contêm configurações locais e estão protegidos pelo [`.gitignore`](.gitignore). Nunca versione arquivos `.env` reais.

---

## 11. Instalação das Dependências do Back-End

Na raiz do projeto, execute:

```bash
npm install
```

---

## 12. Instalação das Dependências do Front-End

Acesse o diretório `frontend/` e instale as dependências:

```bash
cd frontend
npm install
cd ..
```

---

## 13. Validação do Prisma e Geração do Prisma Client

Na raiz do projeto, valide o schema do Prisma e gere o cliente tipado:

```bash
npx prisma validate
npx prisma generate
```

---

## 14. Execução Segura das Migrations em Ambiente Local

O projeto possui a migration inicial consolidada `20261104000000_init` em [`prisma/migrations/20261104000000_init/migration.sql`](prisma/migrations/20261104000000_init/migration.sql).

1. Verifique o estado das migrations em relação ao banco configurado:
   ```bash
   npx prisma migrate status
   ```
2. Para aplicar as migrations existentes de maneira segura (sem recriar migrations ou apagar dados):
   ```bash
   npx prisma migrate deploy
   ```
   *(Em ambiente de desenvolvimento inicial com banco recém-criado, `npx prisma migrate dev` também reconhecerá e aplicará a migration `20261104000000_init`).*

> **Importante:** Nunca execute `npx prisma migrate reset` em bancos que contenham dados que devam ser preservados.

---

## 15. Execução do Seed Inicial

O script [`prisma/seed.ts`](prisma/seed.ts) é **idempotente** (utiliza `upsert` / `findFirst`, sem apagar registros existentes) e cria a estrutura base para testes locais (1 Administrador, 1 Professor, 2 Alunos, 1 Disciplina, 1 Turma, 2 Matrículas ativas, 1 Conteúdo, 2 Atividades, 4 Notas e 4 Registros de Frequência):

```bash
npm run seed
```

---

## 16. Como Iniciar o Back-End

### Modo Desenvolvimento (com recarregamento automático via Nodemon):
```bash
npm run dev
```

### Modo Produção (Build TypeScript + Start):
```bash
npm run build
npm start
```

---

## 17. Como Iniciar o Front-End

Em outro terminal, acesse a pasta `frontend/` e inicie o servidor de desenvolvimento do Vite:

```bash
cd frontend
npm run dev
```

---

## 18. Endereços Locais da API, Swagger e Aplicação Web

| Serviço | Endereço Local | Descrição |
| :--- | :--- | :--- |
| **API Base URL** | `http://localhost:3000/api` | Ponto de entrada dos endpoints REST |
| **Healthcheck** | `http://localhost:3000/health` | Verificação de disponibilidade da API |
| **Swagger UI** | `http://localhost:3000/api-docs` | Documentação interativa OpenAPI 3.0 |
| **Front-End Web (Dev)** | `http://localhost:5173` | Interface Web React (Vite) |

---

## 19. Como Executar Testes, Lint e Build

### Back-End (na raiz do projeto):
```bash
# Executar a suíte de testes automatizados (Jest — 44 testes)
npm test

# Verificar padronização estática de código (ESLint)
npm run lint

# Compilar TypeScript para JavaScript em dist/ e copiar swagger.json
npm run build
```

### Front-End (em `frontend/`):
```bash
cd frontend

# Verificação de tipos TypeScript (tsc --noEmit)
npm run lint

# Build de produção do Front-End (tsc -b && vite build)
npm run build
```

---

## 20. Observações sobre Segurança e Limitações Conhecidas

### Mecanismos de Segurança Implementados
1. **Revalidação de Privilégios em Tempo Real (`authMiddleware`):** A cada requisição autenticada, o Back-End consulta o banco de dados para confirmar que o usuário do token JWT continua existindo e aplica o `role` atual armazenado no banco, prevenindo uso de tokens antigos após revogação ou alteração de perfil.
2. **Prevenção de Escalonamento de Privilégio no Cadastro (`/api/auth/register`):** Cadastros públicos sem token de `ADMIN` válido só podem criar contas com perfil `ALUNO`.
3. **Validação, Coerção e Sanitização com Zod (`validateMiddleware`):** Todos os payloads `POST` e `PUT` têm `req.body` substituído pelo retorno de `schema.parse(req.body)`, garantindo coerção segura de datas (`z.coerce.date()`) e remoção automática de campos não declarados (`.strip()`), mitigando *Mass Assignment*.
4. **Integridade de Contas e Preservação de Histórico Acadêmico:**
   - Exclusões de `Student` e `Teacher` são bloqueadas (`409 Conflict`) quando possuem histórico ou dependências (`STUDENT_HAS_HISTORY`, `TEACHER_HAS_DEPENDENCIES`).
   - Quando permitidas, ocorrem em transação (`prisma.$transaction`), removendo também a conta `User` associada caso ela não possua outros vínculos legítimos.
   - Exclusões físicas de `Enrollment` são bloqueadas (`409 ENROLLMENT_HAS_HISTORY`) quando o estudante possui notas ou frequências registradas naquela turma, orientando a alteração de status para `INACTIVE` ou `CANCELLED`.
   - Exclusões de `Class`, `Subject`, `Content` e `Activity` com dependências vinculadas também são bloqueadas com `409 Conflict`.

### Limitações Conhecidas e Evoluções Planejadas (Subfases 4.2.3+)
- **Filtro de matrículas ativas em contagens secundárias de indicadores (`IndicatorService`):** Algumas contagens agregadas de turmas no serviço de indicadores ainda consideram todas as matrículas da relação sem filtrar exclusivamente `status: 'ACTIVE'` (previsto para a subfase de indicadores da Fase 4.2).
- **Validação de propriedade da turma em `AttendanceService.record`:** O método auxiliar `record` (upsert de chamada) será alinhado às mesmas travas de vínculo docente já aplicadas em `AttendanceService.create/update/delete`.
- **Sincronização documental do `swagger.json`:** Alguns exemplos da especificação estática `src/docs/swagger.json` serão atualizados na subfase documental da Fase 4.2 para refletir todos os códigos `409 Conflict` adicionados nas fases recentes.

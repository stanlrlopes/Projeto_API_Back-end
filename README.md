# EducaAPI 🎓

Uma API RESTful para gestão educacional inteligente, desenvolvida para promover análises de desempenho acadêmico e intervir ativamente em casos de risco escolar.

## 🌍 Relação com o ODS 4 (Educação de Qualidade)
Este projeto atua como um motor analítico diretamente alinhado ao Objetivo de Desenvolvimento Sustentável 4 (ODS 4) da ONU. A **EducaAPI** vai além do tradicional "cadastro de notas e faltas": ela extrai inteligência em tempo real. Através de seus endpoints de **Indicadores e Dashboard**, a plataforma mapeia frequências e avalia médias ponderadas, identificando automaticamente "Alunos com Baixo Desempenho", o que permite às instituições intervirem antecipadamente para evitar a evasão escolar e garantir um acompanhamento educacional humanizado.

## 🚀 Tecnologias Utilizadas
A arquitetura foi construída com foco em tipagem estática, segurança estrutural e performance:
- **Node.js** com **TypeScript**: Base sólida e fortemente tipada.
- **Express.js**: Framework rápido para construção do roteamento.
- **Prisma ORM**: Modelagem intuitiva e *type-safe* do banco de dados relacional.
- **PostgreSQL**: Banco de dados relacional robusto.
- **Zod**: Ferramenta rigorosa para validação do payload (esquemas baseados no TypeScript).
- **JWT (JSON Web Token)** e **Bcrypt**: Para controle de autenticação e criptografia de senhas.
- **Swagger (OpenAPI 3)**: Documentação viva para uso e testes diretos no navegador.
- **Jest**: Testes unitários para validar a lógica analítica isoladamente.
- **Docker**: Conteinerização prática da aplicação e do banco.

## ⚙️ Instruções de Instalação e Execução

Você pode escolher rodar o projeto localmente via Node.js nativo ou via orquestração por contêineres utilizando o Docker.

### 🐳 Via Docker (Recomendado)
A maneira mais prática. O Docker cuida de instanciar o banco PostgreSQL, definir a URL de acesso e levantar a API.

1. Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Abra o terminal na pasta do projeto e rode:
   ```bash
   docker-compose up --build
   ```
3. A aplicação estará ativa em `http://localhost:3000` após a finalização do build.

### 💻 Via Instalação Local
Se preferir rodar direto na máquina e gerenciar seu próprio PostgreSQL:

1. Clone o repositório e acesse a pasta da aplicação no terminal.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz espelhando o `.env.example` e atualize a variável `DATABASE_URL` apontando para o seu Postgres local.
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/educaapi?schema=public"
   ```
4. Atualize a estrutura do banco e instale os clientes do Prisma:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
5. *(Opcional)* Preencha o banco com dados de teste iniciais (os "seeds"):
   ```bash
   npm run seed
   ```
6. Rode a aplicação em modo de desenvolvimento ou produção:
   ```bash
   # Modo dev (com watch)
   npm run dev
   
   # Modo build + start
   npm run build
   npm start
   ```

## 📖 Instruções de Uso
A **EducaAPI** fornece um portal Swagger embutido para que você entenda e consuma todas as rotas de forma gráfica, simulando exatamente o Postman ou Insomnia!

- **Swagger UI**: `http://localhost:3000/api-docs`

**Exemplo de Fluxo:**
1. Acesse o endpoint de `POST /api/auth/register` ou utilize as credenciais base providenciadas pelo seed.
2. Colete o seu token gerado via `POST /api/auth/login`.
3. No topo da página do Swagger, clique em **Authorize** e insira o seu token JWT.
4. Agora todas as execuções nos botões "Try it out" das demais abas utilizarão sua sessão criptografada autenticada!

## 🧪 Testes Automatizados
Para rodar a bateria de testes (Jest) que validam de forma isolada do banco (via mock) todas as engrenagens e regras de negócio do projeto (cálculos do dashboard, bloqueios, etc):
```bash
npm run test
```

## 🏗️ Decisões de Arquitetura e Modelagem
- **Separação de Preocupações (SoC)**: O design segue o padrão de arquitetura em camadas MVC adaptada: `Routes -> Controllers -> Services -> Repositories`. Controladores recebem e formatam requisições de IO, ao passo que a inteligência do ODS 4, cálculos das avaliações e exceções habitam puramente a camada semântica de `Service`, e a leitura/escrita relacional é feita isoladamente pelos `Repositories`.
- **Validação Antecipada**: Adoção irrestrita do `Zod` atrelado aos middlewares, limpando os dados de entrada antes mesmo que a requisição adentre o processamento profundo da API.
- **Controle de Acesso Modular (RBAC)**: O controle de privilégios de leitura, escrita e exclusão é gerido via injeção do JWT no `authMiddleware` seguido pela interseção dos privilégios no interceptador `roleMiddleware`. Ações massivas no banco e emissão de avaliações são travadas e permitidas só às chaves de Administradores ou Professores, enquanto a consulta aos boletins é viável a todos os autenticados.

---

*Desenvolvido como plataforma de inteligência analítica para apoiar e impulsionar a jornada acadêmica das próximas gerações.* 🚀

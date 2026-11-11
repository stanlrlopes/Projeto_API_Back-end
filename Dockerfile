FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências da aplicação
RUN npm install

# Copiar todo o código-fonte
COPY . .

# Gerar tipagens do Prisma e construir o projeto (TypeScript para JavaScript)
RUN npx prisma generate
RUN npm run build

# Expor a porta 3000
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]

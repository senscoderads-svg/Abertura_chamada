# HelpDesk

Sistema web para abertura e gerenciamento de chamados, com cadastro de usuários, técnicos, departamentos e equipamentos.

## Requisitos

- Node.js 18 ou superior
- MySQL em execução
- Banco de dados `abertura_chamada` com as tabelas usadas pela API

## Instalação

Na raiz do projeto:

```powershell
npm install
npm install --prefix backend
```

Crie `backend/.env` a partir de `backend/.env.example` e preencha a conexão do MySQL. O arquivo `.env` não deve ser enviado ao GitHub.

## Executar

```powershell
npm start
```

Abra no navegador:

```text
http://localhost:3000/
```

Para desenvolvimento com reinício automático:

```powershell
npm run dev
```

## OAuth

O login com Google e GitHub exige credenciais criadas nos respectivos provedores. Configure no `backend/.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Use estes callbacks no cadastro das aplicações OAuth:

```text
http://localhost:3000/auth/google/callback
http://localhost:3000/auth/github/callback
```

Sem essas variáveis, os botões sociais informam que o provedor ainda não está configurado.

## Estrutura

```text
backend/       API Express, MySQL e autenticação OAuth
fronend/       Interface do painel
index.html     Tela de login
```

> O nome da pasta `fronend` foi mantido para preservar os caminhos atuais do projeto.

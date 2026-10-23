# Dashboard de Ativos de TI · Grupo Legal

Sistema de gestão de ativos de TI (inventário, pessoas, manutenções e relatórios) baseado no design do Figma **GRUPO LEGAL**.

## Rodando

Requer **Node.js 20 ou mais recente**. Localmente o banco é um Postgres embutido (PGlite) gravado em `data/pglite`, sem instalar nada extra.

```bash
npm install
npm run dev        # API em :3001 + front em http://localhost:5173
```

Produção (um único processo serve a API e o front compilado):

```bash
npm run build
npm start          # http://localhost:3001
```

### Primeiro acesso

Na primeira execução o banco é criado com dados de exemplo e um administrador:

- **E-mail:** `admin@grupolegal.com.br`
- **Senha:** `admin123`

Troque a senha em **Configurações → Segurança da conta** logo no primeiro acesso.

### Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3001` | Porta do servidor |
| `DATABASE_URL` (ou `POSTGRES_URL`) | — | Postgres externo (ex.: Neon). Sem ela, usa o PGlite |
| `PGLITE_DIR` | `data/pglite` | Pasta do banco local (PGlite) |
| `SESSION_SECRET` | gerada e salva no banco | Chave que assina o cookie de sessão |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@grupolegal.com.br` / `admin123` | Administrador criado na primeira execução |
| `SEED_DEMO` | `1` | Use `0` para começar sem os ativos/pessoas de exemplo |
| `COOKIE_SECURE` | — | Use `1` atrás de HTTPS para marcar o cookie de sessão como `Secure` |

Para zerar o sistema, pare o servidor e apague a pasta `data/`.

## Funcionalidades

- **Login** com sessão em cookie HttpOnly assinado, senha com hash (scrypt), "manter conectado" e bloqueio após 5 tentativas erradas em 15 minutos.
- **Perfis de acesso:** Administrador (tudo), Técnico (opera inventário, pessoas e manutenções) e Somente leitura. As permissões são validadas no servidor.
- **Inventário:** cadastrar, editar e excluir ativos, com busca, filtros por categoria/status, paginação e exportação CSV. A etiqueta (GL-00001…) é gerada automaticamente.
- **Pessoas:** cadastrar, editar e excluir colaboradores. Ao atribuir um responsável o ativo passa para "Em uso"; ao excluir a pessoa, os ativos dela voltam ao estoque.
- **Manutenção:** ordens de serviço com fluxo Aberta → Em andamento → Concluída. Com uma OS aberta o ativo fica em "Manutenção" e, ao concluir, volta ao status anterior. Destaque de OS atrasadas.
- **Visão geral e relatórios:** indicadores, alertas (garantias vencendo, OS atrasadas, estoque baixo) e gráficos calculados a partir dos dados reais. Os relatórios têm filtros e exportação em CSV.
- **Configurações:** editar perfil, trocar senha e, para administradores, criar usuários, mudar perfis, redefinir senhas e remover acessos.
- **Integrações:** liga/desliga salvo no banco. As integrações em si (Entra ID, Intune etc.) ainda não estão implementadas.

## Estrutura

```
api/index.js       função serverless da Vercel (reaproveita server/app.js)
server/
  app.js           API Express: /api/auth, /api/assets, /api/people, /api/orders, /api/users, /api/stats…
  db.js            conexão Postgres/PGlite, esquema e dados iniciais
  auth.js          hash de senha, cookie de sessão assinado e limite de tentativas
  index.js         servidor local / produção em servidor próprio
src/
  api.ts           cliente HTTP
  store.tsx        sessão, recarga de dados e avisos (toasts)
  data.ts          tipos e formatação
  components/      layout, componentes de UI e formulários (modais)
  pages/           uma página por tela do Figma
```

## Hospedagem na Vercel

O projeto já vem pronto para a Vercel: o front é publicado como site estático e a API roda como função serverless (`api/index.js` + `vercel.json`).

1. Importe o repositório na Vercel (framework **Vite**, comando `npm run build`, saída `dist`).
2. Em **Storage**, crie um banco **Neon (Postgres)** e conecte ao projeto. A Vercel cria a variável `POSTGRES_URL`/`DATABASE_URL` automaticamente.
3. Defina `SESSION_SECRET` (texto aleatório longo) e `ADMIN_PASSWORD` (senha inicial do administrador).
4. Faça um novo deploy. Na primeira requisição as tabelas e os dados iniciais são criados.

Sem banco conectado o sistema funciona em **modo demonstração** (Postgres em memória): aparece um aviso amarelo e os dados se perdem quando a função reinicia.

Também roda em qualquer servidor Node (`npm run build && npm start`), com ou sem `DATABASE_URL`.

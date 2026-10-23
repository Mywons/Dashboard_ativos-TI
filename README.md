# Dashboard de Ativos de TI · Grupo Legal

Sistema de gestão de ativos de TI (inventário, pessoas, manutenções e relatórios) baseado no design do Figma **GRUPO LEGAL**.

## Rodando

Requer **Node.js 22.13 ou mais recente** (o banco usa o SQLite embutido no Node, sem instalar nada extra).

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

Na primeira execução o banco é criado em `data/ativos.db` com dados de exemplo e um administrador:

- **E-mail:** `admin@grupolegal.com.br`
- **Senha:** `admin123`

Troque a senha em **Configurações → Segurança da conta** logo no primeiro acesso.

### Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3001` | Porta do servidor |
| `DB_PATH` | `data/ativos.db` | Arquivo do banco SQLite |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@grupolegal.com.br` / `admin123` | Administrador criado na primeira execução |
| `SEED_DEMO` | `1` | Use `0` para começar sem os ativos/pessoas de exemplo |
| `COOKIE_SECURE` | — | Use `1` atrás de HTTPS para marcar o cookie de sessão como `Secure` |

Para zerar o sistema, pare o servidor e apague a pasta `data/`.

## Funcionalidades

- **Login** com sessão em cookie HttpOnly, senha com hash (scrypt), "manter conectado" e bloqueio após 5 tentativas erradas em 15 minutos.
- **Perfis de acesso:** Administrador (tudo), Técnico (opera inventário, pessoas e manutenções) e Somente leitura. As permissões são validadas no servidor.
- **Inventário:** cadastrar, editar e excluir ativos, com busca, filtros por categoria/status, paginação e exportação CSV. A etiqueta (GL-00001…) é gerada automaticamente.
- **Pessoas:** cadastrar, editar e excluir colaboradores. Ao atribuir um responsável o ativo passa para "Em uso"; ao excluir a pessoa, os ativos dela voltam ao estoque.
- **Manutenção:** ordens de serviço com fluxo Aberta → Em andamento → Concluída. Com uma OS aberta o ativo fica em "Manutenção" e, ao concluir, volta ao status anterior. Destaque de OS atrasadas.
- **Visão geral e relatórios:** indicadores, alertas (garantias vencendo, OS atrasadas, estoque baixo) e gráficos calculados a partir dos dados reais. Os relatórios têm filtros e exportação em CSV.
- **Configurações:** editar perfil, trocar senha e, para administradores, criar usuários, mudar perfis, redefinir senhas e remover acessos.
- **Integrações:** liga/desliga salvo no banco. As integrações em si (Entra ID, Intune etc.) ainda não estão implementadas.

## Estrutura

```
server/            API (Express + SQLite embutido no Node)
  index.js         rotas: /api/auth, /api/assets, /api/people, /api/orders, /api/users, /api/stats…
  db.js            esquema do banco e dados iniciais
  auth.js          hash de senha, cookies e limite de tentativas
src/
  api.ts           cliente HTTP
  store.tsx        sessão, recarga de dados e avisos (toasts)
  data.ts          tipos e formatação
  components/      layout, componentes de UI e formulários (modais)
  pages/           uma página por tela do Figma
```

## Hospedagem

O servidor guarda os dados num arquivo SQLite, então precisa de um host com processo Node contínuo e disco persistente (VPS, Render, Railway, Fly.io ou um servidor interno). Plataformas serverless como a Vercel não mantêm esse arquivo entre requisições.

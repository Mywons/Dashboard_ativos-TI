# Dashboard de Ativos de TI · Grupo Legal

Painel de gestão de ativos de TI baseado no design do Figma **GRUPO LEGAL**.

## Telas

| Rota | Tela |
|---|---|
| `#/login` | Login ("Tudo ligado. Tudo sob controle.") |
| `#/overview` | Visão geral — KPIs, distribuição por categoria, saúde dos dispositivos, alertas, ativos que pedem atenção, atalhos |
| `#/inventory` | Inventário de ativos — filtros por categoria/status, busca e paginação |
| `#/people` | Pessoas e responsáveis |
| `#/maintenance` | Manutenção — agenda preventiva, fluxo de OS, ordens de serviço |
| `#/reports` | Relatórios — disponibilidade do parque, composição, ciclo de vida, relatórios recentes |
| `#/integrations` | Integrações |
| `#/settings` | Configurações da conta e do sistema |

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
```

## Stack

React 19 + TypeScript + Vite, gráficos com Recharts e ícones Lucide.

## Estrutura

- `src/styles.css` — tokens do design (cores, bordas, sombras) e todos os estilos
- `src/data.ts` — dados de exemplo (trocar por chamadas à API)
- `src/components/` — layout (sidebar/topbar) e componentes de UI (KPI, badge, tabela, filtros…)
- `src/pages/` — uma página por tela do Figma

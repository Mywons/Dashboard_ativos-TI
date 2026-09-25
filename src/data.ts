// Dados de exemplo do parque de TI. Substitua por chamadas à API quando houver backend.

export type AssetStatus = 'Em uso' | 'Disponível' | 'Manutenção' | 'Baixado'
export type Category = 'Notebook' | 'Desktop' | 'Monitor' | 'Celular' | 'Periférico'

export interface Asset {
  tag: string
  name: string
  serial: string
  category: Category
  status: AssetStatus
  owner: string | null
  location: string
  acquired: string
  warranty: string
}

export interface Person {
  name: string
  email: string
  department: string
  role: string
  assets: number
  location: string
  since: string
}

export interface ServiceOrder {
  id: string
  asset: string
  detail: string
  type: 'Preventiva' | 'Corretiva' | 'Upgrade'
  status: 'Aberta' | 'Em andamento' | 'Aguardando peça' | 'Concluída'
  tech: string
  opened: string
  sla: string
  late?: boolean
}

export interface Report {
  name: string
  detail: string
  period: string
  created: string
  owner: string
  format: 'PDF' | 'XLSX' | 'CSV'
}

export const org = { name: 'Grupo Legal', unit: 'Tecnologia da Informação' }

export const currentUser = {
  name: 'Davi Gomes',
  initials: 'DG',
  email: 'davi.gomes@grupolegal.com.br',
  phone: '(11) 98876-5432',
  role: 'Coordenador de TI',
  department: 'Tecnologia da Informação',
  location: 'São Paulo · Matriz',
  access: 'Administrador',
}

export const statusBadge: Record<string, string> = {
  'Em uso': 'badge-lime',
  'Disponível': 'badge-lilac',
  'Manutenção': 'badge-salmon',
  'Baixado': 'badge-ink',
  'Aberta': 'badge-cyan',
  'Em andamento': 'badge-lilac',
  'Aguardando peça': 'badge-salmon',
  'Concluída': 'badge-lime',
}

export const categoryThumb: Record<Category, string> = {
  Notebook: '',
  Desktop: 'lilac',
  Monitor: 'lime',
  Celular: 'salmon',
  Periférico: '',
}

export const assets: Asset[] = [
  { tag: 'GL-00412', name: 'Dell Latitude 5440', serial: 'SN 7HX2K93', category: 'Notebook', status: 'Em uso', owner: 'Mariana Costa', location: 'São Paulo · 3º andar', acquired: '12 mar 2024', warranty: '12 mar 2027' },
  { tag: 'GL-00413', name: 'Dell UltraSharp U2723QE', serial: 'SN CN0-4F2', category: 'Monitor', status: 'Disponível', owner: null, location: 'Estoque · Central', acquired: '02 abr 2024', warranty: '02 abr 2027' },
  { tag: 'GL-00388', name: 'iPhone 14', serial: 'IMEI 35 889…', category: 'Celular', status: 'Em uso', owner: 'Rafael Nunes', location: 'Campinas', acquired: '21 set 2023', warranty: '21 set 2025' },
  { tag: 'GL-00291', name: 'ThinkPad E14 Gen 4', serial: 'SN PF3Z81', category: 'Notebook', status: 'Manutenção', owner: 'Ana Ribeiro', location: 'Lab · TI', acquired: '17 jan 2022', warranty: '17 jan 2025' },
  { tag: 'GL-00455', name: 'Lenovo ThinkCentre M70q', serial: 'SN MJ0K22', category: 'Desktop', status: 'Em uso', owner: 'Tiago Alves', location: 'Rio de Janeiro', acquired: '08 mai 2024', warranty: '08 mai 2027' },
  { tag: 'GL-00401', name: 'Galaxy S23 FE', serial: 'IMEI 35 120…', category: 'Celular', status: 'Disponível', owner: null, location: 'Estoque · Central', acquired: '14 fev 2024', warranty: '14 fev 2026' },
  { tag: 'GL-00320', name: 'Dell Latitude 3420', serial: 'SN 4GD7L12', category: 'Notebook', status: 'Em uso', owner: 'Felipe Santos', location: 'São Paulo · 2º andar', acquired: '30 jun 2022', warranty: '30 jun 2025' },
  { tag: 'GL-00468', name: 'Logitech MX Master 3S', serial: 'SN 2213LZ', category: 'Periférico', status: 'Disponível', owner: null, location: 'Estoque · Central', acquired: '11 jul 2024', warranty: '11 jul 2026' },
  { tag: 'GL-00233', name: 'MacBook Air M1', serial: 'SN C02F…', category: 'Notebook', status: 'Manutenção', owner: 'Juliana Prado', location: 'Assistência externa', acquired: '09 ago 2021', warranty: '09 ago 2024' },
  { tag: 'GL-00477', name: 'LG 27UL500', serial: 'SN 309NT…', category: 'Monitor', status: 'Em uso', owner: 'Bruno Lima', location: 'Curitiba', acquired: '03 ago 2024', warranty: '03 ago 2027' },
  { tag: 'GL-00150', name: 'HP ProDesk 400 G6', serial: 'SN BRJ93…', category: 'Desktop', status: 'Baixado', owner: null, location: 'Descarte', acquired: '15 out 2019', warranty: '15 out 2022' },
  { tag: 'GL-00482', name: 'Dell Latitude 5440', serial: 'SN 9KQ4L20', category: 'Notebook', status: 'Em uso', owner: 'Carla Menezes', location: 'São Paulo · 3º andar', acquired: '19 ago 2024', warranty: '19 ago 2027' },
  { tag: 'GL-00360', name: 'Headset Jabra Evolve2 40', serial: 'SN JB8812', category: 'Periférico', status: 'Em uso', owner: 'Marcos Vieira', location: 'Rio de Janeiro', acquired: '22 nov 2023', warranty: '22 nov 2025' },
  { tag: 'GL-00341', name: 'iPhone 13', serial: 'IMEI 35 402…', category: 'Celular', status: 'Manutenção', owner: 'Patrícia Rocha', location: 'Lab · TI', acquired: '05 set 2023', warranty: '05 set 2025' },
  { tag: 'GL-00490', name: 'ThinkPad T14 Gen 4', serial: 'SN PF4R02', category: 'Notebook', status: 'Disponível', owner: null, location: 'Estoque · Central', acquired: '02 set 2024', warranty: '02 set 2027' },
  { tag: 'GL-00277', name: 'Dell P2422H', serial: 'SN CN0-7X1', category: 'Monitor', status: 'Em uso', owner: 'Ana Ribeiro', location: 'São Paulo · 1º andar', acquired: '28 dez 2021', warranty: '28 dez 2024' },
]

/** Ativos com status crítico / garantia vencida para a visão geral. */
export const attentionAssets = assets.filter(
  (a) => a.status === 'Manutenção' || a.tag === 'GL-00413' || a.tag === 'GL-00388',
).slice(0, 5)

export const people: Person[] = [
  { name: 'Mariana Costa', email: 'mariana.costa@grupolegal.com.br', department: 'TI', role: 'Product Manager', assets: 3, location: 'São Paulo · 3º andar', since: 'fev 2021' },
  { name: 'Tiago Alves', email: 'tiago.alves@grupolegal.com.br', department: 'Jurídico', role: 'Advogado Sênior', assets: 2, location: 'Rio de Janeiro', since: 'mai 2019' },
  { name: 'Ana Ribeiro', email: 'ana.ribeiro@grupolegal.com.br', department: 'TI', role: 'Suporte Técnico', assets: 4, location: 'São Paulo · 1º andar', since: 'jan 2022' },
  { name: 'Rafael Nunes', email: 'rafael.nunes@grupolegal.com.br', department: 'Comercial', role: 'Gerente Comercial', assets: 2, location: 'Campinas', since: 'ago 2020' },
  { name: 'Felipe Santos', email: 'felipe.santos@grupolegal.com.br', department: 'Financeiro', role: 'Analista Financeiro', assets: 2, location: 'São Paulo · 2º andar', since: 'jun 2022' },
  { name: 'Juliana Prado', email: 'juliana.prado@grupolegal.com.br', department: 'Marketing', role: 'Designer', assets: 1, location: 'São Paulo · 2º andar', since: 'ago 2021' },
  { name: 'Carla Menezes', email: 'carla.menezes@grupolegal.com.br', department: 'Administrativo', role: 'Coordenadora de RH', assets: 2, location: 'São Paulo · 3º andar', since: 'ago 2024' },
  { name: 'Bruno Lima', email: 'bruno.lima@grupolegal.com.br', department: 'Operacional', role: 'Coordenador de Logística', assets: 1, location: 'Curitiba', since: 'jul 2023' },
  { name: 'Marcos Vieira', email: 'marcos.vieira@grupolegal.com.br', department: 'Jurídico', role: 'Paralegal', assets: 2, location: 'Rio de Janeiro', since: 'nov 2023' },
  { name: 'Patrícia Rocha', email: 'patricia.rocha@grupolegal.com.br', department: 'Comercial', role: 'Executiva de Contas', assets: 1, location: 'Campinas', since: 'set 2023' },
]

export const departmentBadge: Record<string, string> = {
  TI: 'badge-cyan',
  Jurídico: 'badge-lime',
  Comercial: 'badge-salmon',
  Financeiro: 'badge-lilac',
  Marketing: 'badge-yellow',
  Administrativo: 'badge-lilac',
  Operacional: 'badge-salmon',
}

export const serviceOrders: ServiceOrder[] = [
  { id: 'OS-1042', asset: 'ThinkPad E14 Gen 4', detail: 'Teclado com falhas', type: 'Corretiva', status: 'Em andamento', tech: 'Ana Ribeiro', opened: '22 set', sla: '26 set' },
  { id: 'OS-1041', asset: 'MacBook Air M1', detail: 'Troca de bateria', type: 'Corretiva', status: 'Aguardando peça', tech: 'Assist. externa', opened: '18 set', sla: '25 set', late: true },
  { id: 'OS-1039', asset: 'iPhone 13', detail: 'Tela trincada', type: 'Corretiva', status: 'Aberta', tech: 'Ana Ribeiro', opened: '24 set', sla: '30 set' },
  { id: 'OS-1036', asset: 'Lenovo ThinkCentre M70q', detail: 'Upgrade de RAM 16→32 GB', type: 'Upgrade', status: 'Concluída', tech: 'Lucas Martins', opened: '15 set', sla: '19 set' },
  { id: 'OS-1033', asset: 'Dell Latitude 3420', detail: 'Limpeza e pasta térmica', type: 'Preventiva', status: 'Concluída', tech: 'Lucas Martins', opened: '10 set', sla: '12 set' },
  { id: 'OS-1030', asset: 'Impressora HP M428', detail: 'Revisão trimestral', type: 'Preventiva', status: 'Em andamento', tech: 'Lucas Martins', opened: '09 set', sla: '23 set', late: true },
]

export const upcomingMaintenance = [
  { day: '27', month: 'set', title: 'Limpeza preventiva · Notebooks', detail: '24 equipamentos · São Paulo', when: 'Amanhã', tone: '' },
  { day: '30', month: 'set', title: 'Atualização de BIOS · Dell', detail: '58 equipamentos · remoto', when: 'Terça', tone: 'lime' },
  { day: '03', month: 'out', title: 'Revisão de nobreaks', detail: 'Sala de servidores', when: 'Sexta', tone: 'lilac' },
  { day: '08', month: 'out', title: 'Troca de baterias · Celulares', detail: '12 aparelhos · Campinas', when: '2 semanas', tone: 'salmon' },
]

export const reports: Report[] = [
  { name: 'Inventário completo · Setembro', detail: '1.284 ativos · todas as unidades', period: 'Set 2026', created: '24 set 2026', owner: 'Davi Gomes', format: 'XLSX' },
  { name: 'Custo de manutenção · Q3', detail: 'Corretivas e preventivas', period: 'Jul–Set 2026', created: '20 set 2026', owner: 'Ana Ribeiro', format: 'PDF' },
  { name: 'Garantias a vencer · 90 dias', detail: '67 dispositivos', period: 'Out–Dez 2026', created: '15 set 2026', owner: 'Davi Gomes', format: 'PDF' },
  { name: 'Ativos por colaborador', detail: '186 pessoas', period: 'Set 2026', created: '02 set 2026', owner: 'Lucas Martins', format: 'CSV' },
]

// ---------- séries ----------

export const categoryDistribution = [
  { name: 'Notebooks', value: 512, color: 'var(--blue)' },
  { name: 'Monitores', value: 356, color: 'var(--lime)' },
  { name: 'Celulares', value: 248, color: 'var(--salmon)' },
  { name: 'Periféricos', value: 168, color: 'var(--lilac)' },
]

export const availability = [
  { month: 'Jan', value: 88.2 },
  { month: 'Fev', value: 88.9 },
  { month: 'Mar', value: 89.4 },
  { month: 'Abr', value: 90.6 },
  { month: 'Mai', value: 90.1 },
  { month: 'Jun', value: 91.3 },
  { month: 'Jul', value: 92.0 },
  { month: 'Ago', value: 91.7 },
  { month: 'Set', value: 93.4 },
]

export interface AlertItem {
  tone: 'yellow' | 'salmon' | 'lilac'
  title: string
  detail: string
  icon: 'shield' | 'user' | 'box'
}

export const alerts: AlertItem[] = [
  { tone: 'yellow', title: 'Garantias vencendo', detail: '14 ativos nos próximos 30 dias', icon: 'shield' },
  { tone: 'salmon', title: 'Ativos sem responsável', detail: '9 dispositivos em uso sem vínculo', icon: 'user' },
  { tone: 'lilac', title: 'Estoque baixo', detail: 'Headsets: restam 3 unidades', icon: 'box' },
]

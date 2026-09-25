import { useState } from 'react'
import { Cloud, KeyRound, Mail, MessageSquare, Server, ShieldCheck } from 'lucide-react'
import { Badge, PageHead, Toggle } from '../components/ui'

const initial = [
  { name: 'Microsoft Entra ID', detail: 'Sincroniza colaboradores e departamentos', icon: KeyRound, on: true },
  { name: 'Microsoft Intune', detail: 'Importa dispositivos gerenciados e conformidade', icon: ShieldCheck, on: true },
  { name: 'Google Workspace', detail: 'Contas e Chromebooks', icon: Cloud, on: false },
  { name: 'E-mail (SMTP)', detail: 'Envio de alertas e relatórios agendados', icon: Mail, on: true },
  { name: 'Microsoft Teams', detail: 'Notificações de OS no canal de TI', icon: MessageSquare, on: false },
  { name: 'Agente de inventário', detail: 'Coleta automática de hardware e software', icon: Server, on: true },
]

export function Integrations() {
  const [items, setItems] = useState(initial)
  return (
    <>
      <PageHead eyebrow="Sistema" title="Integrações" />
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {items.map((it, i) => (
          <div key={it.name} className={`card ${it.on ? 'card-lime' : ''}`}>
            <div className="card-head">
              <span className="round-icon">
                <it.icon size={15} />
              </span>
              <Toggle
                on={it.on}
                label={it.name}
                onChange={(v) => setItems(items.map((x, j) => (j === i ? { ...x, on: v } : x)))}
              />
            </div>
            <h3 style={{ fontSize: 16 }}>{it.name}</h3>
            <p className="muted small" style={{ margin: '4px 0 12px' }}>
              {it.detail}
            </p>
            <Badge className={it.on ? 'badge-lime' : 'badge-lilac'}>{it.on ? 'Conectado' : 'Desativado'}</Badge>
          </div>
        ))}
      </div>
    </>
  )
}

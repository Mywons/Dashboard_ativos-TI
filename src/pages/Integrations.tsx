import { Cloud, KeyRound, Mail, MessageSquare, Server, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import { useAuth, useData, useResource } from '../store'
import { Badge, PageHead, Toggle } from '../components/ui'

const catalog = [
  { key: 'entra', name: 'Microsoft Entra ID', detail: 'Sincroniza colaboradores e departamentos', icon: KeyRound },
  { key: 'intune', name: 'Microsoft Intune', detail: 'Importa dispositivos gerenciados e conformidade', icon: ShieldCheck },
  { key: 'workspace', name: 'Google Workspace', detail: 'Contas e Chromebooks', icon: Cloud },
  { key: 'smtp', name: 'E-mail (SMTP)', detail: 'Envio de alertas e relatórios agendados', icon: Mail },
  { key: 'teams', name: 'Microsoft Teams', detail: 'Notificações de OS no canal de TI', icon: MessageSquare },
  { key: 'agent', name: 'Agente de inventário', detail: 'Coleta automática de hardware e software', icon: Server },
]

export function Integrations() {
  const { isAdmin } = useAuth()
  const { mutate, toast } = useData()
  const { data } = useResource<Record<string, boolean>>('/integrations')

  const set = (key: string, on: boolean) =>
    mutate(() => api('/integrations', { method: 'PUT', body: { ...data, [key]: on } }), on ? 'Integração ativada' : 'Integração desativada').catch((e: Error) =>
      toast(e.message, 'error'),
    )

  return (
    <>
      <PageHead eyebrow="Sistema" title="Integrações" />
      <p className="muted" style={{ margin: '-8px 0 0' }}>
        Ative as integrações que a TI pretende usar. {isAdmin ? '' : 'Somente administradores podem alterar.'}
      </p>
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {catalog.map((it) => {
          const on = Boolean(data?.[it.key])
          return (
            <div key={it.key} className={`card ${on ? 'card-lime' : ''}`}>
              <div className="card-head">
                <span className="round-icon">
                  <it.icon size={15} />
                </span>
                {isAdmin && data && <Toggle on={on} label={it.name} onChange={(v) => set(it.key, v)} />}
              </div>
              <h3 style={{ fontSize: 16 }}>{it.name}</h3>
              <p className="muted small" style={{ margin: '4px 0 12px' }}>
                {it.detail}
              </p>
              <Badge className={on ? 'badge-lime' : 'badge-lilac'}>{on ? 'Ativada' : 'Desativada'}</Badge>
            </div>
          )
        })}
      </div>
    </>
  )
}

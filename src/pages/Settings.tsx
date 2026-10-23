import { useState, type FormEvent } from 'react'
import { Check, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { api } from '../api'
import { roleLabel, type Role, type User } from '../data'
import { handle, resetDemo } from '../mock'
import { useAuth, useData } from '../store'
import { useModals } from '../components/Modals'
import { Avatar, Badge, PageHead } from '../components/ui'

const fields = [
  { label: 'Nome completo', key: 'name' },
  { label: 'Telefone', key: 'phone' },
  { label: 'Departamento', key: 'department' },
  { label: 'Cargo', key: 'jobTitle' },
  { label: 'Unidade / local', key: 'location' },
] as const

const permissions: { label: string; roles: Role[] }[] = [
  { label: 'Consultar inventário, pessoas e relatórios', roles: ['admin', 'tecnico', 'leitura'] },
  { label: 'Cadastrar, editar e excluir ativos', roles: ['admin', 'tecnico'] },
  { label: 'Gerenciar pessoas e responsáveis', roles: ['admin', 'tecnico'] },
  { label: 'Abrir e encerrar ordens de serviço', roles: ['admin', 'tecnico'] },
  { label: 'Configurar integrações', roles: ['admin'] },
]

function Msg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className="small" style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: ok ? 'inherit' : 'var(--red)' }}>
      {ok ? <Check size={14} /> : <TriangleAlert size={14} />} {text}
    </span>
  )
}

function ProfileCard() {
  const { user, setUser } = useAuth()
  const { toast } = useData()
  const initial = { name: user!.name, phone: user!.phone, department: user!.department, jobTitle: user!.jobTitle, location: user!.location }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const r = await api<{ user: User }>('/me', { method: 'PATCH', body: form })
      setUser(r.user)
      toast('Alterações salvas')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h3>Informações da conta</h3>
      </div>
      <div className="form-grid">
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={f.key}>{f.label}</label>
            <div className="input soft">
              <input id={f.key} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.key === 'name'} />
            </div>
          </div>
        ))}
        <div className="field">
          <label>E-mail de acesso</label>
          <div className="input soft">
            <input value={user!.email} disabled />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <button type="button" className="btn" onClick={() => setForm(initial)}>
          Descartar
        </button>
        {err && <Msg ok={false} text={err} />}
      </div>
    </form>
  )
}

function DemoCard() {
  const { setUser } = useAuth()
  const { confirm } = useModals()
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Dados da demonstração</h3>
          <span className="muted small">Tudo fica salvo apenas neste navegador, sem servidor nem banco de dados.</span>
        </div>
      </div>
      <div className="setting-row">
        <div>
          <strong>Restaurar dados de exemplo</strong>
          <span>Apaga suas alterações e volta ao inventário inicial</span>
        </div>
        <button
          className="btn btn-sm"
          onClick={() =>
            confirm({
              title: 'Restaurar dados de exemplo',
              message: 'Todos os ativos, pessoas e ordens de serviço que você criou ou alterou serão substituídos pelos dados de exemplo.',
              confirmLabel: 'Restaurar',
              success: 'Dados de exemplo restaurados',
              action: async () => {
                resetDemo()
                setUser((handle('GET', '/me') as { user: User }).user)
              },
            })
          }
        >
          <RotateCcw size={13} /> Restaurar
        </button>
      </div>
    </div>
  )
}

export function Settings() {
  const { user } = useAuth()

  return (
    <>
      <PageHead eyebrow="Sistema" title="Configurações" />

      <div className="grid-settings">
        <div className="stack">
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Avatar name={user.name} size="lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {user.name} <Badge className="badge-lime">{roleLabel[user.role]}</Badge>
              </h3>
              <span className="muted small">
                {user.email}
                {user.jobTitle && ` · ${user.jobTitle}`}
              </span>
            </div>
          </div>
          <ProfileCard key={JSON.stringify(user)} />
        </div>

        <div className="stack">
          <DemoCard />
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Nível de acesso</h3>
                <span className="muted small">O que seu perfil pode fazer no sistema</span>
              </div>
            </div>
            <div className="role-card">
              <Avatar name={roleLabel[user.role]} />
              <div>
                <strong>{roleLabel[user.role]}</strong>
                <span>{user.role === 'admin' ? 'Acesso total a todos os módulos' : user.role === 'tecnico' ? 'Opera o inventário e as manutenções' : 'Apenas consulta'}</span>
              </div>
            </div>
            <ul className="perm-list">
              {permissions.map((p) => {
                const ok = p.roles.includes(user.role)
                return (
                  <li key={p.label} style={ok ? undefined : { color: 'var(--ink-3)' }}>
                    <span className="ok" style={ok ? undefined : { background: 'var(--bg)' }}>
                      {ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    </span>
                    {p.label}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

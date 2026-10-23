import { useState, type FormEvent } from 'react'
import { Check, KeyRound, TriangleAlert, UserPlus, X } from 'lucide-react'
import { api } from '../api'
import { fmtDate, roleLabel, type Role, type User } from '../data'
import { useAuth, useData, useResource } from '../store'
import { useModals } from '../components/Modals'
import { Avatar, Badge, PageHead, RowActions } from '../components/ui'

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
  { label: 'Criar usuários e definir perfis de acesso', roles: ['admin'] },
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

function PasswordCard() {
  const { user } = useAuth()
  const { toast } = useData()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.next !== f.confirm) return setErr('A confirmação não confere com a nova senha')
    setBusy(true)
    setErr(null)
    try {
      await api('/me/password', { method: 'POST', body: { current: f.current, next: f.next } })
      toast('Senha alterada. Outras sessões foram encerradas.')
      setF({ current: '', next: '', confirm: '' })
      setOpen(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Segurança da conta</h3>
      </div>
      <div className="setting-row">
        <div>
          <strong>Senha de acesso</strong>
          <span>Alterada em {fmtDate(user!.passwordChangedAt)}</span>
        </div>
        {!open && (
          <button className="btn btn-sm" onClick={() => setOpen(true)}>
            <KeyRound size={13} /> Alterar senha
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} style={{ paddingTop: 12 }}>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="pw-current">Senha atual</label>
              <div className="input">
                <input id="pw-current" type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required autoComplete="current-password" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pw-next">Nova senha (mín. 8)</label>
              <div className="input">
                <input id="pw-next" type="password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} minLength={8} required autoComplete="new-password" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pw-confirm">Confirmar nova senha</label>
              <div className="input">
                <input id="pw-confirm" type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} minLength={8} required autoComplete="new-password" />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar nova senha'}
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            {err && <Msg ok={false} text={err} />}
          </div>
        </form>
      )}
      <p className="muted small" style={{ margin: '10px 0 0' }}>
        Último acesso: {user!.lastLoginAt ? `${fmtDate(user!.lastLoginAt)} às ${user!.lastLoginAt.slice(11, 16)} (UTC)` : '—'}
      </p>
    </div>
  )
}

function UsersCard() {
  const { user: me } = useAuth()
  const { mutate, toast } = useData()
  const { openUser, confirm } = useModals()
  const { data: users } = useResource<User[]>('/users')
  const [resetFor, setResetFor] = useState<number | null>(null)
  const [newPw, setNewPw] = useState('')

  const changeRole = (u: User, role: Role) =>
    mutate(() => api(`/users/${u.id}`, { method: 'PATCH', body: { role } }), `Perfil de ${u.name} atualizado`).catch((e: Error) => toast(e.message, 'error'))

  const resetPassword = (u: User) =>
    mutate(() => api(`/users/${u.id}`, { method: 'PATCH', body: { password: newPw } }), `Senha de ${u.name} redefinida`)
      .then(() => {
        setResetFor(null)
        setNewPw('')
      })
      .catch((e: Error) => toast(e.message, 'error'))

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Usuários do sistema</h3>
          <span className="muted small">O cadastro de acesso é feito pelo administrador</span>
        </div>
        <button className="btn btn-sm btn-dark" onClick={openUser}>
          <UserPlus size={13} /> Novo
        </button>
      </div>
      <div className="user-list">
        {users?.map((u) => (
          <div key={u.id} className="user-row">
            <div className="user-main">
              <Avatar name={u.name} />
              <div style={{ minWidth: 0 }}>
                <strong>
                  {u.name} {u.id === me?.id && <span className="muted small">(você)</span>}
                </strong>
                <small>{u.email}</small>
              </div>
            </div>
            <div className="user-controls">
              <select className="select" value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)} aria-label={`Perfil de ${u.name}`}>
                {(Object.keys(roleLabel) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
              <RowActions
                extra={
                  <button className="icon-btn" onClick={() => setResetFor(resetFor === u.id ? null : u.id)} aria-label="Redefinir senha" title="Redefinir senha">
                    <KeyRound size={14} />
                  </button>
                }
                onDelete={
                  u.id === me?.id
                    ? undefined
                    : () =>
                        confirm({
                          title: 'Excluir usuário',
                          message: (
                            <>
                              Remover o acesso de <b>{u.name}</b> ({u.email})?
                            </>
                          ),
                          success: 'Usuário excluído',
                          action: () => api(`/users/${u.id}`, { method: 'DELETE' }),
                        })
                }
              />
            </div>
            {resetFor === u.id && (
              <form
                className="user-reset"
                onSubmit={(e) => {
                  e.preventDefault()
                  resetPassword(u)
                }}
              >
                <div className="input">
                  <input placeholder="Nova senha (mín. 8)" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} required autoFocus />
                </div>
                <button className="btn btn-sm btn-primary" type="submit">
                  Redefinir
                </button>
                <button className="icon-btn" type="button" onClick={() => setResetFor(null)} aria-label="Cancelar">
                  <X size={14} />
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Settings() {
  const { user, isAdmin } = useAuth()
  if (!user) return null

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
          <ProfileCard key={user.id} />
          <PasswordCard />
        </div>

        <div className="stack">
          {isAdmin && <UsersCard />}
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

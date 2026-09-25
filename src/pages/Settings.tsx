import { useState } from 'react'
import { Check } from 'lucide-react'
import { currentUser } from '../data'
import { Avatar, Badge, PageHead, Toggle } from '../components/ui'

const fields = [
  { label: 'Nome completo', key: 'name' },
  { label: 'E-mail corporativo', key: 'email' },
  { label: 'Telefone', key: 'phone' },
  { label: 'Departamento', key: 'department' },
  { label: 'Cargo', key: 'role' },
  { label: 'Unidade / local', key: 'location' },
] as const

const permissions = ['Cadastrar e editar ativos', 'Gerenciar pessoas', 'Aprovar manutenções', 'Exportar relatórios', 'Configurar integrações']

export function Settings() {
  const [form, setForm] = useState({ ...currentUser })
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [twoFa, setTwoFa] = useState(true)
  const [saved, setSaved] = useState(false)

  return (
    <>
      <PageHead eyebrow="Sistema" title="Configurações" />

      <div className="grid-settings">
        <div className="stack">
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={currentUser.name} size="lg" />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                {currentUser.name} <Badge className="badge-lime">{currentUser.access}</Badge>
              </h3>
              <span className="muted small">
                {currentUser.email} · {currentUser.role}
              </span>
            </div>
            <button className="btn btn-sm">Alterar foto</button>
          </div>

          <form
            className="card"
            onSubmit={(e) => {
              e.preventDefault()
              setSaved(true)
              setTimeout(() => setSaved(false), 2200)
            }}
          >
            <div className="card-head">
              <h3>Informações da conta</h3>
            </div>
            <div className="form-grid">
              {fields.map((f) => (
                <div className="field" key={f.key}>
                  <label htmlFor={f.key}>{f.label}</label>
                  <div className="input soft">
                    <input id={f.key} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18, alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary">
                Salvar alterações
              </button>
              <button type="button" className="btn" onClick={() => setForm({ ...currentUser })}>
                Descartar
              </button>
              {saved && (
                <span className="small" style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <Check size={14} /> Alterações salvas
                </span>
              )}
            </div>
          </form>

          <div className="card">
            <div className="card-head">
              <h3>Segurança da conta</h3>
            </div>
            <div className="setting-row">
              <div>
                <strong>Senha de acesso</strong>
                <span>Alterada pela última vez há 42 dias</span>
              </div>
              <button className="btn btn-sm">Alterar senha</button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Autenticação em dois fatores (2FA)</strong>
                <span>Proteja sua conta com um código adicional</span>
              </div>
              <Toggle on={twoFa} onChange={setTwoFa} label="Autenticação em dois fatores" />
            </div>
            <p className="muted small" style={{ margin: '10px 0 0' }}>
              Último acesso: hoje, 08:42 · São Paulo · Chrome no Windows
            </p>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Preferências do sistema</h3>
            </div>
            <div className="setting-row">
              <div>
                <strong>Notificações por e-mail</strong>
                <span>Alertas de garantia, OS e estoque</span>
              </div>
              <Toggle on={emailNotif} onChange={setEmailNotif} label="Notificações por e-mail" />
            </div>
            <div className="setting-row">
              <div>
                <strong>Notificações no navegador</strong>
                <span>Avisos em tempo real enquanto usa o painel</span>
              </div>
              <Toggle on={pushNotif} onChange={setPushNotif} label="Notificações no navegador" />
            </div>
            <div className="setting-row">
              <div>
                <strong>Tema visual</strong>
                <span>Aparência do painel</span>
              </div>
              <select className="select" aria-label="Tema visual">
                <option>Claro</option>
                <option>Sistema</option>
              </select>
            </div>
            <div className="setting-row">
              <div>
                <strong>Idioma do sistema</strong>
                <span>Textos e formatos de data</span>
              </div>
              <select className="select" aria-label="Idioma">
                <option>Português (BR)</option>
                <option>English</option>
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Nível de acesso</h3>
                <span className="muted small">O que seu perfil pode fazer no sistema</span>
              </div>
            </div>
            <div className="role-card">
              <Avatar name="Admin Geral" />
              <div>
                <strong>Administrador Geral</strong>
                <span>Acesso total a todos os módulos</span>
              </div>
            </div>
            <ul className="perm-list">
              {permissions.map((p) => (
                <li key={p}>
                  <span className="ok">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

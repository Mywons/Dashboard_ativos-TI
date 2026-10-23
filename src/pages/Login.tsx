import { useState } from 'react'
import { Activity, ArrowRight, CircleCheck, CircleHelp, Eye, EyeOff, Lock, Mail, Package, ShieldCheck, TriangleAlert, Wrench } from 'lucide-react'
import { BrandMark, org } from '../components/Layout'
import { useAuth } from '../store'
import { Badge, Kpi } from '../components/ui'

export function Login() {
  const { login } = useAuth()
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)

  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand" style={{ position: 'relative', zIndex: 1 }}>
          <BrandMark />
          <div>
            <div className="brand-name">GL·TI</div>
            <div className="brand-sub">{org.name}</div>
          </div>
        </div>
        <div style={{ marginTop: 56, position: 'relative', zIndex: 1 }}>
          <span className="eyebrow">Gestão de ativos de TI</span>
          <h1>
            Tudo ligado.
            <br />
            Tudo sob controle.
          </h1>
          <p>Visibilidade total sobre cada notebook, monitor e celular do grupo — de quem está usando até quando vence a garantia.</p>
        </div>

        <div className="login-preview">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="eyebrow">Visão geral</span>
              <h3 style={{ fontSize: 16 }}>Inventário em movimento</h3>
            </div>
            <Badge className="badge-lime">Ao vivo</Badge>
          </div>
          <div className="kpis">
            <Kpi tone="blue" label="Total" value="1.284" delta="ativos" icon={<Package size={12} />} trend={[3, 5, 6, 8]} />
            <Kpi tone="lime" label="Em uso" value="942" delta="com responsável" icon={<CircleCheck size={12} />} trend={[4, 5, 7, 8]} />
            <Kpi tone="salmon" label="Manutenção" value="57" delta="em reparo" icon={<Wrench size={12} />} trend={[8, 6, 5, 4]} />
          </div>
          <div className="callout-dark">
            <span className="score">87</span>
            <div>
              <strong>Parque saudável</strong>
              <span>Nenhum alerta crítico nas últimas 24h</span>
            </div>
            <Activity size={18} className="trail" />
          </div>
        </div>

        <div className="login-hero-foot">
          <span>© {new Date().getFullYear()} {org.name} · TI</span>
          <span>v1.0</span>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-top">
          <span className="eyebrow">Acesso restrito</span>
          <span className="muted">
            Precisa de ajuda?{' '}
            <a className="btn btn-sm" style={{ marginLeft: 6 }} href="mailto:suporte.ti@grupolegal.com.br">
              Suporte
            </a>
          </span>
        </div>

        <form
          className="login-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              await login(email, password, remember)
              if (!window.location.hash) window.location.hash = '/overview'
            } catch (err) {
              setError((err as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <div>
            <Badge className="plain badge-lime">
              <ShieldCheck size={12} /> Ambiente seguro
            </Badge>
          </div>
          <div>
            <h2>Bem-vindo de volta.</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Entre para acompanhar ativos, pessoas e manutenções em um só lugar.
            </p>
          </div>
          <div className="field">
            <label htmlFor="email">Usuário</label>
            <div className="input">
              <Mail size={15} />
              <input id="email" type="email" placeholder="nome@grupolegal.com.br" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <div className="input">
              <Lock size={15} />
              <input
                id="password"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" className="icon-ghost" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="login-row">
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Manter conectado
            </label>
            <button type="button" className="link-btn" onClick={() => setHelp(!help)}>
              Esqueci minha senha
            </button>
          </div>
          {help && (
            <div className="login-help" style={{ background: 'var(--lilac-soft)' }}>
              <CircleHelp size={16} />
              <span>Por segurança, a senha é redefinida pelo administrador do sistema. Peça a redefinição ao suporte de TI.</span>
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              <TriangleAlert size={14} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block btn-login" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar no GL·TI'} <ArrowRight size={15} />
          </button>
          <div className="login-help">
            <CircleHelp size={16} />
            <span>
              Primeiro acesso? O cadastro é feito pelo administrador. <strong>Fale com o suporte de TI.</strong>
            </span>
          </div>
        </form>

        <div className="login-foot">
          <span>© {org.name}</span>
          <span>Privacidade · Termos de uso</span>
        </div>
      </section>
    </div>
  )
}

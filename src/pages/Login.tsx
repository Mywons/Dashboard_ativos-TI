import { useState } from 'react'
import { Activity, ArrowRight, CircleCheck, CircleHelp, Eye, EyeOff, Lock, Mail, Package, ShieldCheck, Wrench } from 'lucide-react'
import { org } from '../data'
import { BrandMark } from '../components/Layout'
import { Badge, Kpi } from '../components/ui'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
            <button className="btn btn-sm" style={{ marginLeft: 6 }}>
              Suporte
            </button>
          </span>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            onLogin()
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
              <input id="email" type="email" placeholder="nome@grupolegal.com.br" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
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
              />
              <button type="button" className="icon-ghost" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="login-row">
            <label className="check">
              <input type="checkbox" defaultChecked /> Manter conectado
            </label>
            <a href="#">Esqueci minha senha</a>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-login">
            Entrar no GL·TI <ArrowRight size={15} />
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

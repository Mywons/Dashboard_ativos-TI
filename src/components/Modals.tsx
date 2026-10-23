import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { api } from '../api'
import { useData, useResource } from '../store'
import {
  addDaysIso,
  ASSET_STATUS,
  CATEGORIES,
  DEPARTMENTS,
  ORDER_STATUS,
  ORDER_TYPES,
  todayIso,
  type Asset,
  type Person,
  type ServiceOrder,
} from '../data'

// ---------------------------------------------------------------------------
// Estrutura básica
// ---------------------------------------------------------------------------

export function Modal({ title, eyebrow, onClose, children, width = 640 }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}>
        <div className="modal-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h3>{title}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, full, hint }: { label: string; children: ReactNode; full?: boolean; hint?: string }) {
  return (
    <div className="field" style={full ? { gridColumn: '1 / -1' } : undefined}>
      <label>{label}</label>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </div>
  )
}

function FormActions({ saving, onCancel, label = 'Salvar' }: { saving: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="modal-actions">
      <button type="button" className="btn" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Salvando…' : label}
      </button>
    </div>
  )
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="form-error" role="alert">
      <TriangleAlert size={14} /> {error}
    </div>
  )
}

/** Envia o formulário pela API com estado de carregamento e mensagem de erro. */
function useSubmit(onDone: () => void) {
  const { mutate } = useData()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (fn: () => Promise<unknown>, success: string) => {
    setSaving(true)
    setError(null)
    try {
      await mutate(fn, success)
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return { saving, error, submit }
}

// ---------------------------------------------------------------------------
// Ativo
// ---------------------------------------------------------------------------

function AssetForm({ asset, onClose }: { asset?: Asset; onClose: () => void }) {
  const { data: people } = useResource<Person[]>('/people')
  const [f, setF] = useState({
    tag: asset?.tag ?? '',
    name: asset?.name ?? '',
    serial: asset?.serial ?? '',
    category: asset?.category ?? 'Notebook',
    status: asset?.status ?? 'Disponível',
    personId: asset?.personId ? String(asset.personId) : '',
    location: asset?.location ?? '',
    acquiredAt: asset?.acquiredAt ?? todayIso(),
    warrantyUntil: asset?.warrantyUntil ?? '',
    value: asset ? String(asset.value) : '',
    notes: asset?.notes ?? '',
  })
  const { saving, error, submit } = useSubmit(onClose)

  useEffect(() => {
    if (!asset) api<{ tag: string }>('/assets/next-tag').then((r) => setF((x) => (x.tag ? x : { ...x, tag: r.tag }))).catch(() => {})
  }, [asset])

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    const value = e.target.value
    setF((x) => {
      const next = { ...x, [k]: value }
      // Atribuir responsável coloca o ativo em uso; remover devolve ao estoque
      if (k === 'personId' && value && x.status === 'Disponível') next.status = 'Em uso'
      if (k === 'personId' && !value && x.status === 'Em uso') next.status = 'Disponível'
      return next
    })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const body = { ...f, personId: f.personId ? Number(f.personId) : null, value: f.value ? Number(f.value.replace(',', '.')) : 0 }
    submit(
      () => (asset ? api(`/assets/${asset.id}`, { method: 'PUT', body }) : api('/assets', { method: 'POST', body })),
      asset ? 'Ativo atualizado' : 'Ativo cadastrado',
    )
  }

  return (
    <Modal title={asset ? `Editar ${asset.tag}` : 'Cadastrar ativo'} eyebrow="Inventário" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <Field label="Nome / modelo *" full>
            <div className="input">
              <input value={f.name} onChange={set('name')} placeholder="Ex.: Dell Latitude 5440" required autoFocus />
            </div>
          </Field>
          <Field label="Etiqueta (patrimônio)" hint="Gerada automaticamente se ficar vazia">
            <div className="input">
              <input value={f.tag} onChange={set('tag')} placeholder="GL-00001" />
            </div>
          </Field>
          <Field label="Número de série / IMEI">
            <div className="input">
              <input value={f.serial} onChange={set('serial')} />
            </div>
          </Field>
          <Field label="Categoria *">
            <select className="input" value={f.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Status *">
            <select className="input" value={f.status} onChange={set('status')}>
              {ASSET_STATUS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Responsável">
            <select className="input" value={f.personId} onChange={set('personId')}>
              <option value="">Sem responsável</option>
              {people?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.department}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Localização">
            <div className="input">
              <input value={f.location} onChange={set('location')} placeholder="Ex.: São Paulo · 3º andar" />
            </div>
          </Field>
          <Field label="Data de aquisição *">
            <div className="input">
              <input type="date" value={f.acquiredAt} onChange={set('acquiredAt')} required />
            </div>
          </Field>
          <Field label="Garantia até">
            <div className="input">
              <input type="date" value={f.warrantyUntil} onChange={set('warrantyUntil')} />
            </div>
          </Field>
          <Field label="Valor de compra (R$)">
            <div className="input">
              <input inputMode="decimal" value={f.value} onChange={set('value')} placeholder="0,00" />
            </div>
          </Field>
          <Field label="Observações" full>
            <textarea className="input" rows={2} value={f.notes} onChange={set('notes')} />
          </Field>
        </div>
        <FormError error={error} />
        <FormActions saving={saving} onCancel={onClose} label={asset ? 'Salvar alterações' : 'Cadastrar ativo'} />
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Pessoa
// ---------------------------------------------------------------------------

function PersonForm({ person, onClose }: { person?: Person; onClose: () => void }) {
  const [f, setF] = useState({
    name: person?.name ?? '',
    email: person?.email ?? '',
    department: person?.department ?? 'TI',
    jobTitle: person?.jobTitle ?? '',
    location: person?.location ?? '',
    since: person?.since ?? todayIso(),
  })
  const { saving, error, submit } = useSubmit(onClose)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <Modal title={person ? 'Editar pessoa' : 'Adicionar pessoa'} eyebrow="Colaboradores" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(
            () => (person ? api(`/people/${person.id}`, { method: 'PUT', body: f }) : api('/people', { method: 'POST', body: f })),
            person ? 'Pessoa atualizada' : 'Pessoa adicionada',
          )
        }}
      >
        <div className="form-grid">
          <Field label="Nome completo *" full>
            <div className="input">
              <input value={f.name} onChange={set('name')} required autoFocus />
            </div>
          </Field>
          <Field label="E-mail *">
            <div className="input">
              <input type="email" value={f.email} onChange={set('email')} required />
            </div>
          </Field>
          <Field label="Departamento *">
            <select className="input" value={f.department} onChange={set('department')}>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Cargo">
            <div className="input">
              <input value={f.jobTitle} onChange={set('jobTitle')} />
            </div>
          </Field>
          <Field label="Localização">
            <div className="input">
              <input value={f.location} onChange={set('location')} />
            </div>
          </Field>
          <Field label="Na empresa desde">
            <div className="input">
              <input type="date" value={f.since} onChange={set('since')} />
            </div>
          </Field>
        </div>
        <FormError error={error} />
        <FormActions saving={saving} onCancel={onClose} />
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Ordem de serviço
// ---------------------------------------------------------------------------

function OrderForm({ order, assetId, onClose }: { order?: ServiceOrder; assetId?: number; onClose: () => void }) {
  const { data: assets } = useResource<Asset[]>('/assets')
  const [f, setF] = useState({
    assetId: String(order?.assetId ?? assetId ?? ''),
    detail: order?.detail ?? '',
    type: order?.type ?? 'Corretiva',
    status: order?.status ?? 'Aberta',
    tech: order?.tech ?? '',
    openedAt: order?.openedAt ?? todayIso(),
    dueAt: order?.dueAt ?? addDaysIso(5),
    cost: order ? String(order.cost) : '',
  })
  const { saving, error, submit } = useSubmit(onClose)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <Modal title={order ? `Editar ${order.code}` : 'Nova ordem de serviço'} eyebrow="Manutenção" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const body = { ...f, assetId: Number(f.assetId), cost: f.cost ? Number(f.cost.replace(',', '.')) : 0 }
          submit(
            () => (order ? api(`/orders/${order.id}`, { method: 'PUT', body }) : api('/orders', { method: 'POST', body })),
            order ? 'Ordem de serviço atualizada' : 'Ordem de serviço aberta',
          )
        }}
      >
        <div className="form-grid">
          <Field label="Ativo *" full hint="Enquanto houver OS aberta, o ativo fica com status Manutenção">
            <select className="input" value={f.assetId} onChange={set('assetId')} required>
              <option value="">Selecione…</option>
              {assets
                ?.filter((a) => a.status !== 'Baixado' || String(a.id) === f.assetId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag} · {a.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Descrição do problema / serviço *" full>
            <div className="input">
              <input value={f.detail} onChange={set('detail')} required />
            </div>
          </Field>
          <Field label="Tipo *">
            <select className="input" value={f.type} onChange={set('type')}>
              {ORDER_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Status *">
            <select className="input" value={f.status} onChange={set('status')}>
              {ORDER_STATUS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Técnico responsável">
            <div className="input">
              <input value={f.tech} onChange={set('tech')} />
            </div>
          </Field>
          <Field label="Custo (R$)">
            <div className="input">
              <input inputMode="decimal" value={f.cost} onChange={set('cost')} placeholder="0,00" />
            </div>
          </Field>
          <Field label="Abertura">
            <div className="input">
              <input type="date" value={f.openedAt} onChange={set('openedAt')} />
            </div>
          </Field>
          <Field label="Prazo (SLA) *">
            <div className="input">
              <input type="date" value={f.dueAt} onChange={set('dueAt')} required />
            </div>
          </Field>
        </div>
        <FormError error={error} />
        <FormActions saving={saving} onCancel={onClose} />
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Confirmação de exclusão
// ---------------------------------------------------------------------------

interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel?: string
  success: string
  action: () => Promise<unknown>
}

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOptions; onClose: () => void }) {
  const { saving, error, submit } = useSubmit(onClose)
  return (
    <Modal title={opts.title} onClose={onClose} width={440}>
      <p className="muted" style={{ margin: '0 0 8px' }}>
        {opts.message}
      </p>
      <FormError error={error} />
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-danger" disabled={saving} onClick={() => submit(opts.action, opts.success)} autoFocus>
          {saving ? 'Excluindo…' : opts.confirmLabel ?? 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Provider: qualquer tela abre os formulários com useModals()
// ---------------------------------------------------------------------------

type Open =
  | { kind: 'asset'; asset?: Asset }
  | { kind: 'person'; person?: Person }
  | { kind: 'order'; order?: ServiceOrder; assetId?: number }
  | { kind: 'confirm'; opts: ConfirmOptions }

interface ModalsApi {
  openAsset: (asset?: Asset) => void
  openPerson: (person?: Person) => void
  openOrder: (order?: ServiceOrder, assetId?: number) => void
  confirm: (opts: ConfirmOptions) => void
}

const ModalsContext = createContext<ModalsApi | null>(null)

export function ModalsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const value: ModalsApi = {
    openAsset: (asset) => setOpen({ kind: 'asset', asset }),
    openPerson: (person) => setOpen({ kind: 'person', person }),
    openOrder: (order, assetId) => setOpen({ kind: 'order', order, assetId }),
    confirm: (opts) => setOpen({ kind: 'confirm', opts }),
  }
  return (
    <ModalsContext.Provider value={value}>
      {children}
      {open?.kind === 'asset' && <AssetForm asset={open.asset} onClose={close} />}
      {open?.kind === 'person' && <PersonForm person={open.person} onClose={close} />}
      {open?.kind === 'order' && <OrderForm order={open.order} assetId={open.assetId} onClose={close} />}
      {open?.kind === 'confirm' && <ConfirmDialog opts={open.opts} onClose={close} />}
    </ModalsContext.Provider>
  )
}

export function useModals() {
  const ctx = useContext(ModalsContext)
  if (!ctx) throw new Error('useModals fora do ModalsProvider')
  return ctx
}

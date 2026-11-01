import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router'
import { errorMessage } from '@/lib/errors'
import { Artwork } from './Artwork'
import { Icon, type IconName } from './Icon'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------- buttons
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sage' | 'light'

const variants: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  sage: 'btn-sage',
  light: 'btn-light',
}

const base = 'lb-button inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, full, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(base, variants[variant], full && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  )
})

export function ButtonLink({
  variant = 'primary',
  full,
  className,
  ...rest
}: LinkProps & { variant?: Variant; full?: boolean }) {
  return <Link className={cx(base, variants[variant], full && 'w-full', className)} {...rest} />
}

/** Round icon button (bookmark, back, close). */
export function IconButton({
  label,
  icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconName }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('icon-button', className)} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  )
}

/** Rounded filter pills (Explore, Memories, admin tabs). */
export function Pills<K extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
  label: string
  className?: string
}) {
  return (
    <div role="group" aria-label={label} className={cx('pill-group', className)}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          className={cx('pill', value === o.key && 'active')}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Two-way switch such as Solo / Together. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { key: K; label: string; icon?: IconName }[]
  value: K
  onChange: (key: K) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="segmented">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          className={cx(value === o.key && 'active')}
          onClick={() => onChange(o.key)}
        >
          {o.icon && <Icon name={o.icon} size={17} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- layout bits
export function Card({
  children,
  className,
  as: As = 'section',
  id,
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'li'
  id?: string
}) {
  return (
    <As id={id} className={cx('lb-card', className)}>
      {children}
    </As>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
  className,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  eyebrow?: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = `${title} · Little Bloom`
  }, [title])
  return (
    <header className={cx('page-heading flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 ref={ref} tabIndex={-1} className="outline-none">
          {title}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'sage' | 'peach' | 'warn' | 'danger'
}) {
  const tones = {
    neutral: 'bg-ivory text-ink-soft border-line',
    sage: 'bg-sage-50 text-sage-700 border-sage-100',
    peach: 'bg-peach-50 text-peach-700 border-peach-100',
    warn: 'bg-warn-50 text-warn-700 border-warn-50',
    danger: 'bg-danger-50 text-danger border-danger-50',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/** Soft label with an optional icon: "Only you", "5 min", interests. */
export function Chip({
  children,
  icon,
  tone = 'sage',
  className,
}: {
  children: ReactNode
  icon?: IconName
  tone?: 'sage' | 'peach' | 'ivory' | 'white'
  className?: string
}) {
  return (
    <span className={cx('chip', `chip-${tone}`, className)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'success' | 'warn' | 'error'
  title?: string
  children?: ReactNode
}) {
  const tones = {
    info: 'bg-sage-50 border-sage-100 text-sage-700',
    success: 'bg-sage-50 border-sage-500 text-sage-700',
    warn: 'bg-warn-50 border-warn-700/30 text-warn-700',
    error: 'bg-danger-50 border-danger/30 text-danger',
  }
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('rounded-2xl border px-4 py-3 text-sm', tones[tone])}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  )
}

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent',
        small ? 'h-4 w-4' : 'h-6 w-6',
      )}
    />
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-ink-soft">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  return (
    <div className="py-6">
      <Notice tone="error" title={title}>
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="secondary" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Notice>
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
  art = 'keepsakes',
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  art?: string
}) {
  return (
    <div className="empty-state text-center">
      <Artwork name={art} className="empty-art" />
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-ink-soft">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Settings-style row: icon tile, title, description and a chevron. */
export function MenuRow({
  icon,
  title,
  description,
  to,
  onClick,
  tone = 'sage',
  control,
  danger,
  external,
}: {
  icon: IconName
  title: string
  description?: string
  to?: string
  onClick?: () => void
  tone?: 'sage' | 'peach' | 'danger'
  control?: ReactNode
  danger?: boolean
  external?: boolean
}) {
  const body = (
    <>
      <span className={cx('menu-icon', `menu-icon-${danger ? 'danger' : tone}`)}>
        <Icon name={icon} size={20} />
      </span>
      <span className="menu-text">
        <span className={cx('menu-title', danger && 'text-danger')}>{title}</span>
        {description && <span className="menu-desc">{description}</span>}
      </span>
      {control ?? (
        <Icon name="chevron" size={18} className={cx('menu-chevron', danger && 'text-danger')} />
      )}
    </>
  )
  if (control) return <div className="menu-row">{body}</div>
  if (to && external)
    return (
      <a className="menu-row" href={to} target="_blank" rel="noreferrer">
        {body}
      </a>
    )
  if (to)
    return (
      <Link className="menu-row" to={to}>
        {body}
      </Link>
    )
  return (
    <button type="button" className="menu-row" onClick={onClick}>
      {body}
    </button>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  busy,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  busy?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={busy}
      className={cx('switch', checked && 'on')}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}

// ---------------------------------------------------------------- forms
export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string
  hint?: ReactNode
  error?: string | null
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
  id?: string
}) {
  const auto = useId()
  const fieldId = id ?? auto
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errId = error ? `${fieldId}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block font-semibold">
        {label}
      </label>
      {children({ id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const inputCls =
  'lb-input w-full border px-3.5 py-2.5 text-base text-ink placeholder:text-ink-soft/70 aria-[invalid=true]:border-danger'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(inputCls, className)} {...rest} />
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(inputCls, 'min-h-32', className)} {...rest} />
  },
)

export function Choice({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  type = 'radio',
  art,
}: {
  name: string
  value: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  type?: 'radio' | 'checkbox'
  art?: string
}) {
  return (
    <label className={cx('lb-choice', checked && 'checked', art && 'with-art')}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="choice-text">
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-ink-soft">{description}</span>}
      </span>
      {art && <Artwork name={art} className="choice-art" />}
    </label>
  )
}

/** Selectable interest chip (checkbox semantics). */
export function ChoiceChip({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  icon?: IconName
}) {
  return (
    <label className={cx('choice-chip', checked && 'checked')}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {icon && <Icon name={icon} size={16} />}
      {label}
    </label>
  )
}

// ---------------------------------------------------------------- confirm dialog
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
  busy,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,30rem)] rounded-3xl border border-line bg-paper p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-xl font-bold">
          {title}
        </h2>
        <div className="mt-3 space-y-2 text-ink-soft">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

export function Logo({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const light = tone === 'light'
  return (
    <span className={cx('brand inline-flex items-center', light ? 'text-white' : 'text-ink', className)}>
      <svg aria-hidden width="30" height="30" viewBox="0 0 32 32">
        <path
          d="M16 29V14M16 24C5 24 3 18 4 13c8 0 12 4 12 11ZM16 19c0-8 4-12 12-12 1 7-3 12-12 12Z"
          stroke={light ? '#f3f6ee' : '#6f8668'}
          strokeWidth="1.5"
          fill={light ? '#a9bda7' : '#d7e2cc'}
          strokeLinejoin="round"
        />
        <path d="M16 14C8 10 10 3 15 2c6 3 7 8 1 12Z" fill={light ? '#f0b9a3' : '#d98b70'} />
      </svg>
      Little Bloom
    </span>
  )
}

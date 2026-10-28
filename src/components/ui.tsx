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

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------- buttons
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-peach-700 text-white hover:bg-peach-500 disabled:bg-peach-500/60',
  secondary: 'bg-paper text-ink border border-line hover:bg-peach-50 disabled:opacity-60',
  ghost: 'bg-transparent text-peach-700 hover:bg-peach-50 disabled:opacity-60',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-60',
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold min-h-11 transition-colors disabled:cursor-not-allowed'

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

export function ButtonLink({ variant = 'primary', full, className, ...rest }: LinkProps & { variant?: Variant; full?: boolean }) {
  return <Link className={cx(base, variants[variant], full && 'w-full', className)} {...rest} />
}

// ---------------------------------------------------------------- layout bits
export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <As className={cx('rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_2px_rgba(43,38,32,0.04)]', className)}>{children}</As>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = `${title} · Little Bloom`
  }, [title])
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 ref={ref} tabIndex={-1} className="text-2xl font-bold text-ink outline-none sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'sage' | 'peach' | 'warn' | 'danger' }) {
  const tones = {
    neutral: 'bg-ivory text-ink-soft border-line',
    sage: 'bg-sage-50 text-sage-700 border-sage-100',
    peach: 'bg-peach-50 text-peach-700 border-peach-100',
    warn: 'bg-warn-50 text-warn-700 border-warn-50',
    danger: 'bg-danger-50 text-danger border-danger-50',
  }
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>
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
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-xl border px-4 py-3 text-sm', tones[tone])}>
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

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: { error: unknown; onRetry?: () => void; title?: string }) {
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

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper/60 px-5 py-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-ink-soft">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
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
      {hint && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {children({ id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-soft/70 focus:border-peach-700 aria-[invalid=true]:border-danger'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputCls, className)} {...rest} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cx(inputCls, 'min-h-32', className)} {...rest} />
})

export function Choice({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  type = 'radio',
}: {
  name: string
  value: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  type?: 'radio' | 'checkbox'
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3',
        checked ? 'border-peach-700 bg-peach-50' : 'border-line bg-paper',
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-peach-700"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-ink-soft">{description}</span>}
      </span>
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
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-line bg-paper p-0 text-ink backdrop:bg-ink/40"
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

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-bold text-ink', className)}>
      <svg aria-hidden width="28" height="28" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="15" fill="#fbe2d4" />
        <path d="M16 24c-4-2-7-5.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 23 15c0 3.5-3 7-7 9z" fill="#a4532f" />
        <path d="M16 24v4" stroke="#6f8f68" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Little Bloom
    </span>
  )
}

import { Link, NavLink, Outlet, isRouteErrorResponse, useRouteError } from 'react-router'
import { useAuth } from '@/lib/auth'
import { ButtonLink, Logo, Notice, cx } from '@/components/ui'

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2"
    >
      Skip to content
    </a>
  )
}

function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-5xl px-4 pb-24 text-sm text-ink-soft md:pb-10">
      <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link to="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
        <Link to="/terms" className="underline-offset-4 hover:underline">Pilot terms</Link>
        <Link to="/help" className="underline-offset-4 hover:underline">Help</Link>
      </nav>
      <p className="mt-3 max-w-2xl">
        Little Bloom is a bonding and memory app. It does not provide medical advice, diagnosis or monitoring. If
        you are worried about your health or your baby, contact your care provider or emergency services.
      </p>
    </footer>
  )
}

export function PublicLayout() {
  const { session } = useAuth()
  return (
    <>
      <SkipLink />
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Link to="/" aria-label="Little Bloom home">
          <Logo />
        </Link>
        {session ? (
          <ButtonLink to="/today" variant="secondary">Open app</ButtonLink>
        ) : (
          <ButtonLink to="/sign-in" variant="secondary">Sign in</ButtonLink>
        )}
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

const nav = [
  { to: '/today', label: 'Today', icon: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { to: '/explore', label: 'Explore', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm3.5-12.5-2 5-5 2 2-5 5-2z' },
  { to: '/memories', label: 'Memories', icon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' },
  { to: '/settings', label: 'You', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0' },
]

function NavIcon({ d }: { d: string }) {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export function AppLayout() {
  const { ctx } = useAuth()
  const isAdmin = !!ctx?.roles.length
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cx(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold',
      isActive ? 'bg-peach-50 text-peach-700' : 'text-ink-soft hover:bg-paper',
    )
  return (
    <>
      <SkipLink />
      <div className="mx-auto flex max-w-6xl gap-8 px-4 md:py-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-6 hidden h-fit w-56 shrink-0 md:block">
          <Link to="/today" aria-label="Little Bloom today" className="mb-6 block px-3">
            <Logo />
          </Link>
          <nav aria-label="Main" className="space-y-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkCls}>
                <NavIcon d={n.icon} />
                {n.label}
              </NavLink>
            ))}
            <NavLink to="/family" className={linkCls}>
              <NavIcon d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0m-2-3.5A6 6 0 0 1 22 20" />
              Family
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={linkCls}>
                <NavIcon d="M4 6h16M4 12h16M4 18h10" />
                Admin
              </NavLink>
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <header className="flex items-center justify-between py-4 md:hidden">
            <Link to="/today" aria-label="Little Bloom today">
              <Logo />
            </Link>
            <div className="flex gap-1">
              <Link to="/family" className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-paper">Family</Link>
              {isAdmin && (
                <Link to="/admin" className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-paper">Admin</Link>
              )}
            </div>
          </header>
          {ctx?.profile.content_paused && (
            <div className="mb-4">
              <Notice tone="info">
                Pregnancy content is paused. Your memories are still here. <Link className="underline" to="/settings">Change in Settings</Link>
              </Notice>
            </div>
          )}
          <main id="main" className="pb-28 md:pb-10">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {nav.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) =>
                  cx('flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold', isActive ? 'text-peach-700' : 'text-ink-soft')
                }
              >
                <NavIcon d={n.icon} />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="mt-2 text-ink-soft">
        {notFound ? 'This page does not exist.' : 'Please reload the page. If the problem continues, contact support.'}
      </p>
      <div className="mt-6">
        <ButtonLink to="/">Go home</ButtonLink>
      </div>
    </main>
  )
}

import { Link, NavLink, Outlet, isRouteErrorResponse, useRouteError } from 'react-router'
import { useAuth } from '@/lib/auth'
import { ButtonLink, Logo, Notice, cx } from '@/components/ui'
import { Icon, type IconName } from '@/components/Icon'

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
    <footer className="public-footer">
      <div className="footer-top">
        <Logo />
        <nav aria-label="Footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Pilot terms</Link>
          <Link to="/help">Help & support</Link>
        </nav>
      </div>
      <p>
        Little Bloom is a bonding and memory app. It does not provide medical advice, diagnosis or monitoring.
        If you are worried about your health or your baby, contact your care provider or emergency services.
      </p>
    </footer>
  )
}

export function PublicLayout() {
  const { session } = useAuth()
  return (
    <div className="public-shell">
      <SkipLink />
      <header className="public-header">
        <Link to="/" aria-label="Little Bloom home">
          <Logo />
        </Link>
        <nav className="public-links" aria-label="Discover">
          <Link to="/#how-it-works">Our approach</Link>
          <Link to="/sample">Activities</Link>
          <Link to="/#memories">Memories</Link>
        </nav>
        <div className="public-actions">
          {session ? (
            <ButtonLink to="/today">
              Open app <Icon name="arrow" size={16} />
            </ButtonLink>
          ) : (
            <>
              <Link to="/sign-in">Sign in</Link>
              <ButtonLink to="/sample" className="header-try">
                Get started <Icon name="arrow" size={16} />
              </ButtonLink>
            </>
          )}
        </div>
      </header>
      <main id="main" className="public-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

const nav: { to: string; label: string; icon: IconName }[] = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/explore', label: 'Explore', icon: 'compass' },
  { to: '/memories', label: 'Memories', icon: 'image' },
  { to: '/settings', label: 'You', icon: 'user' },
]

export function AppLayout() {
  const { ctx } = useAuth()
  const isAdmin = !!ctx?.roles.length
  const name = ctx?.profile.display_name || 'You'
  const linkCls = ({ isActive }: { isActive: boolean }) => cx('side-link', isActive && 'active')
  return (
    <div className="app-shell">
      <SkipLink />
      <aside className="app-sidebar">
        <Link to="/today" aria-label="Little Bloom today">
          <Logo tone="light" />
        </Link>
        <nav aria-label="Main">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls}>
              <Icon name={n.icon} size={22} />
              {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={linkCls}>
              <Icon name="grid" size={22} />
              Content studio
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/help" className="side-link">
            <Icon name="help" size={22} />
            Help & support
          </Link>
          <Link to="/settings" className="sidebar-user">
            <span className="avatar">{name.charAt(0).toUpperCase()}</span>
            <span>
              {name}
              <small>Your space</small>
            </span>
          </Link>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="mobile-header">
          <Link to="/today" aria-label="Little Bloom today">
            <Logo />
          </Link>
          <Link to="/settings" aria-label="Your space" className="avatar">
            {name.charAt(0).toUpperCase()}
          </Link>
        </header>
        <main id="main" className="app-main">
          {ctx?.profile.content_paused && (
            <div className="mb-6">
              <Notice tone="info">
                Pregnancy content is paused. Your memories are still here.{' '}
                <Link className="underline" to="/settings">
                  Change in Your space
                </Link>
              </Notice>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <nav aria-label="Main" className="mobile-nav">
        <ul>
          {nav.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={n.icon} />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
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
        {notFound
          ? 'This page does not exist.'
          : 'Please reload the page. If the problem continues, contact support.'}
      </p>
      <div className="mt-6">
        <ButtonLink to="/">Go home</ButtonLink>
      </div>
    </main>
  )
}

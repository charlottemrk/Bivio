import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import MyEvents from './pages/MyEvents'
import EventCreate from './pages/EventCreate'
import EventPublic from './pages/EventPublic'
import EventJoin from './pages/EventJoin'
import EventMatches from './pages/EventMatches'
import EventConfirmed from './pages/EventConfirmed'
import EventInvite from './pages/EventInvite'
import EventEdit from './pages/EventEdit'
import Dashboard from './pages/Dashboard'
import EventRSVP from './pages/EventRSVP'
import MatchDemo from './pages/MatchDemo'

const W = 960
const col: React.CSSProperties = { maxWidth: W, width: '100%', margin: '0 auto' }

import { DEV_BYPASS_AUTH } from './config'

/* Pages where the full lavender bg looks intentional (no card padding needed) */
const ROOT_PATHS = ['/', '/auth', '/events', '/events/new', '/profile']
const isRoot = (p: string) => ROOT_PATHS.includes(p) || p.startsWith('/event/')

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
    <div style={{ width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-violet)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (DEV_BYPASS_AUTH) return <>{children}</>
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />
  return <>{children}</>
}

/** Root route: logged-in → home, anonymous → landing */
function RootRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user || DEV_BYPASS_AUTH) return <Navigate to="/events" replace />
  return <Landing />
}

function AppShell() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const showBack = (!isRoot(location.pathname) ||
    (location.pathname.startsWith('/event/') && location.pathname.split('/').length > 3)) &&
    !location.pathname.endsWith('/invite')

  const initial = profile?.name
    ? profile.name[0].toUpperCase()
    : user?.email?.[0].toUpperCase() ?? '?'

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--color-bg)' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30, width: '100%',
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(245,243,238,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ ...col, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Left: back arrow + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 14, fontWeight: 500, color: 'var(--color-text-2)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 10px 6px 4px', borderRadius: 8, fontFamily: 'inherit',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Retour
              </button>
            )}

            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <img src="/bivio-light.svg" alt="Bivio" style={{ height: 28, display: 'block' }} />
            </button>
          </div>

          {/* Center: nav links (logged-in only) */}
          {user && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[
                { path: '/events', label: 'Mes events' },
              ].map(item => {
                const active = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      padding: '6px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                      color: active ? 'var(--color-violet)' : 'var(--color-text-2)',
                      background: active ? 'var(--color-violet-light)' : 'none',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>
          )}

          {/* Right: auth / create CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: user ? 'none' : 1, justifyContent: 'flex-end' }}>
            {user ? (
              <button
                onClick={() => navigate('/profile')}
                aria-label="Mon profil"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--color-violet-light)', color: 'var(--color-violet)',
                  fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {initial}
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                style={{
                  padding: '8px 14px', fontSize: 14, fontWeight: 700,
                  color: 'var(--color-text-2)', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ ...col, padding: '16px 24px 80px' }}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><MyEvents /></ProtectedRoute>} />
          <Route path="/events/new" element={<EventCreate />} />
          <Route path="/event/:shortId" element={<EventPublic />} />
          <Route path="/event/:shortId/rsvp" element={<EventRSVP />} />
          <Route path="/event/:shortId/join" element={<EventJoin />} />
          <Route path="/event/:shortId/invite" element={<ProtectedRoute><EventInvite /></ProtectedRoute>} />
          <Route path="/event/:shortId/edit" element={<ProtectedRoute><EventEdit /></ProtectedRoute>} />
          <Route path="/event/:shortId/matches" element={<EventMatches />} />
          <Route path="/event/:shortId/confirmed" element={<EventConfirmed />} />
          <Route path="/event/:shortId/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/demo/matches" element={<MatchDemo />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

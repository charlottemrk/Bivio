import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Avatar } from './components/Avatar'
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

          {/* Left: logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
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
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                }}
              >
                <Avatar
                  name={profile?.name || user.email}
                  size={34}
                  src={profile?.avatar_url || null}
                />
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

      {/* ── Bottom navigation (mobile only, logged-in) ── */}
      {user && (
        <nav className="bottom-nav">
          {[
            {
              path: '/events',
              label: 'Mes events',
              icon: (active: boolean) => (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M7 3v4M15 3v4M3 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                  {active && <circle cx="11" cy="15" r="1.5" fill="currentColor"/>}
                </svg>
              ),
            },
            {
              path: '/events/new',
              label: 'Créer',
              icon: (_active: boolean) => (
                <div style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: 'var(--color-violet)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 300, lineHeight: 1,
                  boxShadow: '0 2px 8px rgba(124,196,0,0.35)',
                  marginTop: -10,
                }}>
                  +
                </div>
              ),
            },
            {
              path: '/profile',
              label: 'Profil',
              icon: (_active: boolean) => (
                <Avatar name={profile?.name || user.email} size={26} src={profile?.avatar_url || null} />
              ),
            },
          ].map(({ path, label, icon }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="bottom-nav-item"
                aria-label={label}
                style={{ color: active ? 'var(--color-violet)' : 'var(--color-text-3)' }}
              >
                {icon(active)}
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  marginTop: 3, lineHeight: 1,
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </nav>
      )}
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

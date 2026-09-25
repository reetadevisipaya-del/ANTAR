import { FormEvent, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Building2, HeartHandshake, LockKeyhole, LogOut, ShieldCheck, Stethoscope, Users } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Portal } from './types'

const portalCopy: Record<Portal, { title: string; subtitle: string; icon: typeof Users }> = {
  parent: { title: 'Parent Portal', subtitle: 'Stay connected to your child’s learning, care and support.', icon: HeartHandshake },
  staff: { title: 'Staff Portal', subtitle: 'For teachers, special educators and therapists.', icon: Stethoscope },
  admin: { title: 'Institute Admin', subtitle: 'Secure institute access for authorized administrators.', icon: ShieldCheck },
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {children}
    </main>
  )
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">A</div>
      <div>
        <div className="brand-name">ANTAR</div>
        <div className="brand-tagline">Every child leaves a mark.</div>
      </div>
    </div>
  )
}

function Landing() {
  const navigate = useNavigate()
  return (
    <Shell>
      <section className="auth-layout">
        <div className="intro-panel">
          <Brand />
          <div className="intro-copy">
            <span className="eyebrow">Secure care communication</span>
            <h1>One calm place for families, care teams and institutions.</h1>
            <p>
              ANTAR is designed for clear, private communication between parents and the professionals supporting a child.
            </p>
            <div className="trust-row">
              <span><LockKeyhole size={17} /> Private by design</span>
              <span><Building2 size={17} /> Institution connected</span>
            </div>
          </div>
        </div>

        <div className="portal-panel">
          <div className="portal-card">
            <div className="panel-heading">
              <span className="eyebrow">Choose your portal</span>
              <h2>Welcome to ANTAR</h2>
              <p>Select the account type assigned by your institution.</p>
            </div>

            <div className="portal-grid">
              {(Object.keys(portalCopy) as Portal[]).map((portal) => {
                const item = portalCopy[portal]
                const Icon = item.icon
                return (
                  <button className="portal-option" key={portal} onClick={() => navigate(`/login/${portal}`)}>
                    <span className="portal-icon"><Icon size={22} /></span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                    <span className="arrow">→</span>
                  </button>
                )
              })}
            </div>

            <p className="legal-copy">Access is limited to accounts authorized by a participating institution.</p>
          </div>
        </div>
      </section>
    </Shell>
  )
}

function Login() {
  const { portal = 'parent' } = useParams()
  const portalName = (['parent', 'staff', 'admin'].includes(portal) ? portal : 'parent') as Portal
  const copy = portalCopy[portalName]
  const Icon = copy.icon
  const { signIn, user, membership } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user && membership) return <Navigate to="/app" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password, portalName)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <section className="single-card-wrap">
        <div className="login-card">
          <button className="back-link" onClick={() => navigate('/')}>← All portals</button>
          <Brand />
          <div className="login-title-row">
            <span className="portal-icon large"><Icon size={24} /></span>
            <div>
              <span className="eyebrow">{copy.title}</span>
              <h1>Sign in to ANTAR</h1>
            </div>
          </div>
          <p className="login-subtitle">{copy.subtitle}</p>

          <form onSubmit={onSubmit} className="login-form">
            <label>
              Email address
              <input
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>
            <div className="form-row">
              <button
                className="text-button"
                type="button"
                onClick={async () => {
                  if (!email.trim()) {
                    setError('Enter your email address first.')
                    return
                  }
                  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/reset-password`,
                  })
                  setError(resetError ? resetError.message : 'Password reset email sent.')
                }}
              >
                Forgot password?
              </button>
            </div>
            {error && <div className="status-message">{error}</div>}
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Sign in securely'}
            </button>
          </form>
        </div>
      </section>
    </Shell>
  )
}

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const navigate = useNavigate()

  return (
    <Shell>
      <section className="single-card-wrap">
        <div className="login-card">
          <Brand />
          <span className="eyebrow">Account recovery</span>
          <h1>Choose a new password</h1>
          <form
            className="login-form"
            onSubmit={async (event) => {
              event.preventDefault()
              const { error } = await supabase.auth.updateUser({ password })
              if (error) setStatus(error.message)
              else {
                setStatus('Password updated. You can sign in now.')
                setTimeout(() => navigate('/'), 1000)
              }
            }}
          >
            <label>
              New password
              <input minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {status && <div className="status-message">{status}</div>}
            <button className="primary-button" type="submit">Update password</button>
          </form>
        </div>
      </section>
    </Shell>
  )
}

function ProtectedApp() {
  const { user, membership, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <Shell><div className="loading-screen">Loading ANTAR…</div></Shell>
  if (!user || !membership) return <Navigate to="/" replace state={{ from: location }} />

  const institutionName = membership.institutions?.name ?? 'Your institution'
  const roleLabel = membership.role.replaceAll('_', ' ')

  return (
    <Shell>
      <section className="dashboard-shell">
        <header className="dashboard-header">
          <Brand />
          <button className="secondary-button" onClick={() => void signOut()}><LogOut size={17}/> Logout</button>
        </header>
        <div className="dashboard-card">
          <span className="eyebrow">Authentication complete</span>
          <h1>Welcome to ANTAR</h1>
          <p>Your secure session is active and your role was verified from the institution database.</p>
          <div className="identity-grid">
            <div><small>Role</small><strong>{roleLabel}</strong></div>
            <div><small>Institution</small><strong>{institutionName}</strong></div>
            <div><small>Account</small><strong>{user.email ?? 'Authenticated user'}</strong></div>
          </div>
          <div className="success-banner"><ShieldCheck size={19}/> Protected route active</div>
        </div>
      </section>
    </Shell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login/:portal" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/app" element={<ProtectedApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

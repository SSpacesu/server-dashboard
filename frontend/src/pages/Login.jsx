import { useState } from 'react'

import { useAuth } from '../auth/AuthContext'
import PasswordVisibilityIcon from '../assets/PasswordVisibilityIcon'


function Login() {
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitLogin = async event => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(username, password)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <h1 className="login-title" id="login-title">Server Dashboard Login</h1>

        <form className="login-form" onSubmit={submitLogin}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </label>

          <div className="login-field">
            <label htmlFor="login-password">
              Password
            </label>

            <span className="login-password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
              />

              <button
                className="login-password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-controls="login-password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword(visible => !visible)}
                disabled={submitting}
              >
                <PasswordVisibilityIcon visible={showPassword} />
              </button>
            </span>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
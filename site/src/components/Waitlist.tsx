'use client'
import { useCallback, useId, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Button } from '@/components/Button'
import { Turnstile } from '@/components/Turnstile'

// Same pattern as the Worker's check (website-2.0 worker/waitlist.js EMAIL_PATTERN).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'sending' | 'done' | 'failed'

/**
 * Email sign-up for the Disha beta. Posts to POST /waitlist/disha on the hikaya-contact-form
 * Worker in website-2.0, which checks Turnstile, stores the row in D1 and asks for review in Slack.
 * The Turnstile script loads when the email field first gets focus, so visitors who only read
 * the page send nothing to Cloudflare.
 */
export function Waitlist() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [armed, setArmed] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  // A Turnstile token works once; a new key mounts a fresh widget after a failed send.
  const [botCheckKey, setBotCheckKey] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const renderedAt = useRef(Date.now())
  const handleVerify = useCallback((value: string) => setToken(value), [])
  const handleExpire = useCallback(() => setToken(null), [])

  function validate(value: string) {
    const message = value && !EMAIL_PATTERN.test(value.trim()) ? 'Enter a valid email address.' : ''
    setError(message)
    return message === ''
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token || !email.trim() || !validate(email)) return
    const website = new FormData(e.currentTarget).get('website') ?? ''
    setStatus('sending')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_CONTACT_API_URL}/waitlist/disha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          turnstileToken: token,
          website,
          _rendered: renderedAt.current,
        }),
      })
      if (!response.ok) throw new Error(`Waitlist request failed with ${response.status}`)
      setStatus('done')
    } catch {
      setToken(null)
      setBotCheckKey((key) => key + 1)
      setStatus('failed')
    }
  }

  if (status === 'done') {
    return (
      <div role="status" className="max-w-xl">
        <p className="text-xl">You're on the list</p>
        <p className="mt-2 text-muted">
          We review sign-ups and email a confirmation. TestFlight details follow when the beta
          opens.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl" noValidate>
      <label htmlFor={id} className="block text-sm">
        Email
      </label>
      <input
        type="email"
        id={id}
        name="email"
        autoComplete="email"
        required
        value={email}
        onFocus={() => {
          if (!armed) renderedAt.current = Date.now()
          setArmed(true)
        }}
        onChange={(e) => {
          setEmail(e.target.value)
          if (error) validate(e.target.value)
        }}
        onBlur={() => validate(email)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(
          'mt-2 block min-h-11 w-full border bg-bg px-4 text-base focus:border-ink focus:outline-none',
          error ? 'border-danger' : 'border-line hover:border-faint',
        )}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
      {/* Honeypot field: hidden from people, filled in by bots */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
      />
      {armed && <Turnstile key={botCheckKey} onVerify={handleVerify} onExpire={handleExpire} />}
      <Button
        type="submit"
        className="mt-4"
        disabled={!token || !email.trim() || status === 'sending'}
      >
        {status === 'sending' ? 'Joining…' : 'Join the waitlist'}
      </Button>
      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {status === 'failed' && (
          <span className="mb-2 block text-danger">
            That didn't go through. Try again in a minute.
          </span>
        )}
        The beta runs on iPhone (iOS 17.5 or later) through TestFlight. We use your email only to
        send the beta invite. See the{' '}
        <Link
          href="/privacy/#waitlist"
          className="text-ink underline decoration-line underline-offset-4 hover:text-link hover:decoration-link"
        >
          privacy policy
        </Link>
        .
      </p>
    </form>
  )
}

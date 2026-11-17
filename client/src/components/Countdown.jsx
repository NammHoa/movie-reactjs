import { useEffect, useRef, useState } from 'react'

const two = (n) => String(n).padStart(2, '0')

export default function Countdown({ expiresAt, onExpire, className = '' }) {
  const [now, setNow] = useState(() => Date.now())
  const left = new Date(expiresAt).getTime() - now
  const over = left <= 0
  const callback = useRef(onExpire)

  useEffect(() => {
    callback.current = onExpire
  })

  useEffect(() => {
    if (over) {
      callback.current?.()
      return
    }
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [over])

  const secs = Math.max(0, Math.ceil(left / 1000))
  return (
    <span className={`font-mono font-bold tabular-nums ${secs <= 60 ? 'text-red-600' : ''} ${className}`}>
      {two(Math.floor(secs / 60))}:{two(secs % 60)}
    </span>
  )
}

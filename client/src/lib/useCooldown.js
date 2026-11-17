import { useCallback, useEffect, useState } from 'react'

// Đếm ngược số giây còn phải chờ. start(giây) bắt đầu, clear() hủy.
export function useCooldown() {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!until) return
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= until) setUntil(0)
    }, 1000)
    return () => clearInterval(timer)
  }, [until])

  const start = useCallback((seconds) => {
    const t = Date.now()
    setNow(t)
    setUntil(t + seconds * 1000)
  }, [])
  const clear = useCallback(() => setUntil(0), [])

  return { secondsLeft: until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0, start, clear }
}

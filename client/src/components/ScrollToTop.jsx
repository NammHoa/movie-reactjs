import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { shouldScrollTop } from '../lib/scroll'

// React Router không tự cuộn khi đổi trang, nên trang mới sẽ mở ở vị trí cuộn của trang cũ
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()
  const previous = useRef(pathname)

  // useLayoutEffect: cuộn trước khi trang mới được vẽ để không bị nháy
  useLayoutEffect(() => {
    const from = previous.current
    previous.current = pathname
    if (shouldScrollTop({ from, to: pathname, hash, navigationType })) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash, navigationType])

  return null
}

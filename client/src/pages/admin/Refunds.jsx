import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { errorMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/movie'
import RefundPanel from './RefundPanel'
import { ErrorText, PageHeader, inputCls } from './ui'

const LIMIT = 10

const TABS = [
  { value: 'open', label: 'Cần xử lý' },
  { value: 'success', label: 'Đã hoàn' },
  { value: 'all', label: 'Tất cả' },
]

export default function Refunds() {
  const [status, setStatus] = useState('open')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [done, setDone] = useState({ key: '', data: null, error: '' })

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(input.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [input])

  const key = `${status}|${q}|${page}|${reload}`
  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/refunds', { params: { status, q: q || undefined, page, limit: LIMIT } })
      .then(({ data }) => !cancelled && setDone({ key, data, error: '' }))
      .catch((err) => !cancelled && setDone((d) => ({ ...d, key, error: errorMessage(err, 'Không thể tải danh sách hoàn tiền') })))
    return () => {
      cancelled = true
    }
  }, [key, status, q, page])

  const { data, error } = done
  const loading = done.key !== key
  const items = data?.items ?? []
  const count = (v) => (data ? ` (${data.counts[v].toLocaleString('vi-VN')})` : '')

  return (
    <div>
      <PageHeader title="Hoàn tiền" />

      <div className="mb-4 space-y-3">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tìm theo mã vé"
          aria-label="Tìm theo mã vé"
          maxLength={20}
          className={`${inputCls} h-11`}
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setStatus(t.value)
                setPage(1)
              }}
              aria-pressed={status === t.value}
              className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition ${
                status === t.value ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.label}
              {count(t.value)}
            </button>
          ))}
        </div>
      </div>

      <ErrorText message={error} />
      {!data && !error && <p className="text-gray-500">Đang tải...</p>}

      {data && (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {items.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
              {q ? 'Không có khoản hoàn tiền nào khớp mã vé này.' : status === 'open' ? 'Không có khoản hoàn tiền nào cần xử lý.' : 'Chưa có khoản hoàn tiền nào.'}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {items.map((r) => (
                <li key={r._id} className="min-w-0 rounded-lg bg-white p-4 shadow-sm">
                  <p className="font-mono text-lg font-bold tracking-wider text-brand">{r.booking?.code ?? '—'}</p>
                  <p className="mt-1 break-words font-semibold">{r.booking?.showtime?.movie?.title ?? 'Phim đã bị xóa'}</p>
                  <p className="text-sm text-gray-500">
                    {r.booking?.showtime ? formatDateTime(r.booking.showtime.startTime) : '—'} · Ghế {r.booking?.seats?.join(', ') ?? '—'}
                  </p>
                  <p className="mb-3 break-all text-sm text-gray-500">{r.user ? `${r.user.name} · ${r.user.email}` : 'Tài khoản đã bị xóa'}</p>
                  <RefundPanel refund={r} onChanged={() => setReload((n) => n + 1)} />
                  <p className="mt-2 text-xs text-gray-400">Yêu cầu lúc {formatDateTime(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}

          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-10 rounded border border-gray-300 bg-white px-4 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                ← Trước
              </button>
              <span className="text-center text-gray-500">Trang {data.page} / {data.pages} · {data.total} khoản</span>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="h-10 rounded border border-gray-300 bg-white px-4 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                Sau →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/errors'
import { formatDateTime, formatPrice } from '../../lib/movie'
import { ErrorText, PageHeader, inputCls } from './ui'

const LIMIT = 15

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'Người dùng' },
]

function RoleBadge({ role }) {
  return role === 'admin' ? (
    <span className="inline-block whitespace-nowrap rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Admin</span>
  ) : (
    <span className="inline-block whitespace-nowrap rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">Người dùng</span>
  )
}

function RoleButton({ u, me, busy, onChange }) {
  if (u._id === me) return <span className="text-xs text-gray-400">Tài khoản của bạn</span>
  const promote = u.role !== 'admin'
  return (
    <button
      onClick={() => onChange(u)}
      disabled={busy}
      className={`h-10 whitespace-nowrap rounded border px-3 text-sm font-semibold disabled:opacity-50 ${
        promote ? 'border-brand text-brand hover:bg-brand/5' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
      }`}
    >
      {busy ? 'Đang lưu...' : promote ? 'Cấp quyền admin' : 'Hạ xuống người dùng'}
    </button>
  )
}

export default function Users() {
  const { user } = useAuth()
  const me = user?.id
  const [role, setRole] = useState('all')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState({ key: '', data: null, error: '' })

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(input.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [input])

  const key = `${role}|${q}|${page}|${reload}`
  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/users', { params: { role, q: q || undefined, page, limit: LIMIT } })
      .then(({ data }) => !cancelled && setDone({ key, data, error: '' }))
      .catch((err) => !cancelled && setDone((d) => ({ ...d, key, error: errorMessage(err, 'Không thể tải danh sách người dùng') })))
    return () => {
      cancelled = true
    }
  }, [key, role, q, page])

  const { data, error } = done
  const loading = done.key !== key
  const items = data?.items ?? []

  const changeRole = async (u) => {
    const next = u.role === 'admin' ? 'user' : 'admin'
    const message =
      next === 'admin'
        ? `Cấp quyền admin cho ${u.name}? Người này sẽ quản lý được phim, rạp, đơn đặt vé và người dùng.`
        : `Hạ ${u.name} xuống người dùng thường? Họ sẽ mất quyền vào khu vực quản trị ngay lập tức.`
    if (!window.confirm(message)) return
    setBusyId(u._id)
    setActionError('')
    try {
      await api.patch(`/admin/users/${u._id}/role`, { role: next })
      setReload((r) => r + 1)
    } catch (err) {
      setActionError(errorMessage(err, 'Không thể đổi quyền'))
      setReload((r) => r + 1)
    } finally {
      setBusyId(null)
    }
  }

  const count = (v) => (data ? ` (${data.counts[v].toLocaleString('vi-VN')})` : '')

  return (
    <div>
      <PageHeader title="Người dùng" />

      <div className="mb-4 space-y-3">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tìm theo tên, email, số điện thoại"
          aria-label="Tìm người dùng"
          className={`${inputCls} h-11`}
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setRole(t.value)
                setPage(1)
              }}
              aria-pressed={role === t.value}
              className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition ${
                role === t.value ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.label}
              {count(t.value)}
            </button>
          ))}
        </div>
      </div>

      <ErrorText message={error || actionError} />
      {!data && !error && <p className="text-gray-500">Đang tải...</p>}

      {data && (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {items.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
              {q || role !== 'all' ? 'Không có người dùng nào khớp bộ lọc.' : 'Chưa có người dùng nào.'}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm xl:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Người dùng</th>
                      <th className="px-4 py-3">Liên hệ</th>
                      <th className="px-4 py-3">Quyền</th>
                      <th className="px-4 py-3 text-right">Đã thanh toán</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((u) => (
                      <tr key={u._id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{u.name}{u._id === me && <span className="ml-1 text-xs text-gray-400">(bạn)</span>}</p>
                          <p className="text-xs text-gray-400">Tham gia {formatDateTime(u.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="break-all">{u.email}</p>
                          <p className="text-xs text-gray-500">{u.phone ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold">{formatPrice(u.totalSpent)}</p>
                          <p className="text-xs text-gray-500">{u.paidBookings} đơn</p>
                        </td>
                        <td className="px-4 py-3 text-right"><RoleButton u={u} me={me} busy={busyId === u._id} onChange={changeRole} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
                {items.map((u) => (
                  <li key={u._id} className="min-w-0 rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-semibold">{u.name}{u._id === me && <span className="ml-1 text-xs font-normal text-gray-400">(bạn)</span>}</p>
                      <RoleBadge role={u.role} />
                    </div>
                    <p className="mt-1 break-all text-sm text-gray-600">{u.email}</p>
                    <p className="text-sm text-gray-500">{u.phone ?? '—'}</p>
                    <div className="mt-2 flex items-end justify-between gap-2 text-sm">
                      <span className="text-gray-500">{u.paidBookings} đơn</span>
                      <span className="font-bold">{formatPrice(u.totalSpent)}</span>
                    </div>
                    <div className="mt-3 flex min-h-10 items-center justify-end border-t pt-3">
                      <RoleButton u={u} me={me} busy={busyId === u._id} onChange={changeRole} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-10 rounded border border-gray-300 bg-white px-4 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                ← Trước
              </button>
              <span className="text-center text-gray-500">Trang {data.page} / {data.pages} · {data.total.toLocaleString('vi-VN')} người</span>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="h-10 rounded border border-gray-300 bg-white px-4 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                Sau →
              </button>
            </div>
          )}
          {data.pages <= 1 && items.length > 0 && <p className="mt-4 text-center text-sm text-gray-400">{data.total.toLocaleString('vi-VN')} người</p>}
        </div>
      )}
    </div>
  )
}

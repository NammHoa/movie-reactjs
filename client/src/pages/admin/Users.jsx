import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/errors'
import { formatDateTime, formatPrice } from '../../lib/movie'
import { AssignCinemaForm, CreateManagerForm, ResetPasswordForm } from './StaffForms'
import { ErrorText, PageHeader, inputCls, primaryBtn } from './ui'

const LIMIT = 15

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Quản lý rạp' },
  { value: 'user', label: 'Người dùng' },
]

const BADGES = {
  admin: { label: 'Admin', cls: 'bg-brand/10 text-brand' },
  manager: { label: 'Quản lý rạp', cls: 'bg-blue-100 text-blue-700' },
  user: { label: 'Người dùng', cls: 'bg-gray-200 text-gray-600' },
}

function RoleBadge({ role }) {
  const b = BADGES[role] ?? BADGES.user
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span>
}

// Dòng phụ của tài khoản chi nhánh: tên đăng nhập và rạp đang quản lý
function BranchLine({ u }) {
  if (!u.username) return null
  return (
    <p className="break-words text-xs text-gray-600">
      Đăng nhập: <b className="break-all">{u.username}</b>
      {u.cinema?.name ? ` · ${u.cinema.name}` : ''}
    </p>
  )
}

const actionCls = 'h-10 whitespace-nowrap rounded border px-3 text-sm font-semibold disabled:opacity-50'
const strongAction = `${actionCls} border-brand text-brand hover:bg-brand/5`
const plainAction = `${actionCls} border-gray-300 text-gray-700 hover:bg-gray-100`

function UserActions({ u, me, busy, onToggleAdmin, onRevoke, onOpen }) {
  if (u._id === me) return <span className="text-xs text-gray-400">Tài khoản của bạn</span>

  // Tài khoản chi nhánh không cấp quyền admin được
  if (u.username && u.role !== 'admin') {
    const active = u.role === 'manager'
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={() => onOpen({ kind: 'assign', account: u })} className={active ? plainAction : strongAction}>
          {active ? 'Đổi rạp' : 'Cấp lại quyền'}
        </button>
        <button onClick={() => onOpen({ kind: 'password', account: u })} className={plainAction}>Đặt lại mật khẩu</button>
        {active && (
          <button onClick={() => onRevoke(u)} disabled={busy} className={plainAction}>
            {busy ? 'Đang lưu...' : 'Gỡ quyền'}
          </button>
        )}
      </div>
    )
  }

  const promote = u.role !== 'admin'
  return (
    <button onClick={() => onToggleAdmin(u)} disabled={busy} className={promote ? strongAction : plainAction}>
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
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null) // { kind: 'create' | 'assign' | 'password', account }
  const [cinemas, setCinemas] = useState([])
  const [done, setDone] = useState({ key: '', data: null, error: '' })

  useEffect(() => {
    api
      .get('/cinemas')
      .then(({ data }) => setCinemas(data))
      .catch((err) => setActionError(errorMessage(err, 'Không thể tải danh sách rạp')))
  }, [])

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

  const changeRole = async (u, next, message) => {
    if (!window.confirm(message)) return
    setBusyId(u._id)
    setActionError('')
    setNotice('')
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

  const toggleAdmin = (u) =>
    u.role === 'admin'
      ? changeRole(u, 'user', `Hạ ${u.name} xuống người dùng thường? Họ sẽ mất quyền vào khu vực quản trị ngay lập tức.`)
      : changeRole(u, 'admin', `Cấp quyền admin cho ${u.name}? Người này sẽ quản lý được phim, rạp, đơn đặt vé và người dùng.`)

  const revoke = (u) =>
    changeRole(u, 'user', `Gỡ quyền quản lý của ${u.name}? Họ sẽ mất quyền vào khu vực quản trị ngay lập tức.`)

  const openModal = (next) => {
    setNotice('')
    setActionError('')
    setModal(next)
  }

  const saved = (message) => {
    setModal(null)
    setNotice(message)
    setReload((r) => r + 1)
  }

  const actions = (u) => (
    <UserActions u={u} me={me} busy={busyId === u._id} onToggleAdmin={toggleAdmin} onRevoke={revoke} onOpen={openModal} />
  )

  const count = (v) => (data ? ` (${data.counts[v].toLocaleString('vi-VN')})` : '')

  return (
    <div>
      <PageHeader
        title="Người dùng"
        action={
          <button onClick={() => openModal({ kind: 'create' })} disabled={cinemas.length === 0} className={primaryBtn} title={cinemas.length === 0 ? 'Cần có rạp trước' : ''}>
            + Tạo tài khoản quản lý rạp
          </button>
        }
      />

      <div className="mb-4 space-y-3">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tìm theo tên, email, số điện thoại, tên đăng nhập"
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
      {notice && <p role="status" className="mb-4 break-words rounded bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
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
                          <BranchLine u={u} />
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
                        <td className="px-4 py-3 text-right">{actions(u)}</td>
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
                    <BranchLine u={u} />
                    <p className="mt-1 break-all text-sm text-gray-600">{u.email}</p>
                    <p className="text-sm text-gray-500">{u.phone ?? '—'}</p>
                    <div className="mt-2 flex items-end justify-between gap-2 text-sm">
                      <span className="text-gray-500">{u.paidBookings} đơn</span>
                      <span className="font-bold">{formatPrice(u.totalSpent)}</span>
                    </div>
                    <div className="mt-3 flex min-h-10 items-center justify-end border-t pt-3">
                      {actions(u)}
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

      {modal?.kind === 'create' && <CreateManagerForm cinemas={cinemas} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.kind === 'assign' && <AssignCinemaForm account={modal.account} cinemas={cinemas} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.kind === 'password' && <ResetPasswordForm account={modal.account} onClose={() => setModal(null)} onSaved={saved} />}
    </div>
  )
}

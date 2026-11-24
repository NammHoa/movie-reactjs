import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { errorMessage } from '../../lib/errors'
import { formatDateTime, formatPrice } from '../../lib/movie'
import CouponForm from './CouponForm'
import { ErrorText, PageHeader, inputCls, primaryBtn } from './ui'

const LIMIT = 15

const STATUS = {
  running: { label: 'Đang chạy', cls: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Chưa bắt đầu', cls: 'bg-blue-100 text-blue-700' },
  expired: { label: 'Hết hạn', cls: 'bg-gray-200 text-gray-600' },
  exhausted: { label: 'Hết lượt', cls: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Đã tắt', cls: 'bg-gray-200 text-gray-600' },
}

const discountText = (c) =>
  c.type === 'percent'
    ? `Giảm ${c.value}%${c.maxDiscount ? ` (tối đa ${formatPrice(c.maxDiscount)})` : ''}`
    : `Giảm ${formatPrice(c.value)}`

const periodText = (c) => {
  if (!c.startsAt && !c.expiresAt) return 'Không giới hạn thời gian'
  if (c.startsAt && c.expiresAt) return `${formatDateTime(c.startsAt)} → ${formatDateTime(c.expiresAt)}`
  return c.startsAt ? `Từ ${formatDateTime(c.startsAt)}` : `Đến ${formatDateTime(c.expiresAt)}`
}

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.inactive
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

function Actions({ c, busy, onEdit, onToggle, onRemove }) {
  const btn = 'h-10 whitespace-nowrap rounded border px-3 text-sm font-semibold disabled:opacity-50'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => onEdit(c)} className={`${btn} border-gray-300 text-gray-700 hover:bg-gray-100`}>Sửa</button>
      <button onClick={() => onToggle(c)} disabled={busy} className={`${btn} border-gray-300 text-gray-700 hover:bg-gray-100`}>
        {c.active ? 'Tắt' : 'Bật'}
      </button>
      {c.usedCount === 0 && (
        <button onClick={() => onRemove(c)} disabled={busy} className={`${btn} border-red-300 text-red-600 hover:bg-red-50`}>Xóa</button>
      )}
    </div>
  )
}

export default function Coupons() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState(undefined) // undefined: đóng, null: thêm mới, object: sửa
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

  const key = `${q}|${page}|${reload}`
  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/coupons', { params: { q: q || undefined, page, limit: LIMIT } })
      .then(({ data }) => !cancelled && setDone({ key, data, error: '' }))
      .catch((err) => !cancelled && setDone((d) => ({ ...d, key, error: errorMessage(err, 'Không thể tải danh sách mã giảm giá') })))
    return () => {
      cancelled = true
    }
  }, [key, q, page])

  const { data, error } = done
  const loading = done.key !== key
  const items = data?.items ?? []
  const refresh = () => setReload((r) => r + 1)

  const toggle = async (c) => {
    setBusyId(c._id)
    setActionError('')
    try {
      await api.put(`/admin/coupons/${c._id}`, { active: !c.active })
    } catch (err) {
      setActionError(errorMessage(err, 'Không thể đổi trạng thái mã'))
    } finally {
      setBusyId(null)
      refresh()
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Xóa mã ${c.code}? Thao tác này không thể hoàn tác.`)) return
    setBusyId(c._id)
    setActionError('')
    try {
      await api.delete(`/admin/coupons/${c._id}`)
    } catch (err) {
      setActionError(errorMessage(err, 'Không thể xóa mã'))
    } finally {
      setBusyId(null)
      refresh()
    }
  }

  return (
    <div>
      <PageHeader
        title="Mã giảm giá"
        action={
          <button onClick={() => setEditing(null)} className={primaryBtn}>
            + Thêm mã
          </button>
        }
      />

      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Tìm theo mã"
        aria-label="Tìm mã giảm giá"
        maxLength={20}
        className={`${inputCls} mb-4 h-11`}
      />

      <ErrorText message={error || actionError} />
      {!data && !error && <p className="text-gray-500">Đang tải...</p>}

      {data && (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {items.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
              {q ? 'Không có mã nào khớp.' : 'Chưa có mã giảm giá nào. Bấm "Thêm mã" để tạo.'}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm xl:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Mã</th>
                      <th className="px-4 py-3">Ưu đãi</th>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3 text-right">Đã dùng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((c) => (
                      <tr key={c._id}>
                        <td className="px-4 py-3 font-mono font-bold tracking-wider">{c.code}</td>
                        <td className="px-4 py-3">
                          <p>{discountText(c)}</p>
                          {c.minOrder > 0 && <p className="text-xs text-gray-500">Đơn từ {formatPrice(c.minOrder)}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{periodText(c)}</td>
                        <td className="px-4 py-3 text-right">{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ''}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3"><div className="flex justify-end"><Actions c={c} busy={busyId === c._id} onEdit={setEditing} onToggle={toggle} onRemove={remove} /></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
                {items.map((c) => (
                  <li key={c._id} className="min-w-0 rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-all font-mono text-lg font-bold tracking-wider">{c.code}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 font-semibold">{discountText(c)}</p>
                    {c.minOrder > 0 && <p className="text-sm text-gray-500">Đơn từ {formatPrice(c.minOrder)}</p>}
                    <p className="mt-1 text-sm text-gray-500">{periodText(c)}</p>
                    <p className="mt-1 text-sm text-gray-500">Đã dùng {c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ' (không giới hạn)'}</p>
                    <div className="mt-3 border-t pt-3">
                      <Actions c={c} busy={busyId === c._id} onEdit={setEditing} onToggle={toggle} onRemove={remove} />
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
              <span className="text-center text-gray-500">Trang {data.page} / {data.pages} · {data.total} mã</span>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="h-10 rounded border border-gray-300 bg-white px-4 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                Sau →
              </button>
            </div>
          )}
          {data.pages <= 1 && items.length > 0 && <p className="mt-4 text-center text-sm text-gray-400">{data.total} mã</p>}
        </div>
      )}

      {editing !== undefined && (
        <CouponForm
          coupon={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            refresh()
          }}
        />
      )}
    </div>
  )
}

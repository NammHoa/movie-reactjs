import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { errorMessage } from '../../lib/errors'
import { formatDateTime, formatPrice } from '../../lib/movie'
import RefundPanel from './RefundPanel'
import { ErrorText, PageHeader, inputCls } from './ui'

const LIMIT = 15

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'refunding', label: 'Đang hoàn tiền' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

const STATUS = {
  paid: { label: 'Đã thanh toán', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Chờ thanh toán', cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Đã hủy', cls: 'bg-gray-200 text-gray-600' },
  expired: { label: 'Hết hạn', cls: 'bg-gray-200 text-gray-500' },
  refunding: { label: 'Đang hoàn tiền', cls: 'bg-amber-100 text-amber-700' },
  refunded: { label: 'Đã hoàn tiền', cls: 'bg-gray-200 text-gray-600' },
}

const PAYMENT_STATUS = { pending: 'Chờ', processing: 'Đang xử lý', success: 'Thành công', failed: 'Thất bại' }

function Badge({ status }) {
  const s = STATUS[status] ?? { label: status, cls: 'bg-gray-200 text-gray-600' }
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

const movieOf = (b) => b.showtime?.movie?.title ?? 'Phim đã bị xóa'
const placeOf = (b) => (b.showtime?.room ? `${b.showtime.room.cinema?.name ?? ''} — ${b.showtime.room.name}` : '—')

function Info({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

function DetailModal({ item, onClose, onChanged }) {
  const [detail, setDetail] = useState({ id: null, data: null })
  const [tick, setTick] = useState(0)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get(`/admin/bookings/${item._id}`)
      .then(({ data }) => !cancelled && setDetail({ id: item._id, data }))
      .catch((err) => !cancelled && setDetail({ id: item._id, data: null, error: errorMessage(err, 'Không thể tải lịch sử thanh toán') }))
    return () => {
      cancelled = true
    }
  }, [item._id, tick])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const loaded = detail.id === item._id
  const b = loaded && detail.data ? detail.data : item
  const payments = loaded ? detail.data?.payments : null

  const refund = async () => {
    const msg = `Hủy vé ${b.code} và hoàn ${formatPrice(b.totalPrice)} cho khách?\n\nGhế được nhả, vé không dùng được nữa, khách nhận email xác nhận. Admin hủy được cả khi sát giờ chiếu. Thao tác này không thể hoàn tác.`
    if (!window.confirm(msg)) return
    setCancelling(true)
    setError('')
    try {
      const { data } = await api.post(`/admin/bookings/${b._id}/refund`)
      setNotice(data.message)
    } catch (err) {
      setError(errorMessage(err, 'Không thể hủy và hoàn tiền'))
    } finally {
      setCancelling(false)
      setTick((t) => t + 1)
      onChanged()
    }
  }

  const cancel = async () => {
    if (!window.confirm(`Hủy đơn ${b.code}? Ghế sẽ được nhả cho người khác.`)) return
    setCancelling(true)
    setError('')
    try {
      await api.post(`/admin/bookings/${b._id}/cancel`)
      setTick((t) => t + 1)
      onChanged()
    } catch (err) {
      setError(errorMessage(err, 'Không thể hủy đơn'))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`Đơn ${b.code}`} className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xl font-extrabold tracking-widest text-brand">{b.code}</p>
            <p className="mt-1 text-xs text-gray-500">Tạo lúc {formatDateTime(b.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={b.paymentStatus} />
            <button onClick={onClose} aria-label="Đóng" className="-m-2 p-2 text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4">
          <div className="col-span-2"><Info label="Khách hàng">{b.user?.name ?? 'Tài khoản đã bị xóa'}</Info></div>
          <div className="min-w-0"><Info label="Email"><span className="break-all">{b.user?.email ?? '—'}</span></Info></div>
          <Info label="Số điện thoại">{b.user?.phone ?? '—'}</Info>
          <div className="col-span-2"><Info label="Phim">{movieOf(b)}</Info></div>
          <div className="col-span-2"><Info label="Rạp — Phòng">{placeOf(b)}</Info></div>
          <div className="col-span-2"><Info label="Suất chiếu">{b.showtime ? formatDateTime(b.showtime.startTime) : '—'}</Info></div>
          <Info label="Ghế">{b.seats.join(', ')}</Info>
          <Info label="Giá mỗi ghế">{formatPrice(b.pricePerSeat)}</Info>
          <Info label="Tổng tiền"><span className="text-base font-bold text-brand">{formatPrice(b.totalPrice)}</span></Info>
          {b.paidAt && <Info label="Thanh toán lúc">{formatDateTime(b.paidAt)}</Info>}
        </dl>

        <div className="mt-5 border-t pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Lịch sử thanh toán</p>
          {!loaded && <p className="text-sm text-gray-500">Đang tải...</p>}
          {loaded && detail.error && <p className="text-sm text-red-600">{detail.error}</p>}
          {payments?.length === 0 && <p className="text-sm text-gray-500">Chưa có lần thanh toán nào.</p>}
          <ul className="space-y-2">
            {payments?.map((p) => (
              <li key={p._id} className="rounded bg-gray-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{PAYMENT_STATUS[p.status] ?? p.status}</span>
                  <span>{formatPrice(p.amount)}</span>
                </div>
                <p className="mt-0.5 break-all font-mono text-xs text-gray-500">{p.txnRef}</p>
                <p className="text-xs text-gray-400">{formatDateTime(p.createdAt)}{p.failReason ? ` · ${p.failReason}` : ''}</p>
              </li>
            ))}
          </ul>
        </div>

        {loaded && detail.data?.refund && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Hoàn tiền</p>
            <RefundPanel refund={detail.data.refund} onChanged={() => { setTick((t) => t + 1); onChanged() }} />
          </div>
        )}

        {notice && <p role="status" className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
        <ErrorText message={error} />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="h-10 rounded border border-gray-300 px-4 text-sm hover:bg-gray-100">Đóng</button>
          {b.canCancel && (
            <button onClick={cancel} disabled={cancelling} className="h-10 rounded bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
              {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          )}
          {b.paymentStatus === 'paid' && !b.checkedInAt && (
            <button onClick={refund} disabled={cancelling} className="h-10 rounded bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
              {cancelling ? 'Đang hủy...' : 'Hủy vé & hoàn tiền'}
            </button>
          )}
        </div>
        {b.paymentStatus === 'paid' && b.checkedInAt && <p className="mt-3 text-xs text-gray-400">Vé đã được sử dụng nên không hoàn tiền được.</p>}
      </div>
    </div>
  )
}

export default function Bookings() {
  const [status, setStatus] = useState('all')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [open, setOpen] = useState(null)
  // Kết quả của lần tải gần nhất: giữ dữ liệu cũ (mờ đi) khi đổi bộ lọc để bảng không nhấp nháy
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
      .get('/admin/bookings', { params: { status, q: q || undefined, page, limit: LIMIT } })
      .then(({ data }) => !cancelled && setDone({ key, data, error: '' }))
      .catch((err) => !cancelled && setDone((d) => ({ ...d, key, error: errorMessage(err, 'Không thể tải danh sách đơn') })))
    return () => {
      cancelled = true
    }
  }, [key, status, q, page])

  const { data, error } = done
  const loading = done.key !== key
  const items = data?.items ?? []

  return (
    <div>
      <PageHeader title="Đơn đặt vé" />

      <div className="mb-4 space-y-3">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tìm theo mã đơn, tên, email, số điện thoại"
          aria-label="Tìm đơn"
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
              {q || status !== 'all' ? 'Không có đơn nào khớp bộ lọc.' : 'Chưa có đơn đặt vé nào.'}
            </div>
          ) : (
            <>
              {/* Màn hình rất rộng: bảng; nhỏ hơn: thẻ (menu bên làm vùng nội dung hẹp đi nhiều) */}
              <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm xl:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Mã đơn</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Phim / Suất chiếu</th>
                      <th className="px-4 py-3">Ghế</th>
                      <th className="px-4 py-3 text-right">Tổng tiền</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((b) => (
                      <tr key={b._id} onClick={() => setOpen(b)} className="cursor-pointer hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button className="font-mono font-bold tracking-wider text-brand hover:underline">{b.code}</button>
                          <p className="text-xs text-gray-400">{formatDateTime(b.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{b.user?.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{b.user?.phone || b.user?.email}</p>
                        </td>
                        <td className="max-w-[260px] px-4 py-3">
                          <p className="truncate font-medium">{movieOf(b)}</p>
                          <p className="truncate text-xs text-gray-500">{b.showtime ? formatDateTime(b.showtime.startTime) : '—'} · {placeOf(b)}</p>
                        </td>
                        <td className="px-4 py-3">{b.seats.join(', ')}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatPrice(b.totalPrice)}</td>
                        <td className="px-4 py-3"><Badge status={b.paymentStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Điện thoại: thẻ */}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
                {items.map((b) => (
                  <li key={b._id}>
                    <button onClick={() => setOpen(b)} className="w-full rounded-lg bg-white p-4 text-left shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-bold tracking-wider text-brand">{b.code}</span>
                        <Badge status={b.paymentStatus} />
                      </div>
                      <p className="mt-2 truncate font-semibold">{movieOf(b)}</p>
                      <p className="truncate text-sm text-gray-500">{b.showtime ? formatDateTime(b.showtime.startTime) : '—'}</p>
                      <div className="mt-2 flex items-end justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-gray-600">{b.user?.name ?? '—'} · {b.seats.join(', ')}</span>
                        <span className="shrink-0 font-bold">{formatPrice(b.totalPrice)}</span>
                      </div>
                    </button>
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
              <span className="text-center text-gray-500">Trang {data.page} / {data.pages} · {data.total.toLocaleString('vi-VN')} đơn</span>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="h-10 rounded border border-gray-300 bg-white px-4 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                Sau →
              </button>
            </div>
          )}
          {data.pages <= 1 && items.length > 0 && <p className="mt-4 text-center text-sm text-gray-400">{data.total.toLocaleString('vi-VN')} đơn</p>}
        </div>
      )}

      {open && <DetailModal item={open} onClose={() => setOpen(null)} onChanged={() => setReload((r) => r + 1)} />}
    </div>
  )
}

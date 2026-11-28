import { useEffect, useRef, useState } from 'react'
import api from '../../api/axios'
import { errorMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/movie'
import { hasCamera, scanImageFile, startCameraScan } from '../../lib/qrScan'
import { PageHeader, inputCls } from './ui'

// Màu và tiêu đề lớn cho từng kết luận, để nhân viên nhìn một cái là biết
const BANNERS = {
  valid: { cls: 'bg-green-600', icon: '✓', title: 'VÉ HỢP LỆ' },
  checked_in: { cls: 'bg-green-600', icon: '✓', title: 'ĐÃ XÁC NHẬN VÀO RẠP' },
  used: { cls: 'bg-red-600', icon: '✕', title: 'VÉ ĐÃ DÙNG' },
  unpaid: { cls: 'bg-red-600', icon: '✕', title: 'CHƯA THANH TOÁN' },
  cancelled: { cls: 'bg-red-600', icon: '✕', title: 'VÉ ĐÃ HỦY' },
  ended: { cls: 'bg-red-600', icon: '✕', title: 'SUẤT CHIẾU ĐÃ KẾT THÚC' },
  too_early: { cls: 'bg-amber-500', icon: '!', title: 'CHƯA ĐẾN GIỜ VÀO RẠP' },
  notfound: { cls: 'bg-red-600', icon: '?', title: 'KHÔNG TÌM THẤY VÉ' },
  other_cinema: { cls: 'bg-red-600', icon: '✕', title: 'VÉ CỦA RẠP KHÁC' },
}

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function ResultCard({ ticket, onCheckIn, onNext, busy, error }) {
  const { result, booking, code } = ticket
  const banner = BANNERS[result.status] ?? BANNERS.notfound
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className={`${banner.cls} px-5 py-6 text-center text-white`}>
        <p className="text-4xl font-bold">{banner.icon}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-wide">{banner.title}</h2>
        <p className="mt-1 text-sm opacity-90">{result.message}</p>
      </div>

      <div className="space-y-4 p-5">
        {booking ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="col-span-2">
              <Detail label="Mã vé"><span className="font-mono text-lg font-extrabold tracking-widest text-brand">{booking.code}</span></Detail>
            </div>
            <div className="col-span-2"><Detail label="Phim">{booking.showtime?.movie?.title ?? '—'}</Detail></div>
            <div className="col-span-2">
              <Detail label="Rạp — Phòng">{booking.showtime?.room ? `${booking.showtime.room.cinema?.name ?? ''} — ${booking.showtime.room.name}` : '—'}</Detail>
            </div>
            <div className="col-span-2"><Detail label="Suất chiếu">{booking.showtime ? formatDateTime(booking.showtime.startTime) : '—'}</Detail></div>
            <Detail label="Ghế"><span className="text-lg font-bold">{booking.seats.join(', ')}</span></Detail>
            <Detail label="Khách hàng">{booking.user?.name ?? '—'}</Detail>
            {booking.checkedInAt && (
              <div className="col-span-2 rounded bg-red-50 px-3 py-2 text-red-700">
                Đã vào rạp lúc <b>{formatDateTime(booking.checkedInAt)}</b>
                {booking.checkedInBy?.name ? <> bởi <b>{booking.checkedInBy.name}</b></> : null}
              </div>
            )}
          </dl>
        ) : (
          <p className="text-center text-sm text-gray-600">
            Mã đã nhập: <span className="font-mono font-bold">{code}</span>
          </p>
        )}

        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {result.status === 'valid' && (
          <button onClick={onCheckIn} disabled={busy} className="h-14 w-full rounded-lg bg-green-600 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-60">
            {busy ? 'Đang xác nhận...' : 'Xác nhận vào rạp'}
          </button>
        )}
        <button onClick={onNext} className={`h-12 w-full rounded-lg font-bold ${result.status === 'valid' ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-[#231f20] text-[#e3d9a5] hover:bg-black'}`}>
          Kiểm tra vé khác
        </button>
      </div>
    </div>
  )
}

export default function Checkin() {
  const videoRef = useRef(null)
  const handled = useRef(false)
  const fileRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [cameraOk, setCameraOk] = useState(true)
  const [scanError, setScanError] = useState('')
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState(null) // { code, result, booking }
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    hasCamera().then((ok) => !cancelled && setCameraOk(ok))
    return () => {
      cancelled = true
    }
  }, [])

  const lookup = async (raw) => {
    const code = String(raw ?? '').trim().toUpperCase()
    if (!code) return
    setBusy(true)
    setError('')
    setScanError('')
    try {
      const { data } = await api.get(`/admin/tickets/${encodeURIComponent(code)}`)
      setTicket({ code, ...data })
    } catch (err) {
      const status = err.response?.status
      if (status === 404 || status === 400) {
        const message = status === 404 ? 'Không có vé nào với mã này' : 'Mã không đúng định dạng của vé'
        setTicket({ code, result: { status: 'notfound', message }, booking: null })
      } else {
        setError(errorMessage(err, 'Không thể kiểm tra vé'))
      }
    } finally {
      setBusy(false)
    }
  }

  // Bật camera khi scanning = true; tắt hẳn khi hết quét hoặc rời trang
  useEffect(() => {
    if (!scanning) return
    handled.current = false
    let scanner = null
    let stopped = false
    startCameraScan(videoRef.current, (text) => {
      if (handled.current) return // camera có thể đọc cùng một mã nhiều lần trước khi kịp tắt
      handled.current = true
      setScanning(false)
      lookup(text)
    })
      .then((s) => {
        scanner = s
        if (stopped) s.destroy()
      })
      .catch(() => {
        setScanning(false)
        setScanError('Không mở được camera (cần cho phép dùng camera, và trang phải chạy bằng HTTPS). Bạn có thể nhập mã hoặc chụp ảnh mã QR.')
      })
    return () => {
      stopped = true
      scanner?.destroy()
    }
  }, [scanning])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    const text = await scanImageFile(file)
    setBusy(false)
    if (text) lookup(text)
    else setScanError('Không đọc được mã QR trong ảnh này. Hãy chụp lại gần và rõ hơn, hoặc nhập mã.')
  }

  const checkIn = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/admin/tickets/${encodeURIComponent(ticket.code)}/check-in`)
      setTicket({ code: ticket.code, ...data })
    } catch (err) {
      // 409: vé vừa bị người khác quét hoặc không còn hợp lệ, server trả luôn thông tin mới nhất
      if (err.response?.status === 409 && err.response.data?.result) setTicket({ code: ticket.code, ...err.response.data })
      else setError(errorMessage(err, 'Không thể xác nhận vé'))
    } finally {
      setBusy(false)
    }
  }

  const next = () => {
    setTicket(null)
    setError('')
    setManual('')
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Kiểm tra vé" />

      {ticket ? (
        <ResultCard ticket={ticket} onCheckIn={checkIn} onNext={next} busy={busy} error={error} />
      ) : (
        <div className="space-y-5">
          <section className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
            {scanning ? (
              <div>
                <video ref={videoRef} playsInline muted className="mx-auto aspect-square w-full max-w-sm rounded-lg bg-black object-cover" />
                <p className="mt-3 text-center text-sm text-gray-500">Đưa mã QR của khách vào khung hình</p>
                <button onClick={() => setScanning(false)} className="mt-3 h-12 w-full rounded-lg border border-gray-300 font-semibold hover:bg-gray-50">Tắt camera</button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setScanError('')
                    setScanning(true)
                  }}
                  disabled={!cameraOk || busy}
                  className="h-14 w-full rounded-lg bg-brand text-lg font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quét mã QR bằng camera
                </button>
                {!cameraOk && <p className="text-center text-sm text-amber-700">Thiết bị này không có camera, hãy nhập mã hoặc chọn ảnh.</p>}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" tabIndex={-1} aria-label="Chụp hoặc chọn ảnh mã QR" />
                <button onClick={() => fileRef.current?.click()} disabled={busy} className="h-12 w-full rounded-lg border border-gray-300 font-semibold hover:bg-gray-50 disabled:opacity-50">
                  Chụp hoặc chọn ảnh mã QR
                </button>
              </div>
            )}
            {scanError && <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">{scanError}</p>}
          </section>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              lookup(manual)
            }}
            className="rounded-lg bg-white p-4 shadow-sm sm:p-5"
          >
            <label htmlFor="ticket-code" className="mb-2 block text-sm font-semibold text-gray-700">Hoặc nhập mã vé</label>
            <div className="flex gap-2">
              <input
                id="ticket-code"
                value={manual}
                onChange={(e) => setManual(e.target.value.toUpperCase())}
                placeholder="Ví dụ: D9LSRSVM"
                maxLength={16}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className={`${inputCls} h-12 font-mono text-base tracking-widest`}
              />
              <button disabled={!manual.trim() || busy} className="h-12 shrink-0 rounded-lg bg-[#231f20] px-5 font-bold text-[#e3d9a5] hover:bg-black disabled:opacity-50">
                {busy ? '...' : 'Kiểm tra'}
              </button>
            </div>
            {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          </form>
        </div>
      )}
    </div>
  )
}

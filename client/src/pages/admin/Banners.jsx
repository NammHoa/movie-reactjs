import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Poster } from '../../components/MovieCard'
import { errorMessage } from '../../lib/errors'
import { ErrorText, PageHeader, inputCls, primaryBtn } from './ui'

const HIDDEN_LABELS = {
  not_showing: 'Đang ẩn: phim không còn đang chiếu',
  no_backdrop: 'Đang ẩn: chưa có ảnh ngang',
}

const btn = 'h-10 min-w-10 rounded border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40'
const moveBtn = `${btn} border-gray-300 text-gray-700 hover:bg-gray-100`

export default function Banners() {
  const [data, setData] = useState(null)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/banners')
      .then(({ data }) => {
        if (cancelled) return
        setData(data)
        setError('')
      })
      .catch((err) => !cancelled && setError(errorMessage(err, 'Không thể tải banner')))
    return () => {
      cancelled = true
    }
  }, [reload])

  const items = data?.items ?? []
  const candidates = data?.candidates ?? []
  const full = !!data && items.length >= data.max
  // Bỏ lựa chọn cũ nếu phim đó không còn thêm được sau khi danh sách đổi
  const choice = candidates.some((c) => c._id === selected && c.eligible) ? selected : ''

  // Các lệnh thêm, gỡ, đổi thứ tự đều trả về danh sách mới
  const run = async (request, fallback) => {
    setBusy(true)
    setActionError('')
    try {
      const res = await request()
      setData(res.data)
    } catch (err) {
      setActionError(errorMessage(err, fallback))
      setReload((r) => r + 1) // có thể danh sách đã bị đổi ở nơi khác
    } finally {
      setBusy(false)
    }
  }

  const add = (e) => {
    e.preventDefault()
    run(() => api.post('/admin/banners', { movieId: choice }), 'Không thể thêm phim vào banner')
  }

  const move = (index, step) => {
    const ids = items.map((m) => m._id)
    ;[ids[index], ids[index + step]] = [ids[index + step], ids[index]]
    run(() => api.put('/admin/banners/order', { ids }), 'Không thể đổi thứ tự')
  }

  const remove = (m) => {
    if (!window.confirm(`Gỡ "${m.title}" khỏi banner? Phim không bị xóa.`)) return
    run(() => api.delete(`/admin/banners/${m._id}`), 'Không thể gỡ phim khỏi banner')
  }

  return (
    <div>
      <PageHeader title="Banner trang chủ" action={data && <span className="text-sm text-gray-500">{items.length}/{data.max} phim</span>} />

      <p className="mb-4 text-sm text-gray-500">
        Chọn phim đang chiếu có ảnh ngang. Thêm hoặc đổi ảnh ngang ở mục{' '}
        <Link to="/admin/movies" className="font-semibold text-brand hover:underline">Quản lý phim</Link>.
      </p>

      <ErrorText message={error || actionError} />
      {!data && !error && <p className="text-gray-500">Đang tải...</p>}

      {data && (
        <>
          <form onSubmit={add} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <select
              value={choice}
              onChange={(e) => setSelected(e.target.value)}
              disabled={full}
              aria-label="Chọn phim thêm vào banner"
              className={`${inputCls} h-11 min-w-0 bg-white sm:flex-1`}
            >
              <option value="">{candidates.length ? 'Chọn phim đang chiếu' : 'Không còn phim đang chiếu nào để thêm'}</option>
              {candidates.map((c) => (
                <option key={c._id} value={c._id} disabled={!c.eligible}>
                  {c.title}{c.eligible ? '' : ' (chưa có ảnh ngang)'}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy || full || !choice} className={`${primaryBtn} h-11 whitespace-nowrap`}>
              + Thêm vào banner
            </button>
          </form>
          {full && <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">Banner đã đủ {data.max} phim</p>}

          {items.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
              Chưa có phim nào trên banner. Trang chủ đang ẩn banner.
            </div>
          ) : (
            <ol className="space-y-3">
              {items.map((m, i) => (
                <li key={m._id} className="flex flex-col gap-3 rounded-lg bg-white p-3 shadow-sm sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="w-5 shrink-0 text-center font-bold text-gray-400">{i + 1}</span>
                    <Poster src={m.backdrop} alt="" className="aspect-video w-28 shrink-0 rounded" />
                    <div className="min-w-0">
                      <p className="break-words font-semibold leading-tight">{m.title}</p>
                      {m.hiddenReason && (
                        <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {HIDDEN_LABELS[m.hiddenReason]}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Đưa lên" className={moveBtn}>↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={busy || i === items.length - 1} aria-label="Đưa xuống" className={moveBtn}>↓</button>
                    <button type="button" onClick={() => remove(m)} disabled={busy} className={`${btn} border-red-300 text-red-600 hover:bg-red-50`}>Xóa</button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import { ErrorText, FormModal, PageHeader, Row, inputCls, primaryBtn } from './ui'

const errMsg = (err) => err.response?.data?.message || 'Không thể lưu, vui lòng thử lại'

function CinemaForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ name: item?.name ?? '', city: item?.city ?? '', address: item?.address ?? '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (item) await api.put(`/cinemas/${item._id}`, form)
      else await api.post('/cinemas', form)
      onSaved()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal title={item ? 'Sửa rạp' : 'Thêm rạp mới'} onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <Row label="Tên rạp *">
        <input className={inputCls} value={form.name} onChange={set('name')} required autoFocus />
      </Row>
      <Row label="Thành phố">
        <input className={inputCls} value={form.city} onChange={set('city')} placeholder="Hồ Chí Minh" />
      </Row>
      <Row label="Địa chỉ">
        <input className={inputCls} value={form.address} onChange={set('address')} />
      </Row>
    </FormModal>
  )
}

function RoomForm({ item, cinemaId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    rows: item?.rows ?? 8,
    seatsPerRow: item?.seatsPerRow ?? 10,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const total = (Number(form.rows) || 0) * (Number(form.seatsPerRow) || 0)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { name: form.name, rows: Number(form.rows), seatsPerRow: Number(form.seatsPerRow) }
    try {
      if (item) await api.put(`/rooms/${item._id}`, payload)
      else await api.post('/rooms', { ...payload, cinema: cinemaId })
      onSaved()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal title={item ? 'Sửa phòng chiếu' : 'Thêm phòng chiếu'} onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <Row label="Tên phòng *">
        <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Phòng 1" required autoFocus />
      </Row>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Số hàng ghế (1–26)">
          <input className={inputCls} type="number" min="1" max="26" value={form.rows} onChange={set('rows')} required />
        </Row>
        <Row label="Số ghế mỗi hàng (1–30)">
          <input className={inputCls} type="number" min="1" max="30" value={form.seatsPerRow} onChange={set('seatsPerRow')} required />
        </Row>
      </div>
      <p className="text-sm text-gray-500">Tổng số ghế: <b>{total}</b> (hàng A, B, C... mỗi hàng đánh số từ 1)</p>
    </FormModal>
  )
}

export default function Cinemas() {
  const [cinemas, setCinemas] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // { kind: 'cinema' | 'room', item, cinemaId }

  const load = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([api.get('/cinemas'), api.get('/rooms')])
      setCinemas(c.data)
      setRooms(r.data)
      setError('')
    } catch {
      setError('Không thể tải dữ liệu rạp')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const remove = async (kind, item) => {
    const label = kind === 'cinemas' ? 'rạp' : 'phòng'
    if (!window.confirm(`Xóa ${label} "${item.name}"? Thao tác này không thể hoàn tác.`)) return
    try {
      await api.delete(`/${kind}/${item._id}`)
      setError('')
      load()
    } catch (err) {
      setError(errMsg(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Rạp & phòng chiếu"
        action={
          <button onClick={() => setModal({ kind: 'cinema', item: null })} className={primaryBtn}>
            + Thêm rạp
          </button>
        }
      />
      <ErrorText message={error} />

      {loading && <p className="text-gray-500">Đang tải...</p>}
      {!loading && cinemas.length === 0 && (
        <p className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-sm">Chưa có rạp nào. Bấm "Thêm rạp" để bắt đầu.</p>
      )}

      <div className="space-y-4">
        {cinemas.map((c) => {
          const list = rooms.filter((r) => r.cinema?._id === c._id)
          return (
            <section key={c._id} className="rounded-lg bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="text-lg font-bold">{c.name}</h2>
                  <p className="text-sm text-gray-500">{[c.address, c.city].filter(Boolean).join(', ') || 'Chưa có địa chỉ'}</p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setModal({ kind: 'room', item: null, cinemaId: c._id })} className="font-semibold text-brand hover:underline">
                    + Thêm phòng
                  </button>
                  <button onClick={() => setModal({ kind: 'cinema', item: c })} className="text-blue-600 hover:underline">Sửa</button>
                  <button onClick={() => remove('cinemas', c)} className="text-red-600 hover:underline">Xóa</button>
                </div>
              </div>
              {list.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">Chưa có phòng chiếu.</p>
              ) : (
                <ul className="divide-y">
                  {list.map((r) => (
                    <li key={r._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        <b>{r.name}</b>
                        <span className="ml-3 text-gray-500">
                          {r.rows} hàng × {r.seatsPerRow} ghế = {r.rows * r.seatsPerRow} ghế
                        </span>
                      </span>
                      <span className="flex gap-3">
                        <button onClick={() => setModal({ kind: 'room', item: r, cinemaId: c._id })} className="text-blue-600 hover:underline">Sửa</button>
                        <button onClick={() => remove('rooms', r)} className="text-red-600 hover:underline">Xóa</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {modal?.kind === 'cinema' && (
        <CinemaForm
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
          }}
        />
      )}
      {modal?.kind === 'room' && (
        <RoomForm
          item={modal.item}
          cinemaId={modal.cinemaId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}

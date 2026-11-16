import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import { Poster } from '../../components/MovieCard'
import { STATUS_LABELS, STATUS_STYLES, formatDate } from '../../lib/movie'
import MovieForm from './MovieForm'

export default function Movies() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined: đóng, null: thêm mới, object: sửa

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/movies')
      setMovies(data)
      setError('')
    } catch {
      setError('Không thể tải danh sách phim')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const remove = async (m) => {
    if (!window.confirm(`Xóa phim "${m.title}"? Thao tác này không thể hoàn tác.`)) return
    try {
      await api.delete(`/movies/${m._id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa phim')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="border-l-4 border-brand pl-3 text-2xl font-bold">Quản lý phim</h1>
        <button
          onClick={() => setEditing(null)}
          className="rounded bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
        >
          + Thêm phim
        </button>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Phim</th>
              <th className="px-4 py-3">Thời lượng</th>
              <th className="px-4 py-3">Khởi chiếu</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Đang tải...</td></tr>
            )}
            {!loading && movies.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Chưa có phim nào. Bấm "Thêm phim" để bắt đầu.</td></tr>
            )}
            {movies.map((m) => (
              <tr key={m._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Poster src={m.poster} alt="" className="h-16 w-11 shrink-0 rounded" />
                    <div>
                      <p className="font-semibold">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.genres?.join(', ')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{m.duration} phút</td>
                <td className="px-4 py-3">{formatDate(m.releaseDate)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[m.status]}`}>
                    {STATUS_LABELS[m.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(m)} className="mr-3 text-blue-600 hover:underline">Sửa</button>
                  <button onClick={() => remove(m)} className="text-red-600 hover:underline">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <MovieForm
          movie={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            load()
          }}
        />
      )}
    </div>
  )
}

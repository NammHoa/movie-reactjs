import { useEffect, useState } from 'react'
import api from '../../api/axios'
import MovieCard from '../../components/MovieCard'

const TABS = [
  { value: 'now_showing', label: 'Đang chiếu' },
  { value: 'coming_soon', label: 'Sắp chiếu' },
]

export default function Home() {
  const [tab, setTab] = useState('now_showing')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/movies', { params: { status: tab } })
      .then(({ data }) => {
        if (cancelled) return
        setMovies(data)
        setError('')
      })
      .catch(() => !cancelled && setError('Không thể tải danh sách phim'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [tab])

  const changeTab = (value) => {
    if (value === tab) return
    setLoading(true)
    setTab(value)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => changeTab(t.value)}
            className={`-mb-px border-b-2 px-1 pb-3 text-lg font-bold transition ${
              tab === t.value ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Đang tải...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && movies.length === 0 && (
        <p className="text-gray-500">Chưa có phim nào trong mục này.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((m) => (
          <MovieCard key={m._id} movie={m} />
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import BannerSlider from '../../components/BannerSlider'
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
  const [banners, setBanners] = useState([])

  useEffect(() => {
    let cancelled = false
    api
      .get('/banners')
      .then(({ data }) => !cancelled && setBanners(data))
      .catch(() => {}) // banner chỉ là phần phụ: lỗi thì ẩn, danh sách phim vẫn hiện
    return () => {
      cancelled = true
    }
  }, [])

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
      {banners.length > 0 && (
        <div className="mb-8">
          <BannerSlider items={banners} />
        </div>
      )}

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
        <Link to="/cinemas" className="-mb-px ml-auto border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-gray-500 hover:text-brand sm:hidden">
          Rạp chiếu →
        </Link>
      </div>

      {loading &&<p className="text-gray-500">Đang tải...</p>}
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

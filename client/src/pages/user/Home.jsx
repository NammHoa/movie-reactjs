import { useEffect, useRef, useState } from 'react'
import api from '../../api/axios'
import BannerSlider from '../../components/BannerSlider'
import BoxOffice from '../../components/BoxOffice'
import PosterRow from '../../components/PosterRow'

const TABS = [
  { value: 'now_showing', label: 'Đang chiếu' },
  { value: 'coming_soon', label: 'Sắp chiếu' },
]

export default function Home() {
  const [tab, setTab] = useState('now_showing')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [top, setTop] = useState({ banners: [], ranking: [] })
  const listRef = useRef(null)
  const scrollWhenLoaded = useRef(false)

  // Chờ cả hai rồi mới vẽ để bảng xếp hạng không nhảy chỗ. Đây là phần phụ: cái nào lỗi thì ẩn cái đó
  useEffect(() => {
    let cancelled = false
    const dataOf = (res) => (res.status === 'fulfilled' ? res.value.data : [])
    Promise.allSettled([api.get('/banners'), api.get('/movies/box-office')]).then(([banners, ranking]) => {
      if (!cancelled) setTop({ banners: dataOf(banners), ranking: dataOf(ranking) })
    })
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
    scrollWhenLoaded.current = false
    if (value === tab) return
    setLoading(true)
    setTab(value)
  }

  const scrollToList = () => listRef.current?.scrollIntoView({ behavior: 'smooth' })

  // Khi danh sách chưa tải xong, trang còn ngắn nên không cuộn tới đúng chỗ được: hẹn cuộn sau khi tải xong
  const buyNow = () => {
    if (tab === 'now_showing' && !loading) return scrollToList()
    changeTab('now_showing')
    scrollWhenLoaded.current = true
  }

  useEffect(() => {
    if (loading || !scrollWhenLoaded.current) return
    scrollWhenLoaded.current = false
    scrollToList()
  }, [loading])

  const hasBanner = top.banners.length > 0
  const hasRanking = top.ranking.length > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {(hasBanner || hasRanking) && (
        <div className={`mb-8 grid grid-cols-1 items-start gap-6 ${hasBanner && hasRanking ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
          {hasBanner && (
            <div className="min-w-0">
              <BannerSlider items={top.banners} />
            </div>
          )}
          {hasRanking && (
            <div className={`min-w-0 ${hasBanner ? '' : 'mx-auto w-full max-w-md'}`}>
              <BoxOffice items={top.ranking} onBuy={buyNow} />
            </div>
          )}
        </div>
      )}

      <div id="movie-list" ref={listRef} className="mb-6 flex scroll-mt-4 items-center justify-center gap-8 border-b border-gray-200">
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

      {loading &&<p className="text-gray-500">Đang tải...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && movies.length === 0 && (
        <p className="text-gray-500">Chưa có phim nào trong mục này.</p>
      )}

      {/* key theo tab: đổi tab thì hàng phim bắt đầu lại từ đầu */}
      <PosterRow key={tab} movies={movies} />
    </div>
  )
}

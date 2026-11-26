import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  const [top, setTop] = useState(null) // null: banner và Box Office chưa tải xong
  const [scrollRequest, setScrollRequest] = useState(0)
  const handledScroll = useRef(0)
  const listRef = useRef(null)
  const location = useLocation()

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

  const openTab = (value) => {
    if (value === tab) return
    setLoading(true)
    setTab(value)
  }

  const pickTab = (value) => {
    handledScroll.current = scrollRequest // khách tự đổi tab thì bỏ lệnh cuộn đang chờ
    openTab(value)
  }

  // "Mua vé" trên menu và "Mua vé ngay" ở Box Office cùng đi qua đây
  const showNowPlaying = () => {
    openTab('now_showing')
    setScrollRequest((n) => n + 1)
  }

  // Menu "Mua vé" trỏ tới /#movie-list; bấm lại khi đang ở trang chủ vẫn đổi location.key.
  // Cập nhật ngay trong lúc render (cách React khuyên dùng) thay vì setState trong effect
  const [seenLocation, setSeenLocation] = useState(null)
  if (seenLocation !== location.key) {
    setSeenLocation(location.key)
    if (location.hash === '#movie-list') showNowPlaying()
  }

  // Phần nào chưa tải xong thì trang còn thiếu chiều cao, cuộn sẽ dừng sai chỗ: đợi đủ rồi mới cuộn
  const ready = !loading && top !== null
  useEffect(() => {
    if (!ready || handledScroll.current === scrollRequest) return
    handledScroll.current = scrollRequest
    listRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ready, scrollRequest])

  const hasBanner = top?.banners.length > 0
  const hasRanking = top?.ranking.length > 0

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
              <BoxOffice items={top.ranking} onBuy={showNowPlaying} />
            </div>
          )}
        </div>
      )}

      <div id="movie-list" ref={listRef} className="mb-6 flex scroll-mt-4 items-center justify-center gap-8 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => pickTab(t.value)}
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

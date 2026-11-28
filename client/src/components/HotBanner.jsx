import { useEffect, useState } from 'react'
import api from '../api/axios'
import BannerSlider from './BannerSlider'

// Banner đầu trang Movie Talk: cùng danh sách phim với banner trang chủ, nhưng tự trượt
export default function HotBanner() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    api
      .get('/banners')
      .then(({ data }) => !cancelled && setItems(data))
      .catch(() => {}) // chỉ là phần phụ: lỗi thì ẩn, danh sách phim vẫn hiện
    return () => {
      cancelled = true
    }
  }, [])

  if (!items.length) return null

  return (
    <div>
      <p className="bg-[#ddd3b5] px-4 py-3 text-center text-sm font-bold tracking-wide text-gray-900">PHIM HOT TẠI RẠP</p>
      <div className="bg-[#231f20] sm:px-4 sm:py-4">
        <div className="mx-auto max-w-5xl bg-black pb-1">
          <BannerSlider items={items} hero autoPlay />
        </div>
      </div>
    </div>
  )
}

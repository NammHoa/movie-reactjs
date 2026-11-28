// Hai tab của Movie Talk. search là phần sau dấu ? trên đường dẫn, để bấm "Quay lại" về đúng tab
export const TALK_TABS = [
  { status: 'now_showing', label: 'Phim đang chiếu', search: '' },
  { status: 'coming_soon', label: 'Phim sắp chiếu', search: '?tab=coming' },
]

export const statusFromSearch = (search) =>
  new URLSearchParams(search).get('tab') === 'coming' ? 'coming_soon' : 'now_showing'

// Phim chưa có ngày chiếu xếp sau mọi phim có ngày
const releaseTime = (m) => (m.releaseDate ? new Date(m.releaseDate).getTime() : Number.MAX_SAFE_INTEGER)

// Thứ tự hiển thị của một tab, kèm số thứ hạng (null nếu không có).
// ranking là danh sách của API Box Office, đã xếp từ bán nhiều vé nhất
export function orderTalkMovies(status, movies, ranking) {
  if (status === 'coming_soon') {
    return [...movies]
      .sort((a, b) => releaseTime(a) - releaseTime(b) || a.title.localeCompare(b.title, 'vi'))
      .map((movie) => ({ movie, rank: null }))
  }

  const byId = new Map(movies.map((m) => [m._id, m]))
  // Box Office được nhớ tạm nên có thể còn phim vừa ngừng chiếu: lọc trước khi đánh số để số luôn liền nhau
  const ranked = ranking.map((r) => byId.get(r._id)).filter(Boolean)
  const rankedIds = new Set(ranked.map((m) => m._id))
  return [
    ...ranked.map((movie, i) => ({ movie, rank: i + 1 })),
    ...movies.filter((m) => !rankedIds.has(m._id)).map((movie) => ({ movie, rank: null })),
  ]
}

export const PAGE_SIZE = 8

// Số phim đang mở được cất trong lịch sử trình duyệt, nên bấm "Quay lại" thì danh sách vẫn mở như cũ
export const shownFromState = (state) =>
  Number.isInteger(state?.shown) && state.shown >= PAGE_SIZE ? state.shown : PAGE_SIZE

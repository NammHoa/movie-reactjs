// Hai tab của Movie Talk. search là phần sau dấu ? trên đường dẫn, để bấm "Quay lại" về đúng tab
export const TALK_TABS = [
  { status: 'now_showing', label: 'Đang chiếu', search: '' },
  { status: 'coming_soon', label: 'Sắp chiếu', search: '?tab=coming' },
]

export const statusFromSearch = (search) =>
  new URLSearchParams(search).get('tab') === 'coming' ? 'coming_soon' : 'now_showing'

// Các mục trên menu, theo đúng thứ tự hiển thị. comingSoon: chưa có trang thật, router dùng trang "Đang phát triển".
// Làm xong một tính năng thì bỏ comingSoon và khai báo route của nó trong App.jsx
export const MENU = [
  { label: 'Mua vé', to: '/#movie-list' },
  { label: 'Movie Talk', to: '/movie-talk' },
  { label: 'Rạp chiếu phim', to: '/cinemas' },
  { label: 'Tin mới & Ưu đãi', to: '/news', comingSoon: true },
  { label: 'Shop', to: '/shop', comingSoon: true },
  { label: 'De Coin', to: '/de-coin', comingSoon: true },
  { label: 'Quảng cáo & Thuê rạp', to: '/rent', comingSoon: true },
]

// Mục cần tô ứng với trang đang xem (trả về `to` của mục đó, hoặc null).
// So theo từng đoạn đường dẫn để "/newsletter" không bị tính là "/news"
export function activeMenu(pathname) {
  const section = pathname.split('/')[1] ?? ''
  const item = MENU.find((m) => m.to.split('#')[0].split('/')[1] === section)
  return item?.to ?? null
}

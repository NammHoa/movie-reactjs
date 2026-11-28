// Giao diện chỉ ẩn bớt cho dễ dùng; server mới là nơi chặn quyền
export const isStaff = (user) => user?.role === 'admin' || user?.role === 'manager'

// manager: true là mục quản lý rạp cũng dùng được
const ADMIN_LINKS = [
  { to: '/admin', label: 'Tổng quan', end: true, manager: true },
  { to: '/admin/bookings', label: 'Đơn đặt vé', manager: true },
  { to: '/admin/checkin', label: 'Soát vé', manager: true },
  { to: '/admin/refunds', label: 'Hoàn tiền' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/movies', label: 'Quản lý phim' },
  { to: '/admin/banners', label: 'Banner' },
  { to: '/admin/cinemas', label: 'Rạp & phòng chiếu' },
  { to: '/admin/showtimes', label: 'Suất chiếu', manager: true },
  { to: '/admin/coupons', label: 'Mã giảm giá' },
]

export const adminLinks = (role) => {
  if (role === 'admin') return ADMIN_LINKS
  return role === 'manager' ? ADMIN_LINKS.filter((l) => l.manager) : []
}

export const homePathFor = (user) => (isStaff(user) ? '/admin' : '/')

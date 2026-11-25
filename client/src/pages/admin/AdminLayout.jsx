import { NavLink, Outlet } from 'react-router-dom'

const LINKS = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/bookings', label: 'Đơn đặt vé' },
  { to: '/admin/checkin', label: 'Soát vé' },
  { to: '/admin/refunds', label: 'Hoàn tiền' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/movies', label: 'Quản lý phim' },
  { to: '/admin/cinemas', label: 'Rạp & phòng chiếu' },
  { to: '/admin/showtimes', label: 'Suất chiếu' },
  { to: '/admin/coupons', label: 'Mã giảm giá' },
]

export default function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-52 md:shrink-0">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Quản trị</p>
        <nav className="flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-200'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}

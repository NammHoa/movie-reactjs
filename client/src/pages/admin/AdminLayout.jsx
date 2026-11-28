import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { adminLinks } from '../../lib/roles'

export default function AdminLayout() {
  const { user } = useAuth()
  const manager = user.role === 'manager'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-52 md:shrink-0">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">{manager ? 'Quản lý rạp' : 'Quản trị'}</p>
        {manager && <p className="break-words font-bold text-gray-900">{user.cinema?.name}</p>}
        <nav className="mt-2 flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
          {adminLinks(user.role).map((l) => (
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

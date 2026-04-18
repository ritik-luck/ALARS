import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Settings, Activity, FileText, LogOut } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'analyst', 'viewer'] },
    { name: 'System Reports', path: '/reports', icon: <Activity size={20} />, roles: ['admin', 'analyst', 'viewer'] },
    { name: 'User Management', path: '/admin/users', icon: <Users size={20} />, roles: ['admin'] },
    { name: 'Rule/Thresholds', path: '/admin/rules', icon: <Settings size={20} />, roles: ['admin'] },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* Sidebar - Glassmorphism */}
      <div className="surface" style={{ width: '260px', margin: '1rem', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
            <FileText size={24} color="var(--brand)" /> ALARS
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Log Engine 3D</div>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.filter(item => item.roles.includes(user?.role)).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem',
                  color: isActive ? 'white' : 'var(--muted)',
                  background: isActive ? 'var(--brand-soft)' : 'transparent',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', transition: 'all 0.2s',
                  fontWeight: isActive ? '600' : '500'
                }}
              >
                {item.icon} {item.name}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.875rem', color: 'white' }}>{user?.username}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--brand)', textTransform: 'uppercase', fontWeight: 'bold' }}>{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="button-ghost"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', borderColor: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem 1rem 0' }}>
        <header className="surface" style={{ padding: '1.25rem 2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'white' }}>
            {navItems.find(item => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)))?.name || 'ALARS'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge badge--info" style={{ letterSpacing: '0.1em' }}>v2.0 3D</span>
          </div>
        </header>

        <main style={{ paddingBottom: '2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

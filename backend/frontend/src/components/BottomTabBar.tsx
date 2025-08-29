import { NavLink } from 'react-router-dom';

const TABS = [
    { to: '/',          label: '타이머',  icon: '⏱️' }, // 홈은 인덱스 라우트에 맞춰 '/'
    { to: '/priority',  label: '채점순서', icon: '📚' },
    { to: '/links',     label: '링크',   icon: '🔗' },
    { to: '/settings',  label: '설정',   icon: '⚙️' },
];

export default function BottomTabBar() {
    return (
        <nav
            style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000,
                height: 64,
                display: 'grid', gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
                alignItems: 'center',
                background: '#fff',
                borderTop: '1px solid #eee',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
            }}
            aria-label="Bottom Tabs"
            role="navigation"
        >
            {TABS.map(t => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.to === '/'} // 홈 탭은 정확히 '/'일 때만 활성
                    style={({ isActive }) => ({
                        textDecoration: 'none',
                        color: isActive ? '#111' : '#666',
                        fontWeight: isActive ? 600 : 400,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 4, fontSize: 12, padding: '8px 0',
                    })}
                >
          <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
            {t.icon}
          </span>
                    <span>{t.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}

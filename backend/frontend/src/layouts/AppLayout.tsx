import { Outlet } from 'react-router-dom';
import BottomTabBar from '../components/BottomTabBar';

const TABBAR_PX = 64;

export default function AppLayout() {
    return (
        <>
            {/* 탭바에 가리지 않도록 하단 패딩 */}
            <main
                style={{
                    minHeight: '100dvh',
                    paddingBottom: `calc(${TABBAR_PX}px + env(safe-area-inset-bottom, 0px))`,
                }}
            >
                <Outlet />
            </main>
            <BottomTabBar />
        </>
    );
}

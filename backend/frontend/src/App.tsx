import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import MainPage from './pages/MainPage';
import PriorityPage from './pages/PriorityPage';

export default function App() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                {/* 인덱스: 홈 */}
                <Route index element={<MainPage />} />

                {/* 예전 경로 호환 */}
                <Route path="/mainpage" element={<Navigate to="/" replace />} />
                {/* 채점 우선순위 페이지 */}
                <Route path="/priority" element={<PriorityPage />} />

                 탭 라우트들 (페이지 생기기 전 임시 스텁)
                <Route path="/links"    element={<div style={{padding:16}}>링크 페이지 준비중</div>} />
                <Route path="/settings" element={<div style={{padding:16}}>설정 페이지 준비중</div>} />


                {/* 그 외 → 홈 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import MainPage from './pages/MainPage';

function App() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                {/* 인덱스: 홈 */}
                <Route index element={<MainPage />} />

                {/* 예전 경로 호환: /mainpage → / */}
                <Route path="/mainpage" element={<Navigate to="/" replace />} />

                {/* 탭 라우트들 (페이지 생기기 전 임시 스텁) */}
                {/*<Route path="/priority" element={<div style={{padding:16}}>채점순서 페이지 준비중</div>} />*/}
                {/*<Route path="/links"    element={<div style={{padding:16}}>링크 페이지 준비중</div>} />*/}
                {/*<Route path="/settings" element={<div style={{padding:16}}>설정 페이지 준비중</div>} />*/}

                {/* 그 외 → 홈 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export default App;

import { Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/routes/Home';
import Create from '@/routes/Create';
import CreatePreview from '@/routes/CreatePreview';
import CreateSuccess from '@/routes/CreateSuccess';
import InviteEntry from '@/routes/InviteEntry';
import Quiz from '@/routes/Quiz';
import Result from '@/routes/Result';
import Leaderboard from '@/routes/Leaderboard';
import Manage from '@/routes/Manage';
import NotFound from '@/routes/NotFound';

/**
 * 路由划分（与执行计划一致）：
 *   /                         首页
 *   /create                   创建挑战（编辑 5 道题）
 *   /create/preview           发布前预览
 *   /create/success           发布成功（一次性展示邀请 + 管理链接）
 *   /c/:inviteSlug            邀请链接入口（昵称输入）— 阶段 3
 *   /c/:inviteSlug/quiz       答题页 — 阶段 4
 *   /c/:inviteSlug/result/:shareSlug   成绩页 — 阶段 5
 *   /c/:inviteSlug/leaderboard         排行榜 — 阶段 6
 *   /m/:manageSlug            管理页 — 阶段 7
 */
export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/create/preview" element={<CreatePreview />} />
        <Route path="/create/success" element={<CreateSuccess />} />
        <Route path="/c/:inviteSlug" element={<InviteEntry />} />
        <Route path="/c/:inviteSlug/quiz" element={<Quiz />} />
        <Route path="/c/:inviteSlug/result/:shareSlug" element={<Result />} />
        <Route path="/c/:inviteSlug/leaderboard" element={<Leaderboard />} />
        <Route path="/m/:manageSlug" element={<Manage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

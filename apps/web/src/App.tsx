import { Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/routes/Home';
import Create from '@/routes/Create';
import Quiz from '@/routes/Quiz';
import Result from '@/routes/Result';
import Leaderboard from '@/routes/Leaderboard';
import Manage from '@/routes/Manage';
import NotFound from '@/routes/NotFound';

/**
 * 路由划分（与执行计划一致）：
 *   /                       首页
 *   /create                 创建挑战
 *   /c/:inviteSlug          邀请链接入口（昵称输入）
 *   /c/:inviteSlug/quiz     答题页
 *   /c/:inviteSlug/result/:shareSlug   成绩页
 *   /c/:inviteSlug/leaderboard         排行榜
 *   /m/:manageSlug          管理页
 */
export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/c/:inviteSlug" element={<Create />} />
        <Route path="/c/:inviteSlug/quiz" element={<Quiz />} />
        <Route path="/c/:inviteSlug/result/:shareSlug" element={<Result />} />
        <Route path="/c/:inviteSlug/leaderboard" element={<Leaderboard />} />
        <Route path="/m/:manageSlug" element={<Manage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

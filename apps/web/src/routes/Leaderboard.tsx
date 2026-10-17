import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/track';

interface LeaderboardRow {
  rank: number;
  id: string;
  nickname: string;
  score: number;
  title_label: string;
  isCurrentUser: boolean;
}

interface ChallengePublic {
  id: string;
  slug: string;
  title: string;
  status: string;
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'empty' | 'network_error' | 'config_error';

export default function Leaderboard() {
  const { inviteSlug } = useParams<{ inviteSlug: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [challenge, setChallenge] = useState<ChallengePublic | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!inviteSlug) return;
    if (!supabase) {
      setState('config_error');
      return;
    }
    track('leaderboard_viewed');

    (async () => {
      try {
        // 1) 查 challenge（公开字段）
        const { data: chData, error: chErr } = await supabase
          .from('challenges_public')
          .select('id, slug, title, status')
          .eq('slug', inviteSlug)
          .maybeSingle();

        if (chErr) {
          setErrorMsg(chErr.message);
          setState('network_error');
          return;
        }
        if (!chData) {
          setState('not_found');
          return;
        }
        setChallenge(chData);

        // 2) 查排行榜（白名单列）
        const { data: subs, error: lbErr } = await supabase
          .from('submissions')
          .select('id, nickname, score, title_label, created_at')
          .eq('challenge_id', chData.id)
          .order('score', { ascending: false })
          .order('created_at', { ascending: true });

        if (lbErr) {
          setErrorMsg(lbErr.message);
          setState('network_error');
          return;
        }
        if (!subs || subs.length === 0) {
          setState('empty');
          return;
        }

        // 3) 计算并列排名
        const ranked: LeaderboardRow[] = [];
        subs.forEach((s, idx) => {
          let rank = idx + 1;
          if (idx > 0 && s.score === ranked[ranked.length - 1].score) {
            rank = ranked[ranked.length - 1].rank;
          }
          ranked.push({
            rank,
            id: s.id,
            nickname: s.nickname,
            score: s.score,
            title_label: s.title_label,
            isCurrentUser: false, // 阶段 6 不强求，当前用户从 sessionStorage 识别
          });
        });

        setRows(ranked);
        setState('ready');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : '未知异常');
        setState('network_error');
      }
    })();
  }, [inviteSlug]);

  if (state === 'config_error') {
    return (
      <Card>
        <CardContent className="text-destructive pt-6 text-sm">前端未配置 Supabase</CardContent>
      </Card>
    );
  }

  if (state === 'not_found') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>挑战不存在</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">这个挑战可能已被删除</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'loading') {
    return (
      <Card>
        <CardContent className="pt-6">
          <Loading text="加载排行榜…" />
        </CardContent>
      </Card>
    );
  }

  if (state === 'network_error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>加载失败</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-destructive text-sm">{errorMsg}</p>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </CardContent>
      </Card>
    );
  }

  // ready 或 empty
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">排行榜</h1>
        {challenge && <p className="text-muted-foreground text-sm">{challenge.title}</p>}
      </header>

      {state === 'empty' ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
            <div className="text-4xl">🎯</div>
            <p className="text-sm">还没有人参与此挑战</p>
            <p className="text-xs">快去做第一个！</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ol className="divide-y">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    row.isCurrentUser ? 'bg-primary/5' : ''
                  } ${row.rank === 1 ? 'font-semibold' : ''}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                      row.rank === 1
                        ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                        : row.rank === 2
                          ? 'bg-gray-400/20 text-gray-700 dark:text-gray-300'
                          : row.rank === 3
                            ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{row.nickname}</p>
                    <p className="text-muted-foreground truncate text-xs">{row.title_label}</p>
                  </div>
                  <span className="text-base font-semibold tabular-nums">
                    {row.score}
                    <span className="text-muted-foreground ml-1 text-xs">/ 5</span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Button asChild variant="outline">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}

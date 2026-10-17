/** 分享文案模板 */

/* ============ 邀请链接（发给朋友，邀请来挑战） ============ */

export interface InviteTemplate {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

export const INVITE_TEMPLATES: InviteTemplate[] = [
  {
    id: 'challenge',
    emoji: '🎯',
    title: '挑战型',
    body: `🎯 你有多懂我？快来测一测！
想知道你在朋友里排第几？
5 道题看你能答对几道：
{url}`,
  },
  {
    id: 'invite',
    emoji: '💘',
    title: '邀请型',
    body: `💘 据说真正懂我的人，都能答对这几道题。
不信？来试试：
{url}`,
  },
  {
    id: 'curious',
    emoji: '🤔',
    title: '好奇型',
    body: `🤔 你真的了解我吗？来挑战一下！
5 道题测出我们的默契指数：
{url}`,
  },
  {
    id: 'playful',
    emoji: '⚡',
    title: '玩味型',
    body: `⚡ 我们默契有多高？5 道题见分晓。
敢不敢来试？
{url}`,
  },
];

export function pickRandomInviteTemplate(): InviteTemplate {
  return INVITE_TEMPLATES[Math.floor(Math.random() * INVITE_TEMPLATES.length)];
}

export function renderInviteTemplate(template: InviteTemplate, url: string): string {
  return template.body.replace(/\{url\}/g, url);
}

/* ============ 个人成绩（发给创建者，纯营销文案） ============
 *
 * 文案**不带**分数/称号 —— 让创建者点链接去成绩页自己看
 * 实现简单：和邀请文案一样，4 选 1 随机，只用 {url} 占位符
 * 这样不需要动态填值，是纯静态模板
 */

export interface ResultTemplate {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

export const RESULT_TEMPLATES: ResultTemplate[] = [
  {
    id: 'curious',
    emoji: '🤔',
    title: '好奇型',
    body: `🤔 我刚答完了你的挑战！
你来猜猜我能答对几道 👉
{url}`,
  },
  {
    id: 'tease',
    emoji: '😏',
    title: '调皮型',
    body: `😏 我刚挑战完你的题了！
快来点评一下我的表现吧 💪
{url}`,
  },
  {
    id: 'mystery',
    emoji: '🔮',
    title: '神秘型',
    body: `🔮 我答完了你的挑战……
你知道我答对了几道吗？
{url}`,
  },
  {
    id: 'humble',
    emoji: '💭',
    title: '坦诚型',
    body: `💭 我答完你的题了，等你来点评 ✨
{url}`,
  },
];

export function pickRandomResultTemplate(): ResultTemplate {
  return RESULT_TEMPLATES[Math.floor(Math.random() * RESULT_TEMPLATES.length)];
}

export function renderResultTemplate(template: ResultTemplate, url: string): string {
  return template.body.replace(/\{url\}/g, url);
}

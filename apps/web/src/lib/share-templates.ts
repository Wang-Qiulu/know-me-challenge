/** 分享文案模板（邀请链接） */

export interface ShareTemplate {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

/** 4 个模板，每次复制时随机选一个 */
export const INVITE_TEMPLATES: ShareTemplate[] = [
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

/** 随机选一个模板（基于时间戳+random） */
export function pickRandomTemplate(): ShareTemplate {
  return INVITE_TEMPLATES[Math.floor(Math.random() * INVITE_TEMPLATES.length)];
}

/** 把模板里的 {url} 占位符替换成真实链接 */
export function renderTemplate(template: ShareTemplate, url: string): string {
  return template.body.replace(/\{url\}/g, url);
}

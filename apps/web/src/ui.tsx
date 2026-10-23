import type { ReactNode } from 'react';
import { CalendarDays, CircleAlert } from 'lucide-react';
import type { EventCategory } from '../../../packages/contracts/src/index.js';
const categoryLabels: Record<EventCategory, string> = {
  LECTURE: '讲座',
  COMPETITION: '比赛',
  PERFORMANCE: '演出',
};
export const statusLabels = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  CANCELING: '取消中',
  CANCELED: '已取消',
};
export const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});
export const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
export const money = (cents: number) =>
  cents === 0 ? '免费' : '¥' + (cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
export function ErrorMessage({ error }: { error: Error | null | undefined }) {
  return error ? (
    <div className="error-message" role="alert">
      <CircleAlert size={17} />
      {error.message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="empty-state" role="status">
      正在加载…
    </div>
  );
}
export function State({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <CalendarDays size={32} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function ImageCredit() {
  return <span className="photo-credit">PHOTO / UNSPLASH</span>;
}
export function EventPhoto({
  category,
  className = '',
}: {
  category: EventCategory;
  className?: string;
}) {
  const photos = {
    LECTURE: 'photo-1516321318423-f06f85e504b3',
    PERFORMANCE: 'photo-1470229722913-7c0e2dbbafd3',
    COMPETITION: 'photo-1519389950473-47ba0277781c',
  };
  return (
    <div className={'event-photo ' + className}>
      <img
        src={
          'https://images.unsplash.com/' + photos[category] + '?auto=format&fit=crop&w=1100&q=85'
        }
        alt={
          {
            LECTURE: '参与者在讲座中交流',
            PERFORMANCE: '舞台灯光与现场观众',
            COMPETITION: '开发者围坐协作',
          }[category]
        }
      />
      <ImageCredit />
    </div>
  );
}

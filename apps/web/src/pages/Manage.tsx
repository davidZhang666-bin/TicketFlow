import { useContext } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronRight, Plus } from 'lucide-react';
import { eventListSchema } from '../../../../packages/contracts/src/index.js';
import { request } from '../api.js';
import { Auth } from '../auth-context.js';
import { ErrorMessage, Loading, State, categoryLabels, statusLabels } from '../ui.js';
export function RequireOrganizer({ children }: { children: ReactNode }) {
  const session = useContext(Auth);
  if (!session)
    return (
      <State title="登录后管理活动">
        <Link to="/login" className="button primary">
          去登录 <ArrowRight size={16} />
        </Link>
      </State>
    );
  if (session.user.role !== 'ORGANIZER')
    return (
      <State title="需要运营权限">
        <p>请使用活动运营账号登录。</p>
      </State>
    );
  return children;
}
export function Manage() {
  const session = useContext(Auth);
  const query = useQuery({
    queryKey: ['owned-events', session?.user.id],
    queryFn: () => request('/api/v1/organizer/events', eventListSchema),
    enabled: session?.user.role === 'ORGANIZER',
  });
  return (
    <main className="container management-page">
      <RequireOrganizer>
        <div className="page-heading">
          <div>
            <p className="eyebrow muted">ORGANIZER WORKSPACE</p>
            <h1>活动管理</h1>
            <p className="text-muted">从一个想法，到一次值得期待的现场。</p>
          </div>
          <Link className="button primary" to="/manage/new">
            <Plus size={18} />
            创建活动
          </Link>
        </div>
        <div className="management-stats">
          <div>
            <span>全部活动</span>
            <strong>{query.data?.items.length ?? '—'}</strong>
          </div>
          <div>
            <span>已发布</span>
            <strong>
              {query.data?.items.filter((item) => item.status === 'PUBLISHED').length ?? '—'}
            </strong>
          </div>
          <div>
            <span>待完善草稿</span>
            <strong>
              {query.data?.items.filter((item) => item.status === 'DRAFT').length ?? '—'}
            </strong>
          </div>
        </div>
        <ErrorMessage error={query.error} />
        {query.isPending ? (
          <Loading />
        ) : !query.data?.items.length ? (
          <State title="从第一场活动开始">
            <Link className="button secondary" to="/manage/new">
              创建活动
            </Link>
          </State>
        ) : (
          <div className="manage-table">
            <div className="table-heading">
              <span>活动</span>
              <span>状态</span>
              <span>场次 / 席位</span>
              <span>操作</span>
            </div>
            {query.data.items.map((item) => (
              <Link className="table-row" to={'/manage/' + item.id} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {categoryLabels[item.category]} · {item.location}
                  </span>
                </div>
                <span>
                  <span className={'status-badge ' + item.status.toLowerCase()}>
                    {statusLabels[item.status]}
                  </span>
                </span>
                <span>
                  {item.slots.length} 场 /{' '}
                  {item.slots.reduce((sum, slot) => sum + slot.capacity, 0)} 席
                </span>
                <span>
                  {item.status === 'DRAFT' ? '编辑草稿' : '查看活动'}
                  <ChevronRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </RequireOrganizer>
    </main>
  );
}

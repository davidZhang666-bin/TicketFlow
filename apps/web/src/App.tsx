import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, LogOut, Ticket } from 'lucide-react';
import { z } from 'zod';
import { sessionSchema } from '../../../packages/contracts/src/index.js';
import { ApiError, request, setCsrfToken } from './api.js';
import { Auth } from './auth-context.js';
import { ErrorMessage, Loading, State } from './ui.js';
import { Discover } from './pages/Discover.js';
import { EventDetail } from './pages/EventDetail.js';
import { Login } from './pages/Login.js';
import { Manage } from './pages/Manage.js';
import { Editor } from './pages/Editor.js';
export function App() {
  const client = useQueryClient();
  const session = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const value = await request('/api/v1/auth/me', sessionSchema);
        setCsrfToken(value.csrfToken);
        return value;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setCsrfToken(undefined);
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
  const logout = useMutation({
    mutationFn: () => request('/api/v1/auth/logout', z.undefined(), { method: 'POST' }),
    onSuccess: () => {
      setCsrfToken(undefined);
      client.setQueryData(['session'], null);
      client.removeQueries({ queryKey: ['owned-events'] });
      client.removeQueries({ queryKey: ['owned-event'] });
    },
  });
  return (
    <Auth.Provider value={session.data ?? null}>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="TicketFlow 首页">
            <span className="brand-mark">
              <Ticket size={23} />
            </span>
            TicketFlow<span className="brand-dot">.</span>
          </Link>
          <nav aria-label="主导航">
            <NavLink to="/" end>
              发现活动
            </NavLink>
            {session.data?.user.role === 'ORGANIZER' && <NavLink to="/manage">活动管理</NavLink>}
          </nav>
          <div className="account">
            {session.data ? (
              <>
                <span className="avatar">{session.data.user.name.slice(0, 1)}</span>
                <span className="account-name">{session.data.user.name}</span>
                <button
                  className="icon-button"
                  title="退出登录"
                  aria-label="退出登录"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="login-link" to="/login">
                登录 <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </header>
      <ErrorMessage error={logout.error} />
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/manage" element={session.isPending ? <Loading /> : <Manage />} />
        <Route path="/manage/new" element={session.isPending ? <Loading /> : <Editor />} />
        <Route path="/manage/:id" element={session.isPending ? <Loading /> : <Editor />} />
        <Route
          path="*"
          element={
            <main className="container">
              <State title="这里还没有活动">
                <Link to="/">回到活动列表</Link>
              </State>
            </main>
          }
        />
      </Routes>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link className="brand small" to="/">
            TicketFlow.
          </Link>
          <span>让每一次相遇，都有一个位置。</span>
          <span className="footer-meta">
            上海时间 UTC+8 <span>·</span> © 2026
          </span>
        </div>
      </footer>
    </Auth.Provider>
  );
}

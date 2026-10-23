import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Ticket } from 'lucide-react';
import { sessionSchema } from '../../../../packages/contracts/src/index.js';
import { request, setCsrfToken } from '../api.js';
import { Auth } from '../auth-context.js';
import { ErrorMessage, State } from '../ui.js';
export function Login() {
  const session = useContext(Auth);
  const client = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('user@ticketflow.demo');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      request('/api/v1/auth/login', sessionSchema, { method: 'POST', body: { email, password } }),
    onSuccess: (value) => {
      setCsrfToken(value.csrfToken);
      client.setQueryData(['session'], value);
      navigate(value.user.role === 'ORGANIZER' ? '/manage' : '/');
    },
  });
  if (session)
    return (
      <main className="container">
        <State title={'你好，' + session.user.name}>
          <Link to={session.user.role === 'ORGANIZER' ? '/manage' : '/'}>
            进入工作台 <ArrowRight size={16} />
          </Link>
        </State>
      </main>
    );
  return (
    <main className="login-page container">
      <div className="login-intro">
        <p className="eyebrow muted">YOUR NEXT MOMENT</p>
        <h1>
          欢迎回来。
          <br />
          下一场，见。
        </h1>
        <p>
          登录后发现更多精彩，
          <br />
          运营人员可以在这里管理活动。
        </p>
        <div className="login-decoration">
          <Ticket size={70} strokeWidth={1} />
          <span>TICKETFLOW / 2026</span>
        </div>
      </div>
      <form
        className="login-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <p className="eyebrow muted">ACCOUNT</p>
        <h2>登录 TicketFlow</h2>
        <label>
          邮箱
          <input
            name="email"
            autoComplete="username"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          密码
          <input
            name="password"
            autoComplete="current-password"
            type="password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <ErrorMessage error={mutation.error} />
        <button className="button primary full" disabled={mutation.isPending}>
          {mutation.isPending ? '正在登录…' : '登录'}
          <ArrowRight size={18} />
        </button>
        <div className="demo-accounts">
          <span>演示账号</span>
          <button type="button" onClick={() => setEmail('user@ticketflow.demo')}>
            用户
          </button>
          <button type="button" onClick={() => setEmail('organizer@ticketflow.demo')}>
            运营
          </button>
          <p>本地演示密码见项目 .env 中的 DEMO_PASSWORD。</p>
        </div>
      </form>
    </main>
  );
}

import { createContext, useContext, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  LogOut,
  MapPin,
  Plus,
  Ticket,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { z } from 'zod';
import {
  eventInputSchema,
  eventListSchema,
  eventViewSchema,
  sessionSchema,
} from '../../../packages/contracts/src/index.js';
import type {
  EventCategory,
  EventInput,
  EventView,
  SessionView,
} from '../../../packages/contracts/src/index.js';
import { ApiError, request, setCsrfToken } from './api.js';

const Auth = createContext<SessionView | null>(null);
const categoryLabels: Record<EventCategory, string> = {
  LECTURE: '讲座',
  COMPETITION: '比赛',
  PERFORMANCE: '演出',
};
const statusLabels = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  CANCELING: '取消中',
  CANCELED: '已取消',
};
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});
const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const money = (cents: number) =>
  cents === 0 ? '免费' : '¥' + (cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
function ErrorMessage({ error }: { error: Error | null | undefined }) {
  return error ? (
    <div className="error-message" role="alert">
      <CircleAlert size={17} />
      {error.message}
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="empty-state" role="status">
      正在加载…
    </div>
  );
}
function State({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <CalendarDays size={32} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function ImageCredit() {
  return <span className="photo-credit">PHOTO / UNSPLASH</span>;
}
function EventPhoto({ category, className = '' }: { category: EventCategory; className?: string }) {
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
function Discover() {
  const [filter, setFilter] = useState<EventCategory | 'ALL'>('ALL');
  const query = useQuery({
    queryKey: ['events'],
    queryFn: () => request('/api/v1/events', eventListSchema),
  });
  const events =
    query.data?.items.filter((event) => filter === 'ALL' || event.category === filter) ?? [];
  return (
    <main>
      <section className="hero-band">
        <div className="container hero-content">
          <p className="eyebrow">
            <span className="live-dot" />
            留一点时间，给值得的现场
          </p>
          <h1>
            下一场相遇，
            <br />
            从这里开始<span className="green-period">。</span>
          </h1>
          <p className="hero-description">
            一场启发思考的讲座，一次全力以赴的比赛，
            <br className="desktop-break" />
            或一个不想错过的夜晚。找到你的下一站。
          </p>
          <a href="#events" className="hero-link">
            发现即将发生的精彩 <ArrowDownLeft size={19} />
          </a>
        </div>
        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1800&q=85"
            alt="活动会场内，人们共同参与一场现场活动"
          />
          <ImageCredit />
        </div>
      </section>
      <section id="events" className="container events-section">
        <div className="section-top">
          <div>
            <p className="eyebrow muted">FIND YOUR NEXT MOMENT</p>
            <h2>值得到场</h2>
          </div>
          <span className="count-note">
            {query.data ? query.data.items.length + ' 场活动，等你发现' : '每一次到场，都值得期待'}
          </span>
        </div>
        <div className="filter-row" role="group" aria-label="活动分类">
          {(['ALL', 'LECTURE', 'COMPETITION', 'PERFORMANCE'] as const).map((value) => (
            <button
              key={value}
              className={filter === value ? 'filter active' : 'filter'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === 'ALL' ? '全部活动' : categoryLabels[value]}
            </button>
          ))}
          <span className="filter-caption">按最新发布排列</span>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <State title="暂时无法加载活动">
            <ErrorMessage error={query.error} />
            <button className="button secondary" onClick={() => void query.refetch()}>
              重新加载
            </button>
          </State>
        ) : events.length === 0 ? (
          <State title="还没有这一类活动">
            <p>换一个分类，或稍后回来看看。</p>
          </State>
        ) : (
          <div className="event-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
        <div className="editorial-note">
          <span>好时光，需要亲自到场。</span>
          <span>
            SEE YOU THERE <ArrowRight size={16} />
          </span>
        </div>
      </section>
    </main>
  );
}
function EventCard({ event }: { event: EventView }) {
  const slot = event.slots[0];
  const price = Math.min(...event.slots.map((item) => item.priceCents));
  return (
    <Link to={'/events/' + event.id} className="event-card">
      <div className="card-media">
        <EventPhoto category={event.category} />
        <span className={'category category-' + event.category.toLowerCase()}>
          {categoryLabels[event.category]}
        </span>
        <span className="card-arrow">
          <ArrowRight size={20} />
        </span>
      </div>
      <div className="card-content">
        <div className="card-date">
          {slot ? dateFormatter.format(new Date(slot.startsAt)) : '待定'}
          <span>{slot ? timeFormatter.format(new Date(slot.startsAt)) : ''}</span>
        </div>
        <h3>{event.title}</h3>
        <p className="card-location">
          <MapPin size={14} />
          {event.location}
        </p>
        <div className="card-bottom">
          <strong>
            {money(price)}
            {event.slots.length > 1 && price > 0 ? <small> 起</small> : ''}
          </strong>
          <span>
            <Users size={14} />
            {event.slots.reduce((sum, item) => sum + item.capacity, 0)} 个席位
          </span>
        </div>
      </div>
    </Link>
  );
}
function EventDetail() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ['event', id],
    queryFn: () => request('/api/v1/events/' + id, eventViewSchema),
  });
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <main className="container">
        <State title="未找到活动">
          <ErrorMessage error={query.error} />
          <Link to="/">返回活动列表</Link>
        </State>
      </main>
    );
  const event = query.data;
  return (
    <main className="container detail-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} />
        发现活动
      </Link>
      <div className="detail-grid">
        <article>
          <EventPhoto category={event.category} className="detail-photo" />
          <p className="eyebrow muted">
            {categoryLabels[event.category]} / {event.location}
          </p>
          <h1>{event.title}</h1>
          <p className="event-description">{event.description}</p>
          <hr />
          <h2>关于现场</h2>
          <p className="text-muted">请按照所选场次的开始时间到场。所有时间均为北京时间。</p>
        </article>
        <aside className="booking-panel">
          <div className="panel-heading">
            <CalendarDays size={20} />
            <h2>场次与席位</h2>
          </div>
          {event.slots.map((slot) => (
            <div className="slot-option" key={slot.id}>
              <div className="slot-top">
                <strong>{slot.label}</strong>
                <strong>{money(slot.priceCents)}</strong>
              </div>
              <p>
                <Clock3 size={14} />
                {dateFormatter.format(new Date(slot.startsAt))}{' '}
                {timeFormatter.format(new Date(slot.startsAt))}—
                {timeFormatter.format(new Date(slot.endsAt))}
              </p>
              <p>
                <Users size={14} />
                总席位 {slot.capacity} · 余量 {slot.available}
              </p>
            </div>
          ))}
          <div className="notice">
            <CircleAlert size={17} />
            <p>报名通道将于下一阶段开放，目前可以浏览活动与场次。</p>
          </div>
          <p className="sales-note">
            报名截止
            <br />
            <strong>
              {dateFormatter.format(new Date(event.salesClosesAt))}{' '}
              {timeFormatter.format(new Date(event.salesClosesAt))}
            </strong>
          </p>
        </aside>
      </div>
    </main>
  );
}
function Login() {
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
function RequireOrganizer({ children }: { children: ReactNode }) {
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
function Manage() {
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
function toLocalInput(iso: string) {
  return new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}
const fromLocalInput = (value: string) => new Date(value + ':00+08:00').toISOString();
interface Draft {
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  salesOpensAt: string;
  salesClosesAt: string;
  slots: { label: string; startsAt: string; endsAt: string; capacity: string; price: string }[];
}
function initialDraft(event?: EventView): Draft {
  const later = (hours: number) =>
    toLocalInput(new Date(Date.now() + hours * 3600_000).toISOString());
  return event
    ? {
        ...event,
        salesOpensAt: toLocalInput(event.salesOpensAt),
        salesClosesAt: toLocalInput(event.salesClosesAt),
        slots: event.slots.map((slot) => ({
          ...slot,
          startsAt: toLocalInput(slot.startsAt),
          endsAt: toLocalInput(slot.endsAt),
          capacity: String(slot.capacity),
          price: (slot.priceCents / 100).toFixed(2),
        })),
      }
    : {
        title: '',
        description: '',
        location: '',
        category: 'LECTURE',
        salesOpensAt: later(0),
        salesClosesAt: later(24 * 6),
        slots: [
          {
            label: '标准场',
            startsAt: later(24 * 7),
            endsAt: later(24 * 7 + 2),
            capacity: '100',
            price: '0.00',
          },
        ],
      };
}
function Editor() {
  const { id } = useParams();
  const session = useContext(Auth);
  const query = useQuery({
    queryKey: ['owned-event', id],
    queryFn: () => request('/api/v1/organizer/events/' + id, eventViewSchema),
    enabled: Boolean(id) && session?.user.role === 'ORGANIZER',
  });
  return (
    <main className="container editor-page">
      <RequireOrganizer>
        {id ? (
          query.isPending ? (
            <Loading />
          ) : query.data ? (
            <EventForm key={query.data.id + ':' + query.data.revision} event={query.data} />
          ) : (
            <State title="无法加载活动">
              <ErrorMessage error={query.error} />
              <Link to="/manage">返回管理页</Link>
            </State>
          )
        ) : (
          <EventForm />
        )}
      </RequireOrganizer>
    </main>
  );
}
function EventForm({ event }: { event?: EventView }) {
  const [draft, setDraft] = useState(() => initialDraft(event));
  const [validation, setValidation] = useState<string>();
  const [saved, setSaved] = useState(false);
  const command = useRef<{ signature: string; key: string } | null>(null);
  const client = useQueryClient();
  const navigate = useNavigate();
  const readonly = event && event.status !== 'DRAFT';
  function keyFor(input: unknown) {
    const signature = JSON.stringify(input);
    if (command.current?.signature !== signature)
      command.current = { signature, key: crypto.randomUUID() };
    return command.current.key;
  }
  const save = useMutation({
    mutationFn: (input: EventInput) =>
      request(
        event ? '/api/v1/organizer/events/' + event.id : '/api/v1/organizer/events',
        eventViewSchema,
        {
          method: event ? 'PUT' : 'POST',
          body: event ? { ...input, expectedRevision: event.revision } : input,
          key: keyFor({ kind: 'save', input, revision: event?.revision }),
        },
      ),
    onSuccess: (result) => {
      client.setQueryData(['owned-event', result.id], result);
      void client.invalidateQueries({ queryKey: ['owned-events'] });
      setSaved(true);
      navigate('/manage/' + result.id, { replace: true });
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      request('/api/v1/organizer/events/' + event!.id + '/publish', eventViewSchema, {
        method: 'POST',
        body: { expectedRevision: event!.revision },
        key: keyFor({ kind: 'publish', revision: event!.revision }),
      }),
    onSuccess: (result) => {
      client.setQueryData(['owned-event', result.id], result);
      void client.invalidateQueries({ queryKey: ['owned-events'] });
      void client.invalidateQueries({ queryKey: ['events'] });
    },
  });
  const busy = save.isPending || publish.isPending;
  function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    setValidation(undefined);
    try {
      const input = eventInputSchema.parse({
        ...draft,
        salesOpensAt: fromLocalInput(draft.salesOpensAt),
        salesClosesAt: fromLocalInput(draft.salesClosesAt),
        slots: draft.slots.map((slot) => {
          if (!/^\d+(\.\d{1,2})?$/.test(slot.price)) throw new Error('价格最多包含两位小数。');
          const [whole, decimals = ''] = slot.price.split('.');
          return {
            label: slot.label,
            startsAt: fromLocalInput(slot.startsAt),
            endsAt: fromLocalInput(slot.endsAt),
            capacity: Number(slot.capacity),
            priceCents: Number(whole) * 100 + Number(decimals.padEnd(2, '0')),
          };
        }),
      });
      save.mutate(input);
    } catch (error) {
      setValidation(
        error instanceof z.ZodError
          ? '请检查必填内容、人数及活动时间。'
          : error instanceof Error
            ? error.message
            : '输入有误。',
      );
    }
  }
  const edit = <K extends keyof Draft>(name: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [name]: value }));
    setSaved(false);
  };
  function editSlot(index: number, name: keyof Draft['slots'][number], value: string) {
    edit(
      'slots',
      draft.slots.map((slot, position) => (position === index ? { ...slot, [name]: value } : slot)),
    );
  }
  return (
    <>
      <Link className="back-link" to="/manage">
        <ArrowLeft size={16} />
        活动管理
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow muted">MAKE SOMETHING HAPPEN</p>
          <h1>{event ? (readonly ? '活动信息' : '编辑活动') : '创建新活动'}</h1>
        </div>
        {event && (
          <span className={'status-badge ' + event.status.toLowerCase()}>
            {statusLabels[event.status]}
          </span>
        )}
      </div>
      {readonly && (
        <div className="success-message">
          <Check size={18} />
          活动已发布。
          <Link to={'/events/' + event.id}>
            查看公开页面 <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <form onSubmit={submit} className="event-form">
        <fieldset disabled={Boolean(readonly) || busy}>
          <section className="form-section">
            <div className="form-section-label">
              <span>01</span>
              <h2>基本信息</h2>
              <p>为这场活动写一个好的开始。</p>
            </div>
            <div className="form-fields">
              <label>
                活动名称
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={draft.title}
                  onChange={(e) => edit('title', e.target.value)}
                  placeholder="给你的活动一个名字"
                />
              </label>
              <div className="form-row">
                <label>
                  活动类型
                  <select
                    value={draft.category}
                    onChange={(e) => edit('category', e.target.value as EventCategory)}
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  举办地点
                  <input
                    required
                    maxLength={160}
                    value={draft.location}
                    onChange={(e) => edit('location', e.target.value)}
                    placeholder="城市 · 场馆"
                  />
                </label>
              </div>
              <label>
                活动介绍
                <textarea
                  rows={5}
                  required
                  maxLength={4000}
                  value={draft.description}
                  onChange={(e) => edit('description', e.target.value)}
                  placeholder="介绍活动内容、参与对象与到场须知…"
                />
              </label>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-label">
              <span>02</span>
              <h2>报名时间</h2>
              <p>所有时间均为北京时间。</p>
            </div>
            <div className="form-fields form-row">
              <label>
                开放时间
                <input
                  type="datetime-local"
                  required
                  value={draft.salesOpensAt}
                  onChange={(e) => edit('salesOpensAt', e.target.value)}
                />
              </label>
              <label>
                截止时间
                <input
                  type="datetime-local"
                  required
                  value={draft.salesClosesAt}
                  onChange={(e) => edit('salesClosesAt', e.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-label">
              <span>03</span>
              <h2>场次与票价</h2>
              <p>
                每个场次独立设置席位。
                <br />
                报名须在场次开始前截止。
              </p>
            </div>
            <div className="form-fields">
              {draft.slots.map((slot, index) => (
                <div className="slot-editor" key={index}>
                  <div className="slot-editor-heading">
                    <strong>场次 {String(index + 1).padStart(2, '0')}</strong>
                    {draft.slots.length > 1 && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={'删除场次 ' + (index + 1)}
                        onClick={() =>
                          edit(
                            'slots',
                            draft.slots.filter((_, position) => position !== index),
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                  <label>
                    场次名称
                    <input
                      required
                      maxLength={80}
                      value={slot.label}
                      onChange={(e) => editSlot(index, 'label', e.target.value)}
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      开始时间
                      <input
                        type="datetime-local"
                        required
                        value={slot.startsAt}
                        onChange={(e) => editSlot(index, 'startsAt', e.target.value)}
                      />
                    </label>
                    <label>
                      结束时间
                      <input
                        type="datetime-local"
                        required
                        value={slot.endsAt}
                        onChange={(e) => editSlot(index, 'endsAt', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      席位数量
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        required
                        value={slot.capacity}
                        onChange={(e) => editSlot(index, 'capacity', e.target.value)}
                      />
                    </label>
                    <label>
                      票价（元）
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        step="0.01"
                        required
                        value={slot.price}
                        onChange={(e) => editSlot(index, 'price', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))}
              {!readonly && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={draft.slots.length >= 30}
                  onClick={() =>
                    edit('slots', [...draft.slots, { ...draft.slots[0]!, label: '新增场次' }])
                  }
                >
                  <Plus size={16} />
                  添加场次
                </button>
              )}
            </div>
          </section>
        </fieldset>
        <ErrorMessage
          error={save.error ?? publish.error ?? (validation ? new Error(validation) : null)}
        />
        {!readonly && (
          <div className="form-actions">
            <span className="text-muted">
              {saved ? (
                <>
                  <Check size={16} />
                  已保存
                </>
              ) : event ? (
                '发布使用最近保存的草稿。'
              ) : (
                '先保存草稿，再确认发布。'
              )}
            </span>
            <Link className="button secondary" to="/manage">
              <X size={16} />
              返回
            </Link>
            <button className="button secondary" type="submit" disabled={busy}>
              {save.isPending ? '保存中…' : '保存草稿'}
            </button>
            {event && (
              <button
                type="button"
                className="button primary"
                disabled={busy || JSON.stringify(draft) !== JSON.stringify(initialDraft(event))}
                onClick={() => publish.mutate()}
              >
                {publish.isPending ? '发布中…' : '发布活动'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </form>
    </>
  );
}

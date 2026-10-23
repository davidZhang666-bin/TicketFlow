import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowRight, MapPin, Users } from 'lucide-react';
import { eventListSchema } from '../../../../packages/contracts/src/index.js';
import type { EventCategory, EventView } from '../../../../packages/contracts/src/index.js';
import { request } from '../api.js';
import {
  ErrorMessage,
  Loading,
  State,
  EventPhoto,
  ImageCredit,
  categoryLabels,
  dateFormatter,
  timeFormatter,
  money,
} from '../ui.js';
export function Discover() {
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
export function EventCard({ event }: { event: EventView }) {
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

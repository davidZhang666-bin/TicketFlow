import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CircleAlert, Clock3, Users } from 'lucide-react';
import { eventViewSchema } from '../../../../packages/contracts/src/index.js';
import { request } from '../api.js';
import {
  ErrorMessage,
  Loading,
  State,
  EventPhoto,
  categoryLabels,
  dateFormatter,
  timeFormatter,
  money,
} from '../ui.js';
export function EventDetail() {
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

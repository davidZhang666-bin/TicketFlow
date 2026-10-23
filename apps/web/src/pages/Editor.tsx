import { useContext, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, X } from 'lucide-react';
import { z } from 'zod';
import { eventInputSchema, eventViewSchema } from '../../../../packages/contracts/src/index.js';
import type {
  EventCategory,
  EventInput,
  EventView,
} from '../../../../packages/contracts/src/index.js';
import { request } from '../api.js';
import { Auth } from '../auth-context.js';
import { ErrorMessage, Loading, State, categoryLabels, statusLabels } from '../ui.js';
import { RequireOrganizer } from './Manage.js';
export function toLocalInput(iso: string) {
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
export function initialDraft(event?: EventView): Draft {
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
export function Editor() {
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
export function EventForm({ event }: { event?: EventView }) {
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

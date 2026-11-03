'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { CATALOG } from '@/lib/catalog';
import { COLS, MAX_ROWS } from '@/lib/grid';
import type { Block, Notice, Photo, PropsOf } from '@/lib/schema';
import { useEditor } from '@/store/editor';
import { PayModal } from './PayModal';

const input = 'w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none';
const select = 'rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none';
const btn = 'rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50';
const primary = 'rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60';
const EMPTY_NOTICES: Notice[] = [];
const EMPTY_PHOTOS: Photo[] = [];

export function BlockPanel() {
  const id = useEditor((s) => s.selectedBlockId);
  const block = useEditor((s) => (s.selectedBlockId ? s.config.blocks[s.selectedBlockId] : undefined));
  const [paying, setPaying] = useState<string | null>(null);
  if (!id || !block) return <p className="text-sm text-neutral-500">미리보기에서 블록을 클릭하면 여기서 편집할 수 있어요.</p>;
  const def = CATALOG[block.type];
  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">{def.icon}</span>
        <div>
          <p className="font-semibold">{def.label}</p>
          <p className="text-xs text-neutral-400">블록 id {id} · 옮겨도 바뀌지 않아요</p>
        </div>
      </div>

      <RectForm id={id} />

      <PropsForm key={id} id={id} block={block} />

      {'feature' in block &&
        def.feature &&
        (block.feature.connected ? (
          block.type === 'notices' ? (
            <NoticesManager blockId={id} />
          ) : (
            <PhotosManager blockId={id} />
          )
        ) : (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="font-medium text-amber-900">{def.feature.label} 기능이 아직 연결되지 않았어요</p>
            <p className="mt-1 text-xs text-amber-800">{def.feature.description}</p>
            <button
              type="button"
              onClick={() => setPaying(id)}
              className="mt-3 w-full rounded-md bg-amber-500 py-2 font-medium text-white hover:bg-amber-600"
            >
              기능 연결 (유료)
            </button>
          </section>
        ))}

      {paying === id && <PayModal blockId={id} onClose={() => setPaying(null)} />}
    </div>
  );
}

// ---------- 위치·크기 (칸) ----------

const RECT_FIELDS = [
  ['x', '가로 위치'],
  ['y', '세로 위치'],
  ['w', '너비'],
  ['h', '높이'],
] as const;

// 숫자 입력·± 버튼 → 칸에 맞추고 겹친 블록은 아래로 민다 (store.setRect). 범위 밖은 clamp
function RectForm({ id }: { id: string }) {
  const rect = useEditor((s) => s.config.layout[id]);
  const setRect = useEditor((s) => s.setRect);
  if (!rect) return null;
  // 너비·높이를 바꿀 때는 위치를 지키고 판 끝까지만 늘린다
  const set = (k: (typeof RECT_FIELDS)[number][0], v: number) =>
    setRect(id, { ...rect, [k]: k === 'w' ? Math.min(v, COLS - rect.x) : k === 'h' ? Math.min(v, MAX_ROWS - rect.y) : v });
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-neutral-600">위치·크기 (칸)</h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {RECT_FIELDS.map(([k, label]) => (
          <div key={k}>
            <span className="mb-0.5 block text-[11px] text-neutral-500">
              {label} <span className="text-neutral-400">{k}</span>
            </span>
            <div className="flex overflow-hidden rounded-md border border-neutral-200">
              <button type="button" aria-label={`${label} 줄이기`} onClick={() => set(k, rect[k] - 1)} className="px-2 text-neutral-500 hover:bg-neutral-50">
                −
              </button>
              <input
                type="number"
                aria-label={label}
                value={rect[k]}
                onChange={(e) => {
                  if (!Number.isNaN(e.target.valueAsNumber)) set(k, e.target.valueAsNumber);
                }}
                className="w-full min-w-0 border-x border-neutral-200 px-1 py-1 text-center text-sm focus:outline-none"
              />
              <button type="button" aria-label={`${label} 늘리기`} onClick={() => set(k, rect[k] + 1)} className="px-2 text-neutral-500 hover:bg-neutral-50">
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- 블록별 props 폼 ----------

type Update = (patch: Partial<Block['props']>) => void;

function PropsForm({ id, block }: { id: string; block: Block }) {
  const updateProps = useEditor((s) => s.updateProps);
  const update: Update = (patch) => updateProps(id, patch);
  switch (block.type) {
    case 'nav':
      return <NavForm props={block.props} update={update} />;
    case 'profile':
      return <ProfileForm props={block.props} update={update} />;
    case 'text':
      return <TextForm props={block.props} update={update} />;
    case 'publications':
      return <PublicationsForm props={block.props} update={update} />;
    case 'notices':
      return <NoticesForm props={block.props} update={update} />;
    case 'photos':
      return <PhotosForm props={block.props} update={update} />;
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

function NavForm({ props, update }: { props: PropsOf<'nav'>; update: Update }) {
  const set = (i: number, value: string) => update({ items: props.items.map((x, j) => (j === i ? value : x)) });
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-neutral-600">메뉴 항목 (최대 8개)</span>
      {props.items.map((item, i) => (
        <div key={i} className="flex gap-1">
          <input className={input} value={item} maxLength={20} onChange={(e) => set(i, e.target.value)} />
          <button
            type="button"
            aria-label="항목 삭제"
            onClick={() => update({ items: props.items.filter((_, j) => j !== i) })}
            className="px-2 text-neutral-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      ))}
      {props.items.length < 8 && (
        <button type="button" className={btn} onClick={() => update({ items: [...props.items, '새 항목'] })}>
          + 항목 추가
        </button>
      )}
    </div>
  );
}

function ProfileForm({ props, update }: { props: PropsOf<'profile'>; update: Update }) {
  return (
    <div className="space-y-3">
      <Field label="이름">
        <input className={input} value={props.name} maxLength={80} onChange={(e) => update({ name: e.target.value })} />
      </Field>
      <Field label="직함">
        <input className={input} value={props.title} maxLength={80} onChange={(e) => update({ title: e.target.value })} />
      </Field>
      <Field label="소속">
        <input className={input} value={props.dept} maxLength={80} onChange={(e) => update({ dept: e.target.value })} />
      </Field>
      <Field label="이메일">
        <input className={input} type="email" value={props.email} maxLength={80} onChange={(e) => update({ email: e.target.value })} />
      </Field>
      <Field label="사진 주소 (URL)">
        <input
          className={input}
          type="url"
          placeholder="https://…"
          value={props.photoUrl}
          maxLength={500}
          onChange={(e) => update({ photoUrl: e.target.value })}
        />
      </Field>
    </div>
  );
}

function TextForm({ props, update }: { props: PropsOf<'text'>; update: Update }) {
  return (
    <div className="space-y-3">
      <Field label="제목">
        <input className={input} value={props.heading} maxLength={80} onChange={(e) => update({ heading: e.target.value })} />
      </Field>
      <Field label="본문">
        <textarea className={input} rows={6} value={props.body} maxLength={5000} onChange={(e) => update({ body: e.target.value })} />
      </Field>
    </div>
  );
}

const YEARS = Array.from({ length: 51 }, (_, k) => 2030 - k);

function PublicationsForm({ props, update }: { props: PropsOf<'publications'>; update: Update }) {
  type Row = PropsOf<'publications'>['items'][number];
  const setRow = (i: number, patch: Partial<Row>) => update({ items: props.items.map((row, j) => (j === i ? { ...row, ...patch } : row)) });
  return (
    <div className="space-y-3">
      <span className="block text-xs font-medium text-neutral-600">논문 (최대 100편)</span>
      {props.items.map((row, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-neutral-200 p-2.5">
          <input className={input} value={row.title} maxLength={300} placeholder="제목" onChange={(e) => setRow(i, { title: e.target.value })} />
          <div className="flex gap-1.5">
            <input className={input} value={row.venue} maxLength={120} placeholder="저널·학회" onChange={(e) => setRow(i, { venue: e.target.value })} />
            <select className={`${select} w-24 shrink-0`} value={row.year} onChange={(e) => setRow(i, { year: Number(e.target.value) })}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1.5">
            <input className={input} value={row.url} maxLength={500} placeholder="링크 (선택)" onChange={(e) => setRow(i, { url: e.target.value })} />
            <button
              type="button"
              aria-label="논문 삭제"
              onClick={() => update({ items: props.items.filter((_, j) => j !== i) })}
              className="px-2 text-neutral-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      {props.items.length < 100 && (
        <button type="button" className={btn} onClick={() => update({ items: [...props.items, { title: '', venue: '', year: 2026, url: '' }] })}>
          + 논문 추가
        </button>
      )}
    </div>
  );
}

function NoticesForm({ props, update }: { props: PropsOf<'notices'>; update: Update }) {
  return (
    <div className="space-y-3">
      <Field label="제목">
        <input className={input} value={props.heading} maxLength={80} onChange={(e) => update({ heading: e.target.value })} />
      </Field>
      <Field label="보여 줄 개수">
        <select className={`${select} w-full`} value={props.limit} onChange={(e) => update({ limit: Number(e.target.value) })}>
          {Array.from({ length: 20 }, (_, k) => k + 1).map((n) => (
            <option key={n} value={n}>
              {n}개
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function PhotosForm({ props, update }: { props: PropsOf<'photos'>; update: Update }) {
  return (
    <div className="space-y-3">
      <Field label="제목">
        <input className={input} value={props.heading} maxLength={80} onChange={(e) => update({ heading: e.target.value })} />
      </Field>
      <div>
        <span className="mb-1 block text-xs font-medium text-neutral-600">한 줄에 몇 장</span>
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-200">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ columns: n })}
              className={`py-2 ${props.columns === n ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50'}`}
            >
              {n}장
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 연결된 공지사항 블록의 콘텐츠 관리 ----------

function NoticesManager({ blockId }: { blockId: string }) {
  const siteId = useEditor((s) => s.config.siteId);
  const list = useEditor((s) => s.data.notices?.[blockId] ?? EMPTY_NOTICES);
  const addItem = useEditor((s) => s.addItem);
  const removeItem = useEditor((s) => s.removeItem);
  const showToast = useEditor((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, blockId, title: fd.get('title'), body: fd.get('body') }),
      });
      const json = (await res.json()) as Notice & { error?: string };
      if (!res.ok) throw new Error(json.error ?? '공지를 올리지 못했어요');
      addItem('notices', blockId, json); // 목록과 미리보기 즉시 갱신
      form.reset();
      showToast('공지를 올렸어요');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '공지를 올리지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  async function remove(noticeId: string) {
    const res = await fetch(`/api/notices/${noticeId}`, { method: 'DELETE' });
    if (!res.ok) {
      const json: { error?: string } = await res.json().catch(() => ({}));
      showToast(json.error ?? '공지를 지우지 못했어요');
      return;
    }
    removeItem('notices', blockId, noticeId);
  }

  return (
    <section className="space-y-3 rounded-lg border border-neutral-200 p-3">
      <h3 className="font-semibold">공지 올리기</h3>
      <form onSubmit={submit} className="space-y-2">
        <input name="title" required maxLength={120} placeholder="제목" className={input} />
        <textarea name="body" maxLength={5000} rows={3} placeholder="내용 (선택)" className={input} />
        <button type="submit" disabled={busy} className={`${primary} w-full`}>
          {busy ? '올리는 중…' : '공지 올리기'}
        </button>
      </form>
      <ul className="divide-y divide-neutral-100">
        {list.length === 0 && <li className="py-2 text-xs text-neutral-400">아직 올린 공지가 없어요</li>}
        {list.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{n.title}</p>
              <p className="text-xs text-neutral-400">{n.created_at.slice(0, 10)}</p>
            </div>
            <button type="button" onClick={() => void remove(n.id)} className="shrink-0 text-xs text-neutral-400 hover:text-red-600">
              삭제
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- 연결된 사진 블록의 콘텐츠 관리 ----------

function PhotosManager({ blockId }: { blockId: string }) {
  const siteId = useEditor((s) => s.config.siteId);
  const list = useEditor((s) => s.data.photos?.[blockId] ?? EMPTY_PHOTOS);
  const addItem = useEditor((s) => s.addItem);
  const removeItem = useEditor((s) => s.removeItem);
  const showToast = useEditor((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form); // file, caption
    fd.append('siteId', siteId);
    fd.append('blockId', blockId);
    setBusy(true);
    try {
      const res = await fetch('/api/photos', { method: 'POST', body: fd });
      const json = (await res.json()) as Photo & { error?: string };
      if (!res.ok) throw new Error(json.error ?? '사진을 올리지 못했어요');
      addItem('photos', blockId, json); // 썸네일과 미리보기 즉시 갱신
      form.reset();
      showToast('사진을 올렸어요');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '사진을 올리지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  async function remove(photoId: string) {
    const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
    if (!res.ok) {
      const json: { error?: string } = await res.json().catch(() => ({}));
      showToast(json.error ?? '사진을 지우지 못했어요');
      return;
    }
    removeItem('photos', blockId, photoId);
  }

  return (
    <section className="space-y-3 rounded-lg border border-neutral-200 p-3">
      <h3 className="font-semibold">사진 올리기</h3>
      <form onSubmit={submit} className="space-y-2">
        <input
          type="file"
          name="file"
          required
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="block w-full text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium hover:file:bg-neutral-200"
        />
        <input name="caption" maxLength={200} placeholder="설명 (선택)" className={input} />
        <button type="submit" disabled={busy} className={`${primary} w-full`}>
          {busy ? '올리는 중…' : '사진 올리기'}
        </button>
      </form>
      <p className="text-[11px] text-neutral-400">JPG·PNG·GIF·WEBP, 10MB까지</p>
      {list.length === 0 ? (
        <p className="text-xs text-neutral-400">아직 올린 사진이 없어요</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {list.map((p) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption || '사진'} className="aspect-square w-full rounded-md bg-neutral-100 object-cover" />
              <button
                type="button"
                onClick={() => void remove(p.id)}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-600"
              >
                삭제
              </button>
              {p.caption && <p className="mt-0.5 truncate text-[11px] text-neutral-500">{p.caption}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

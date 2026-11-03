'use client';

import { useEffect, useRef, useState } from 'react';
import { CATALOG } from '@/lib/catalog';
import { useEditor } from '@/store/editor';

// 5.3 결제 모달 (가짜). 1초 스피너 → POST /connect → 연결됨 + 토스트. 실제 결제 없음.
export function PayModal({ blockId, onClose }: { blockId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const siteId = useEditor((s) => s.config.siteId);
  const block = useEditor((s) => s.config.blocks[blockId]);
  const connectBlock = useEditor((s) => s.connectBlock);
  const setNotices = useEditor((s) => s.setNotices);
  const showToast = useEditor((s) => s.showToast);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  if (!block) return null;
  const def = CATALOG[block.type];
  const feature = def.feature;
  if (!feature) return null;
  const type = block.type;

  async function pay() {
    setPaying(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 1000)); // 결제 흉내 (1초 스피너)
    // TODO: PG 연동 지점 — 실제 결제가 성공했을 때만 아래 연결 요청을 보낸다
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId }),
      });
      const json: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? '연결하지 못했어요');
      connectBlock(blockId);
      if (type === 'notices') setNotices(blockId, []);
      showToast(type === 'notices' ? '연결됐어요. 이제 공지를 올릴 수 있어요' : '연결됐어요. 이제 사진을 올릴 수 있어요');
      ref.current?.close(); // → onClose
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결하지 못했어요');
      setPaying(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[400px] max-w-[calc(100vw-2rem)] rounded-xl border-0 p-0 text-neutral-900 shadow-xl"
    >
      <div className="p-6">
        <h2 className="text-lg font-bold">
          {def.label}에 {feature.label}를 연결할까요?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">
          {feature.description}
          <br />
          공개 페이지에도 바로 반영돼요.
        </p>
        <p className="mt-4 text-2xl font-bold">
          ₩00,000 <span className="text-sm font-normal text-neutral-500">(1회)</span>
        </p>
        <p className="mt-1 text-xs text-neutral-400">블록 구성은 계속 무료예요</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => void pay()}
            disabled={paying}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            {paying && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {paying ? '결제 중…' : '결제하고 연결하기'}
          </button>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={paying}
            className="rounded-md border border-neutral-200 px-4 py-2.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            나중에
          </button>
        </div>
      </div>
    </dialog>
  );
}

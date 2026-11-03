import type { Metadata } from 'next';
import { getSite } from '@/lib/db';
import { emptyConfig } from '@/lib/seed';
import { Editor } from './Editor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '편집기 · 블록 홈페이지' };

export default async function EditorPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  // 없는 siteId면 빈 사이트로 시작. 첫 변경이 저장될 때 만들어진다.
  const config = (await getSite(siteId)) ?? emptyConfig(siteId);
  return <Editor key={siteId} initial={config} />;
}

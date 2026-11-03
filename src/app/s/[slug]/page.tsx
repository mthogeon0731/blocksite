import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSiteBySlug, loadBlockData } from '@/lib/db';
import { SiteRenderer } from '@/renderer/SiteRenderer';

export const dynamic = 'force-dynamic'; // 매 요청 DB 읽기, 캐시 없음

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = await getSiteBySlug(slug);
  return { title: config?.title ?? '사이트를 찾을 수 없어요' };
}

export default async function PublicSite({ params }: Props) {
  const { slug } = await params;
  const config = await getSiteBySlug(slug);
  if (!config) notFound();
  // 연결된 블록은 DB 데이터, 미연결 블록은 렌더러가 샘플을 그린다 (배지 없이)
  const data = await loadBlockData(config);
  return <SiteRenderer config={config} data={data} mode="public" />;
}

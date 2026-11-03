import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSiteBySlug } from '@/lib/db';
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
  // 1단계: 연결된 블록이 없으므로 data는 비어 있다. 2·3단계에서 공지·사진을 넣는다.
  return <SiteRenderer config={config} data={{}} mode="public" />;
}

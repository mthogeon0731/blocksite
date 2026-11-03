import { NextResponse, type NextRequest } from 'next/server';
import { requireEditor } from '@/lib/auth';
import { addNotice, listNotices } from '@/lib/db';
import { NoticeInputSchema } from '@/lib/schema';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

// GET /api/notices?siteId&blockId → 최신순 목록
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  const blockId = req.nextUrl.searchParams.get('blockId');
  if (!siteId || !blockId) return bad('siteId와 blockId가 필요해요');
  return NextResponse.json(await listNotices(siteId, blockId));
}

// POST /api/notices {siteId, blockId, title, body} → 블록 존재 + 연결됨일 때만
export async function POST(req: NextRequest) {
  const denied = requireEditor(req);
  if (denied) return denied;
  const parsed = NoticeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? '입력이 올바르지 않아요');
  const result = await addNotice(parsed.data);
  if ('error' in result) return bad(result.error, result.status);
  return NextResponse.json(result, { status: 201 });
}

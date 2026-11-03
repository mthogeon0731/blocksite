import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireEditor } from '@/lib/auth';
import { connectBlock } from '@/lib/db';

const Body = z.object({ blockId: z.string().min(1) });

// 기능 연결 (유료 흉내). config.blocks[id].feature.connected = true
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireEditor(req);
  if (denied) return denied;

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'blockId가 필요해요' }, { status: 400 });

  // TODO: PG 연동 지점 — 결제 검증이 성공한 뒤에만 연결한다
  const result = await connectBlock(id, parsed.data.blockId);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, connected: true });
}

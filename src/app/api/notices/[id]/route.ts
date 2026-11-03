import { NextResponse, type NextRequest } from 'next/server';
import { requireEditor } from '@/lib/auth';
import { deleteNotice } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireEditor(req);
  if (denied) return denied;
  const { id } = await params;
  const ok = await deleteNotice(id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: '공지를 찾을 수 없어요' }, { status: 404 });
}

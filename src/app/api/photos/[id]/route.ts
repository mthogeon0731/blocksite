import { NextResponse, type NextRequest } from 'next/server';
import { requireEditor } from '@/lib/auth';
import { deletePhoto } from '@/lib/db';

// DELETE /api/photos/[id] → 행 + 파일 삭제
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireEditor(req);
  if (denied) return denied;
  const { id } = await params;
  const ok = await deletePhoto(id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: '사진을 찾을 수 없어요' }, { status: 404 });
}

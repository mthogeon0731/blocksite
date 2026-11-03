import { promises as fs } from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/db';

// 로컬 업로드 파일 서빙: /uploads/{site_id}/{block_id}/{uuid}.{ext}
// Supabase Storage(공개 버킷)로 바꾸면 이 라우트는 필요 없다.
const SAFE = /^[\w-]+\/[\w-]+\/[\w-]+\.(jpe?g|png|gif|webp)$/i;
const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join('/');
  if (!SAFE.test(rel)) return new Response('Not found', { status: 404 }); // 경로 탈출 방지
  try {
    const bytes = await fs.readFile(path.join(UPLOAD_DIR, rel));
    const ext = rel.slice(rel.lastIndexOf('.') + 1).toLowerCase();
    return new Response(bytes, {
      headers: { 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

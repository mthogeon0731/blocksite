import { NextResponse, type NextRequest } from 'next/server';
import { requireEditor } from '@/lib/auth';
import { addPhoto, listPhotos } from '@/lib/db';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MAX_BYTES = 10 * 1024 * 1024;
// SVG는 스크립트를 담을 수 있어 제외. 브라우저가 그대로 보여 주는 래스터 형식만.
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

// GET /api/photos?siteId&blockId → 최신순 목록 (공개 URL 포함)
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  const blockId = req.nextUrl.searchParams.get('blockId');
  if (!siteId || !blockId) return bad('siteId와 blockId가 필요해요');
  return NextResponse.json(await listPhotos(siteId, blockId));
}

// POST /api/photos  multipart {siteId, blockId, file, caption} → 연결된 사진 블록에만, 10MB 이하
export async function POST(req: NextRequest) {
  const denied = requireEditor(req);
  if (denied) return denied;

  const form = await req.formData().catch(() => null);
  if (!form) return bad('사진은 multipart/form-data로 보내 주세요');
  const file = form.get('file');
  const siteId = form.get('siteId');
  const blockId = form.get('blockId');
  const caption = form.get('caption') ?? '';
  if (!(file instanceof File)) return bad('사진 파일을 골라 주세요');
  if (typeof siteId !== 'string' || typeof blockId !== 'string' || !siteId || !blockId) return bad('siteId와 blockId가 필요해요');
  if (typeof caption !== 'string' || caption.length > 200) return bad('설명은 200자까지예요');
  const ext = EXT[file.type];
  if (!ext) return bad('JPG, PNG, GIF, WEBP 사진만 올릴 수 있어요');
  if (file.size === 0) return bad('빈 파일이에요');
  if (file.size > MAX_BYTES) return bad('사진은 10MB까지 올릴 수 있어요');

  const result = await addPhoto({ siteId, blockId, caption: caption.trim(), ext, bytes: Buffer.from(await file.arrayBuffer()) });
  if ('error' in result) return bad(result.error, result.status);
  return NextResponse.json(result, { status: 201 });
}

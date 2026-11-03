import { NextResponse, type NextRequest } from 'next/server';
import { requireEditor } from '@/lib/auth';
import { getSite, getSiteBySlug, putSite } from '@/lib/db';
import { SiteConfigSchema } from '@/lib/schema';
import { validateConfig } from '@/lib/grid';

type Ctx = { params: Promise<{ id: string }> };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const config = await getSite(id);
  return config ? NextResponse.json(config) : bad('사이트를 찾을 수 없어요', 404);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const denied = requireEditor(req);
  if (denied) return denied;

  const { id } = await params;
  const body: unknown = await req.json().catch(() => null);
  const parsed = SiteConfigSchema.safeParse(body); // v2만 받는다 (v1 변환은 저장소 읽기에서만)
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return bad(`설정 형식이 올바르지 않아요: ${issue.path.join('.')} ${issue.message}`.trim());
  }
  const config = parsed.data;
  if (config.siteId !== id) return bad('주소의 사이트 id와 내용의 siteId가 달라요');

  const why = validateConfig(config); // R4′: 판 규칙(겹침·최소 크기·싱글턴·개수·키 일치) 위반은 서버에서도 거부
  if (why) return bad(why);

  const sameSlug = await getSiteBySlug(config.slug);
  if (sameSlug && sameSlug.siteId !== id) return bad('이미 다른 사이트가 쓰는 주소(slug)예요');

  // 기능 연결 상태 유지와 "데이터 있는 블록 삭제 금지"는 저장소 안에서 처리한다 (db.putSite)
  const result = await putSite(config);
  if ('error' in result) return bad(result.error, result.status);
  return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
}

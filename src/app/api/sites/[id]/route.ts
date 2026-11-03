import { NextResponse, type NextRequest } from 'next/server';
import { requireEditor } from '@/lib/auth';
import { getSite, getSiteBySlug, putSite } from '@/lib/db';
import { SiteConfigSchema } from '@/lib/schema';
import { validateConfig } from '@/lib/slots';

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
  const parsed = SiteConfigSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return bad(`설정 형식이 올바르지 않아요: ${issue.path.join('.')} ${issue.message}`.trim());
  }
  const config = parsed.data;
  if (config.siteId !== id) return bad('주소의 사이트 id와 내용의 siteId가 달라요');

  const why = validateConfig(config); // R4: 규칙표 위반은 서버에서도 거부
  if (why) return bad(why);

  const sameSlug = await getSiteBySlug(config.slug);
  if (sameSlug && sameSlug.siteId !== id) return bad('이미 다른 사이트가 쓰는 주소(slug)예요');

  // 기능 연결 상태는 PUT으로 바꿀 수 없다. 저장된 값을 유지한다 (연결은 POST /connect 전용, 2단계).
  const prev = await getSite(id);
  for (const [blockId, block] of Object.entries(config.blocks)) {
    if (!('feature' in block)) continue;
    const old = prev?.blocks[blockId];
    block.feature.connected = old && 'feature' in old ? old.feature.connected : false;
  }

  const updatedAt = await putSite(config);
  return NextResponse.json({ ok: true, updatedAt });
}

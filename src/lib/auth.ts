import { NextResponse, type NextRequest } from 'next/server';

// 쓰기 라우트 보호. EDITOR_KEY가 설정된 경우에만 검사한다 (로컬 개발은 미설정 → 통과).
// 편집기는 ?key=… 를 받아 editor_key 쿠키에 저장한다 (Editor.tsx).
export function requireEditor(req: NextRequest): NextResponse | null {
  const key = process.env.EDITOR_KEY;
  if (!key) return null;
  if (req.cookies.get('editor_key')?.value === key) return null;
  return NextResponse.json(
    { error: '편집 권한이 없어요. 편집기 주소 뒤에 ?key=… 를 붙여 다시 열어 주세요.' },
    { status: 401 },
  );
}

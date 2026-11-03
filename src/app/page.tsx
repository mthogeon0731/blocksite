import Link from 'next/link';

const card = 'block rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50';

export default function Home() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold">
        블록 홈페이지 <span className="text-base font-normal text-neutral-500">시제품</span>
      </h1>
      <p className="mt-2 text-neutral-600">
        블록을 골라 조합하고, 바뀌는 모습을 바로 보면서 홈페이지를 만들어요. AI 없이 정해진 규칙으로만 동작해요.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <Link href="/editor/site_kimlab" className={card}>
            <b>김OO 연구실</b> 편집기 열기
            <span className="block text-sm text-neutral-500">시드 사이트. 블록 이동·스타일을 바로 시험해 볼 수 있어요</span>
          </Link>
        </li>
        <li>
          <Link href="/s/kim-lab" className={card}>
            <b>김OO 연구실</b> 공개 페이지 보기
          </Link>
        </li>
        <li>
          <Link href="/editor/demo" className={card}>
            <b>빈 사이트</b>로 시작하기
            <span className="block text-sm text-neutral-500">데모 1번: 탭 메뉴 → 프로필 추가</span>
          </Link>
        </li>
      </ul>
    </main>
  );
}

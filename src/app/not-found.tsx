import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-neutral-600">주소가 맞는지 확인해 주세요.</p>
      <Link href="/" className="mt-6 inline-block text-indigo-700 underline underline-offset-4">
        처음으로
      </Link>
    </main>
  );
}

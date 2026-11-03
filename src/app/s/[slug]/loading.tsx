// 공개 페이지 로딩 스켈레톤
export default function SiteLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-neutral-50">
      <div className="h-14 bg-neutral-200" />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-3">
        <div className="h-80 rounded-xl bg-neutral-200" />
        <div className="space-y-6 md:col-span-2">
          <div className="h-40 rounded-xl bg-neutral-200" />
          <div className="h-40 rounded-xl bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

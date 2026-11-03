// 편집기 로딩 스켈레톤 (DB를 읽는 동안 3단 레이아웃 자리만 보여 준다)
export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col bg-neutral-100">
      <div className="h-12 shrink-0 border-b border-neutral-200 bg-white" />
      <div className="flex min-h-0 flex-1 animate-pulse">
        <div className="w-60 shrink-0 space-y-3 border-r border-neutral-200 bg-white p-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100" />
          ))}
        </div>
        <div className="flex-1 p-6 pt-12">
          <div className="mx-auto max-w-5xl space-y-4 rounded-xl bg-white p-4 ring-1 ring-neutral-200">
            <div className="h-12 rounded-lg bg-neutral-100" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-72 rounded-lg bg-neutral-100" />
              <div className="h-72 rounded-lg bg-neutral-100 md:col-span-2" />
            </div>
          </div>
        </div>
        <div className="w-[300px] shrink-0 border-l border-neutral-200 bg-white" />
      </div>
    </div>
  );
}

import { Spark } from "@/components/logo";

export default function Loading() {
  return (
    <div className="grid min-h-[70dvh] place-items-center" role="status" aria-label="Carregando">
      <div className="flex flex-col items-center gap-4">
        <Spark className="size-10 animate-pulse text-ink motion-reduce:animate-none" />
        <span className="text-sm text-ink-3">Acendendo…</span>
      </div>
    </div>
  );
}

import { Logo } from "@/components/logo";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="wrap flex flex-col gap-6 py-10 text-sm text-ink-2 md:flex-row md:items-center md:justify-between">
        <Logo className="opacity-90" />
        <p className="max-w-xl text-pretty">{brand.footer}</p>
        <p className="text-ink-3">
          Aperte <span className="font-mono">?</span> para ver os atalhos
        </p>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { Wizard } from "@/components/wizard/wizard";

export const metadata: Metadata = {
  title: "Montar meu kit",
  description: "Descreva seu SaaS e monte um kit de agentes, skills e MCPs para o Claude Code.",
};

export default function MontarPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <Wizard />
      </main>
    </>
  );
}

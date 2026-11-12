import { ShieldCheck, ListChecks, KeyRound } from "lucide-react";
import Link from "next/link";
import { Faq } from "@/components/landing/faq";
import { HeroTree } from "@/components/landing/hero-tree";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { catalogStats, mcps } from "@/data/catalog";

const STEPS = [
  {
    title: "Descreva seu produto",
    text: "Nome, o problema que resolve, para quem é e em que fase está. Se ainda não tem projeto, bastam três respostas.",
  },
  {
    title: "Escolha o que entra no kit",
    text: "O Lume sugere agentes, skills e MCPs do catálogo e explica por que cada um serve para o seu SaaS. Você monta o carrinho.",
  },
  {
    title: "Baixe e solte na pasta",
    text: "O zip vem com o contexto do seu SaaS, LEIA-ME no seu nível técnico e um prompt de ativação que faz o Claude Code adaptar tudo ao projeto.",
  },
];

export default function Home() {
  const verifiedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${mcps[0]?.verifiedAt ?? "2026-11-12"}T12:00:00Z`),
  );
  return (
    <>
      <SiteHeader landing />
      <main id="conteudo">
        {/* Hero */}
        <section className="wrap grid items-center gap-14 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28">
          <div>
            <h1 className="font-display text-[clamp(3.1rem,8.4vw,6.4rem)] font-bold leading-[0.92] tracking-[-0.045em] [font-stretch:88%] text-balance">
              {brand.tagline}
            </h1>
            <p className="mt-7 max-w-[34rem] text-pretty text-lg leading-relaxed text-ink-2 sm:text-xl">
              {brand.heroSubtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/montar">{brand.copy.heroCta}</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#como-funciona">Ver como funciona</a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-ink-3">Sem cadastro. Seu kit é montado no navegador e baixado em um .zip.</p>
          </div>
          <HeroTree />
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="wrap py-20 lg:py-28">
            <h2 className="max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
              Três passos entre a ideia e o Claude Code trabalhando
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative border-t-2 border-ink pt-6">
                  <span className="font-display text-6xl font-bold leading-none tracking-tighter text-ink [font-stretch:80%]">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-pretty leading-relaxed text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Dois modos */}
        <section className="wrap grid gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
              Com projeto ou do zero
            </h2>
            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-ink-2">
              O kit muda conforme o seu ponto de partida. Nos dois casos, o Claude pede sua aprovação antes de mexer em
              qualquer coisa.
            </p>
          </div>
          <div className="grid gap-4">
            <article className="rounded-3xl border border-line p-7">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Já tenho um projeto</h3>
              <p className="mt-3 text-pretty leading-relaxed text-ink-2">
                O Claude lê seu código, escreve um brief curto, adapta agentes e skills aos seus caminhos e comandos e
                propõe um plano na ordem certa.
              </p>
            </article>
            <article className="rounded-3xl border border-ink bg-ink p-7 text-bg">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Vou começar do zero</h3>
              <p className="mt-3 text-pretty leading-relaxed opacity-80">
                O kit liga o Modo Descoberta: antes de escrever uma linha, o Claude entrevista você sobre cliente, MVP,
                preço, stack e prazo, em blocos curtos, e só constrói depois do brief aprovado.
              </p>
            </article>
          </div>
        </section>

        {/* Honestidade */}
        <section className="border-y border-line bg-surface">
          <div className="wrap py-16">
            <ul className="grid gap-10 md:grid-cols-3">
              <li>
                <ListChecks className="size-6 text-ink" aria-hidden />
                <h3 className="mt-4 font-semibold">Catálogo curado</h3>
                <p className="mt-2 text-pretty text-ink-2">
                  {catalogStats.agents} agentes, {catalogStats.skills} skills e {catalogStats.mcps} MCPs. As sugestões
                  saem sempre desse catálogo; nada de itens ou comandos inventados.
                </p>
              </li>
              <li>
                <ShieldCheck className="size-6 text-ink" aria-hidden />
                <h3 className="mt-4 font-semibold">MCPs verificados</h3>
                <p className="mt-2 text-pretty text-ink-2">
                  Conferidos na documentação oficial em {verifiedAt}: {mcps.map((m) => m.name).join(", ")}.
                </p>
              </li>
              <li>
                <KeyRound className="size-6 text-ink" aria-hidden />
                <h3 className="mt-4 font-semibold">Nenhum segredo no zip</h3>
                <p className="mt-2 text-pretty text-ink-2">
                  Credenciais só como variáveis de ambiente, com o .env.example vazio e instruções para preencher no seu
                  computador.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="perguntas" className="wrap scroll-mt-20 grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
            Perguntas frequentes
          </h2>
          <Faq />
        </section>

        <section className="wrap pb-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-brand px-8 py-10 text-brand-ink sm:flex-row sm:items-center sm:px-12">
            <p className="max-w-lg font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Seu SaaS merece um time que já chega sabendo o que fazer.
            </p>
            <Button asChild size="lg" variant="ink">
              <Link href="/montar">{brand.copy.heroCta}</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

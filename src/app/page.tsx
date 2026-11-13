import {
  ArrowRight,
  Boxes,
  Bug,
  Code2,
  Compass,
  FileText,
  Gem,
  Hammer,
  KeyRound,
  ListChecks,
  MousePointer2,
  Palette,
  Plug,
  ShieldCheck,
  Sparkles,
  Sprout,
  Terminal,
  Users,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Faq } from "@/components/landing/faq";
import { HeroTree } from "@/components/landing/hero-tree";
import { Spark } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/config/brand";
import { catalogStats, mcps } from "@/data/catalog";

const TOOLS: { label: string; icon: LucideIcon }[] = [
  { label: "Claude Code", icon: Sparkles },
  { label: "Codex", icon: Terminal },
  { label: "Gemini CLI", icon: Gem },
  { label: "Cursor", icon: MousePointer2 },
  { label: "Grok Build", icon: Code2 },
  { label: "Qualquer IA com AGENTS.md", icon: Boxes },
];

const STEPS = [
  {
    title: "Conte o que você está fazendo",
    text: "Um SaaS ou um site, o que ele faz e para quem. Cole sites que você acha bonitos, se quiser: o Lume lê e entrega para o agente de design.",
  },
  {
    title: "Escolha o que entra no kit",
    text: "O Lume sugere agentes, skills e MCPs do catálogo e explica por que cada um serve para o seu projeto. Você monta o carrinho e escolhe a sua IA.",
  },
  {
    title: "Baixe e solte na pasta",
    text: "O zip vem no formato da IA que você usa, com o contexto do projeto, o método de trabalho e um prompt de ativação que adapta tudo ao seu código.",
  },
];

const KINDS: { icon: LucideIcon; title: string; text: string; dark?: boolean }[] = [
  {
    icon: Hammer,
    title: "Já tenho um projeto",
    text: "A IA lê o seu código, escreve um brief curto, adapta agentes e skills aos seus caminhos e comandos e propõe um plano na ordem certa.",
  },
  {
    icon: Sprout,
    title: "Vou começar do zero",
    text: "Modo Descoberta: antes de escrever uma linha, a IA entrevista você em blocos curtos e só constrói depois do brief aprovado.",
    dark: true,
  },
  {
    icon: Bug,
    title: "Consertar um erro",
    text: "Modo Conserto: reproduz o erro, mostra a causa com arquivo e linha, corrige o mínimo e deixa um teste para ele não voltar.",
  },
  {
    icon: Zap,
    title: "Atualização rápida",
    text: "Modo Ajuste Rápido: uma mudança curta e bem definida, com plano aprovado antes, escopo fechado e resumo do que mudou.",
  },
];

const INSIDE: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileText, title: "Contexto do projeto", text: "O que o produto faz, para quem, stack, regras e o que não fazer, no arquivo que a sua IA lê primeiro." },
  { icon: Users, title: "Agentes especialistas", text: "Suporte, copy, segurança, testes, design e mais, cada um com quando usar, passo a passo e verificação." },
  { icon: Wand2, title: "Skills com passo a passo", text: "Checklists e roteiros testados que a IA segue em vez de improvisar: LGPD, SEO, deploy, PRD." },
  { icon: Compass, title: "Método Lume", text: "Entender, investigar, planejar, executar pequeno, verificar e registrar. A IA é o motor; o método é o volante." },
  { icon: Plug, title: "Conexões que a IA pede", text: "Usa Vercel, GitHub ou Stripe? A IA confere o que está conectado e pede para ligar o que falta, sem pedir senha no chat." },
  { icon: Palette, title: "Referências visuais", text: "Os sites que você acha bonitos viram material de estudo: fontes, cores, estrutura e código, para inspirar sem copiar." },
];

/** Título que sobe palavra por palavra. */
function Rise({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={`${w}-${i}`} className="rise">
          <span style={{ "--d": `${start + i * 90}ms` } as React.CSSProperties}>{w}&nbsp;</span>
        </span>
      ))}
    </>
  );
}

function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-ink-3">
      <span className="font-mono text-ink">{n}</span>
      <span className="h-px w-8 bg-line-strong" aria-hidden />
      {children}
    </p>
  );
}

export default function Home() {
  const verifiedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${mcps[0]?.verifiedAt ?? "2026-11-12"}T12:00:00Z`),
  );
  return (
    <>
      <SiteHeader landing />
      <main id="conteudo" className="-mt-[4.25rem]">
        {/* Herói */}
        <section aria-labelledby="hero-title" className="relative overflow-hidden">
          <div aria-hidden className="halo pointer-events-none absolute inset-x-0 top-0 h-[44rem]" />
          <div aria-hidden className="dots pointer-events-none absolute inset-x-0 top-0 h-[40rem]" />
          <div className="wrap relative flex flex-col items-center pt-36 text-center sm:pt-44">
            <p className="fade-in inline-flex items-center gap-2 rounded-full border border-line bg-bg/70 py-1 pl-1 pr-3.5 text-[0.8rem] text-ink-2 backdrop-blur">
              <Spark className="size-6" />
              Para Claude Code, Codex, Gemini, Cursor e Grok
            </p>
            <h1
              id="hero-title"
              className="font-display mt-7 max-w-5xl text-balance text-[clamp(3rem,9vw,6.6rem)] font-medium leading-[0.98] tracking-[-0.055em]"
            >
              <span className="sr-only">{brand.tagline}</span>
              <span aria-hidden>
                <Rise text="Acenda o seu" />
                <br />
                <Rise text="projeto." start={300} />
              </span>
            </h1>
            <p
              className="fade-in mt-7 max-w-[40rem] text-pretty text-lg leading-relaxed text-ink-3 sm:text-xl"
              style={{ "--d": "450ms" } as React.CSSProperties}
            >
              {brand.heroSubtitle}
            </p>
            <div className="fade-in mt-9 flex flex-col items-center gap-5 sm:flex-row" style={{ "--d": "600ms" } as React.CSSProperties}>
              <Link
                href="/montar"
                className="ring-glow sheen group inline-flex h-14 items-center gap-3 rounded-full bg-ink pl-7 pr-2 text-base font-medium text-bg shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)] transition-transform active:scale-[0.98]"
              >
                {brand.copy.heroCta}
                <span className="grid size-10 place-items-center rounded-full bg-brand text-brand-ink transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
              <a href="#como-funciona" className="text-[0.95rem] text-ink underline decoration-ink/25 underline-offset-[6px] transition hover:decoration-ink">
                Ver como funciona
              </a>
            </div>
            <p className="fade-in mt-5 flex items-center gap-2.5 text-sm text-ink-3" style={{ "--d": "700ms" } as React.CSSProperties}>
              <span>Grátis</span>
              <span aria-hidden className="size-1 rounded-full bg-brand" />
              <span>Sem conta</span>
              <span aria-hidden className="size-1 rounded-full bg-brand" />
              <span>Montado no seu navegador</span>
            </p>
          </div>

          {/* Prévia do kit */}
          <div className="wrap relative mt-16 pb-10 sm:mt-20">
            <div aria-hidden className="pointer-events-none absolute inset-x-10 -top-10 bottom-0 -z-0 rounded-full bg-[radial-gradient(50%_55%_at_50%_45%,color-mix(in_oklab,var(--brand)_28%,transparent),transparent_70%)] blur-2xl" />
            <div className="fade-in relative mx-auto max-w-3xl" style={{ "--d": "800ms" } as React.CSSProperties}>
              <div className="float">
                <HeroTree />
              </div>
              <span className="float absolute -left-6 top-16 hidden rounded-2xl border border-line bg-bg/90 px-3.5 py-2.5 text-sm shadow-lift backdrop-blur md:flex md:items-center md:gap-2" style={{ animationDelay: "-2s" }}>
                <Compass className="size-4 text-ink-3" aria-hidden />
                Método Lume incluído
              </span>
              <span className="float absolute -right-8 bottom-16 hidden rounded-2xl border border-line bg-bg/90 px-3.5 py-2.5 text-sm shadow-lift backdrop-blur md:flex md:items-center md:gap-2" style={{ animationDelay: "-4s" }}>
                <KeyRound className="size-4 text-ink-3" aria-hidden />
                Nenhum segredo no zip
              </span>
            </div>
          </div>
        </section>

        {/* Ferramentas */}
        <section aria-label="Funciona com" className="border-y border-line bg-surface/60 py-6">
          <div className="wrap flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <span className="shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-ink-3">Funciona com</span>
            <div className="marquee w-full overflow-hidden">
              <div className="flex w-max gap-3">
                {[...TOOLS, ...TOOLS].map((t, i) => (
                  <span
                    key={`${t.label}-${i}`}
                    aria-hidden={i >= TOOLS.length}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-4 py-2 text-sm font-medium"
                  >
                    <t.icon className="size-4 text-ink-3" aria-hidden />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="wrap scroll-mt-24 py-24 lg:py-32">
          <Reveal className="grid gap-8 lg:grid-cols-2 lg:gap-24">
            <div>
              <Eyebrow n="01">Como funciona</Eyebrow>
              <h2 className="font-display mt-5 text-balance text-4xl font-medium leading-[1.05] sm:text-5xl">
                Três passos entre a ideia e a IA trabalhando do seu jeito.
              </h2>
            </div>
            <p className="self-end text-pretty text-lg leading-relaxed text-ink-3">
              O Lume não é mais um chat. Ele monta o time, o contexto e o método, e a IA que você já usa faz o trabalho.
            </p>
          </Reveal>
          <ol className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 120} className="group bg-bg p-8 sm:p-10">
                <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 text-xl font-medium tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-3 text-pretty leading-relaxed text-ink-3">{s.text}</p>
                <span aria-hidden className="mt-8 block h-0.5 w-10 origin-left bg-brand transition-transform duration-500 group-hover:scale-x-[2.5]" />
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Tipos de kit */}
        <section className="wrap pb-24 lg:pb-32">
          <Reveal className="grid gap-8 lg:grid-cols-2 lg:gap-24">
            <div>
              <Eyebrow n="02">Para cada momento</Eyebrow>
              <h2 className="font-display mt-5 text-balance text-4xl font-medium leading-[1.05] sm:text-5xl">
                Construir, adaptar, consertar ou ajustar.
              </h2>
            </div>
            <p className="self-end text-pretty text-lg leading-relaxed text-ink-3">
              Serve para SaaS e para sites comuns: landing, institucional, portfólio, blog ou loja. Em todos os casos, a IA pede sua
              aprovação antes de mexer no que importa.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {KINDS.map((k, i) => (
              <Reveal
                as="article"
                key={k.title}
                delay={i * 90}
                className={
                  k.dark
                    ? "lift relative overflow-hidden rounded-3xl border border-[#0c0c0b] bg-[#0c0c0b] p-8 text-white [[data-theme=dark]_&]:border-white/10"
                    : "lift rounded-3xl border border-line bg-bg p-8"
                }
              >
                {k.dark && (
                  <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand/25 blur-3xl" />
                )}
                <span
                  className={
                    k.dark
                      ? "relative grid size-11 place-items-center rounded-2xl bg-brand text-brand-ink"
                      : "grid size-11 place-items-center rounded-2xl bg-surface-2 text-ink"
                  }
                >
                  <k.icon className="size-5" aria-hidden />
                </span>
                <h3 className="relative mt-8 text-2xl font-medium tracking-[-0.03em]">{k.title}</h3>
                <p className={k.dark ? "relative mt-3 text-pretty leading-relaxed opacity-75" : "mt-3 text-pretty leading-relaxed text-ink-3"}>
                  {k.text}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* O que vem no kit */}
        <section className="relative overflow-hidden bg-[#0c0c0b] py-24 text-white lg:py-32">
          <div aria-hidden className="pointer-events-none absolute -right-40 top-10 size-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_22%,transparent),transparent)]" />
          <div className="wrap relative">
            <Reveal className="max-w-2xl">
              <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] opacity-60">
                <span className="font-mono">03</span>
                <span className="h-px w-8 bg-current opacity-40" aria-hidden />O que vem no kit
              </p>
              <h2 className="font-display mt-5 text-balance text-4xl font-medium leading-[1.05] sm:text-5xl">
                A IA é o motor. <span className="text-brand">O Lume é o resto.</span>
              </h2>
            </Reveal>
            <ul className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {INSIDE.map((f, i) => (
                <Reveal as="li" key={f.title} delay={(i % 3) * 100} className="group bg-[#0c0c0b] p-8 transition-colors duration-300 hover:bg-white/[0.03] sm:p-10">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/[0.06] text-brand ring-1 ring-inset ring-white/10 transition-transform duration-300 group-hover:-translate-y-0.5">
                    <f.icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-6 text-lg font-medium">{f.title}</h3>
                  <p className="mt-2 text-pretty text-[0.95rem] leading-relaxed opacity-65">{f.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Confiança */}
        <section className="wrap py-24 lg:py-32">
          <Reveal>
            <Eyebrow n="04">Sem pegadinha</Eyebrow>
            <h2 className="font-display mt-5 max-w-3xl text-balance text-4xl font-medium leading-[1.05] sm:text-5xl">
              Curado, verificado e sem nenhum segredo no zip.
            </h2>
          </Reveal>
          <ol className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-3">
            {[
              {
                icon: ListChecks,
                title: "Catálogo curado",
                text: `${catalogStats.agents} agentes, ${catalogStats.skills} skills e ${catalogStats.mcps} MCPs. As sugestões saem sempre desse catálogo; nada de itens ou comandos inventados.`,
              },
              {
                icon: ShieldCheck,
                title: "MCPs verificados",
                text: `Conferidos na documentação oficial em ${verifiedAt}: ${mcps.map((m) => m.name).join(", ")}.`,
              },
              {
                icon: KeyRound,
                title: "Nenhum segredo no zip",
                text: "Credenciais só como variáveis de ambiente, com o .env.example vazio e instruções para preencher no seu computador.",
              },
            ].map((c, i) => (
              <Reveal as="li" key={c.title} delay={i * 110}>
                <c.icon className="size-6 text-ink" aria-hidden />
                <h3 className="mt-4 font-medium">{c.title}</h3>
                <p className="mt-2 text-pretty leading-relaxed text-ink-3">{c.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section id="perguntas" className="wrap scroll-mt-24 grid gap-10 pb-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:pb-32">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow n="05">Perguntas</Eyebrow>
            <h2 className="font-display mt-5 text-4xl font-medium leading-[1.05] sm:text-5xl">Perguntas frequentes</h2>
            <p className="mt-5 max-w-sm text-pretty text-ink-3">Não achou a sua? Monte um kit agora: leva poucos minutos e é grátis.</p>
          </Reveal>
          <Faq />
        </section>

        {/* CTA final */}
        <section className="wrap pb-24">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-[#0c0c0b] px-6 py-20 text-center text-white ring-1 ring-white/10 sm:px-12 sm:py-28">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-80 w-[44rem] max-w-none -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand/20 blur-3xl" />
            <div aria-hidden className="dots pointer-events-none absolute inset-0 opacity-30" />
            <p className="relative text-xs font-medium uppercase tracking-[0.25em] opacity-50">O próximo passo</p>
            <h2 className="font-display relative mx-auto mt-6 max-w-3xl text-balance text-4xl font-medium leading-[1.04] sm:text-6xl">
              Seu projeto merece um time que já chega sabendo o que fazer.
            </h2>
            <Link
              href="/montar"
              className="ring-glow sheen group relative mt-10 inline-flex h-14 items-center gap-3 rounded-full bg-brand pl-7 pr-2 text-base font-medium text-brand-ink transition-transform active:scale-[0.98]"
            >
              {brand.copy.heroCta}
              <span className="grid size-10 place-items-center rounded-full bg-[#0c0c0b] text-white transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

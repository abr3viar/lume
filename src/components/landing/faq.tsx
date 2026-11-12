"use client";

import { Plus } from "lucide-react";
import { Accordion } from "radix-ui";

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "O que exatamente eu baixo?",
    a: "Um .zip com uma pasta pronta para a raiz do seu projeto: agentes em .claude/agents, skills em .claude/skills, o .mcp.json com os servidores MCP, um CLAUDE.md com o contexto do seu SaaS, um LEIA-ME passo a passo e o prompt de ativação para colar no Claude Code.",
  },
  {
    q: "Preciso saber programar?",
    a: "Não. Ao montar o kit você escolhe o seu nível técnico, e o LEIA-ME é escrito nesse nível, explicando até como abrir o terminal. Você só precisa ter o Claude Code instalado.",
  },
  {
    q: "E se eu ainda não tiver um projeto?",
    a: "Escolha “Vou começar do zero”. O kit vem com o Modo Descoberta: o Claude entrevista você sobre o SaaS em blocos curtos de perguntas, monta um briefing, pede sua aprovação e só então começa a construir.",
  },
  {
    q: "Os MCPs são confiáveis?",
    a: "Só entram no catálogo servidores conferidos na documentação oficial de cada um, com a fonte e a data da verificação. Cada MCP mostra um selo de risco (somente leitura, escreve dados ou acesso amplo) e quais credenciais pede.",
  },
  {
    q: "Minhas chaves e senhas vão para o zip?",
    a: "Nunca. O .mcp.json usa variáveis como ${GITHUB_PERSONAL_ACCESS_TOKEN}, o .env.example vem sem valores e a maioria dos MCPs usa login pelo navegador. O LEIA-ME explica como preencher tudo localmente.",
  },
  {
    q: "A IA inventa agentes ou comandos?",
    a: "Não. A IA escolhe itens de um catálogo curado e escreve por que cada um faz sentido para você. Na geração, ela adapta os textos ao seu SaaS mantendo a estrutura. Se uma adaptação falhar, o item vai com o modelo base e o LEIA-ME avisa.",
  },
  {
    q: "Posso usar em produção direto?",
    a: "Trate o kit como ponto de partida. Revise os agentes, skills e configurações antes de usar em produção, use git para poder desfazer mudanças e conceda só as permissões necessárias.",
  },
];

export function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="divide-y divide-line border-y border-line">
      {FAQ.map((item, i) => (
        <Accordion.Item key={item.q} value={`q${i}`}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left font-display text-lg font-medium tracking-tight sm:text-xl">
              {item.q}
              <Plus className="size-5 shrink-0 text-ink-3 transition-transform duration-300 group-data-[state=open]:rotate-45" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[collapse_220ms_ease-out] data-[state=open]:animate-[expand_260ms_var(--ease-out-soft)]">
            <p className="max-w-2xl pb-6 text-pretty leading-relaxed text-ink-2">{item.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

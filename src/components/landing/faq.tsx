"use client";

import { Plus } from "lucide-react";
import { Accordion } from "radix-ui";

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Funciona com outras IAs além do Claude?",
    a: "Sim. Na revisão você escolhe entre Claude Code, Codex, Gemini CLI, Cursor, Grok Build ou outra IA que leia o AGENTS.md. O conteúdo é o mesmo; o Lume muda onde cada arquivo mora e o formato, conferido na documentação oficial de cada ferramenta.",
  },
  {
    q: "Serve para um site comum, não só SaaS?",
    a: "Serve. Escolha “Site” ao contar sobre o projeto: landing page, site institucional, portfólio, blog ou loja. As sugestões passam a priorizar copy, SEO, performance, design e deploy.",
  },
  {
    q: "Como funcionam os sites de referência?",
    a: "Cole até três sites que você acha bonitos. O Lume lê a página pública, tira as fontes, as cores, a estrutura e o código, e coloca no kit para o agente de design se inspirar, sem copiar textos, logos ou a marca de ninguém.",
  },
  {
    q: "O que exatamente eu baixo?",
    a: "Um .zip com uma pasta pronta para a raiz do seu projeto, no formato da IA que você escolher: o arquivo de contexto (CLAUDE.md, AGENTS.md ou GEMINI.md), os agentes, as skills, os MCPs, o método Lume, um LEIA-ME passo a passo e o prompt de ativação para colar na sua IA.",
  },
  {
    q: "Preciso saber programar?",
    a: "Não. Ao montar o kit você escolhe o seu nível técnico, e o LEIA-ME é escrito nesse nível, explicando até como abrir o terminal. Você só precisa ter a sua ferramenta de IA instalada.",
  },
  {
    q: "E se eu ainda não tiver um projeto?",
    a: "Escolha “Vou começar do zero”. O kit vem com o Modo Descoberta: a IA entrevista você sobre o projeto em blocos curtos de perguntas, monta um briefing, pede sua aprovação e só então começa a construir.",
  },
  {
    q: "Serve para consertar um erro ou fazer uma mudança pequena?",
    a: "Sim. Escolha “Consertar um erro” ou “Fazer uma atualização rápida” e descreva a tarefa. O kit vem enxuto, com um TAREFA.md e regras para a IA reproduzir antes de mexer, manter o escopo fechado, pedir aprovação e deixar um teste quando fizer sentido.",
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
    q: "As sugestões são inventadas na hora?",
    a: "Não. O Lume escolhe itens de um catálogo curado, cruzando o nicho, o modelo de negócio, o estágio, o objetivo e a stack que você informou, e mostra por que cada um faz sentido. Depois, o prompt de ativação pede ao Claude Code para ler o seu projeto e ajustar agentes e skills à realidade dele.",
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

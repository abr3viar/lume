import { saasInfoSchema, type SaasInfo } from "@/lib/schemas";

export const saasExisting: SaasInfo = saasInfoSchema.parse({
  name: "Agenda Clínica",
  description: "Agenda online para clínicas pequenas, com lembretes por WhatsApp.",
  niche: "Saúde",
  problem: "Clínicas perdem consultas por faltas e gastam horas confirmando agendamentos.",
  model: "B2B",
  stage: "primeiros-clientes",
  stack: ["Next.js", "Supabase"],
  goal: "Chegar a 50 clínicas pagantes.",
  techLevel: "intermediario",
});

export const saasZero: SaasInfo = saasInfoSchema.parse({
  name: "Treino em Casa",
  description: "App de treinos curtos em casa com acompanhamento de progresso.",
  niche: "",
  problem: "",
  model: "B2C",
  stack: [],
  goal: "",
});

export const ids = {
  agents: ["suporte-cliente", "revisor-codigo", "arquiteto-produto", "termos-privacidade-lgpd"],
  skills: ["checklist-lgpd", "brief-do-projeto", "escrever-prd"],
  mcps: ["github", "context7", "supabase", "playwright"],
};

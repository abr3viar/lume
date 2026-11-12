"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_FIELD, saasInfoSchemaFor, STAGE_LABEL, TECH_LABEL, type SaasStage, type TechLevel } from "@/lib/schemas";
import { formToInput, useKit, type SaasForm } from "@/store/kit-store";
import { Chip, Field, Segmented, TextArea, TextInput } from "./fields";
import { useStepNext } from "./step-actions";
import { StepFooter, StepHeader } from "./step-header";

const NICHES = ["Fintech", "Educação", "Saúde", "E-commerce", "RH", "Marketing", "Jurídico", "Logística", "Imobiliário", "Agro", "Turismo", "Restaurantes"];
const STACKS = ["Next.js", "React", "Node.js", "Python", "Django", "Laravel", "Ruby on Rails", "Supabase", "Firebase", "PostgreSQL", "Vercel", "AWS", "Flutter", "React Native", "WordPress", "Bubble"];

type Errors = Partial<Record<keyof SaasForm, string>>;
const ORDER: (keyof SaasForm)[] = ["name", "description", "niche", "problem", "model", "stage", "stack", "goal", "techLevel"];

export function StepAbout() {
  const mode = useKit((s) => s.mode)!;
  const form = useKit((s) => s.form);
  const setForm = useKit((s) => s.setForm);
  const setStep = useKit((s) => s.setStep);
  const [errors, setErrors] = useState<Errors>({});
  const [stackDraft, setStackDraft] = useState("");
  const zero = mode === "zero";
  const optional = zero ? "opcional" : false;
  const laterHint = "Pode deixar em branco, o Claude vai perguntar depois.";

  const update = (patch: Partial<SaasForm>) => {
    setForm(patch);
    const keys = Object.keys(patch) as (keyof SaasForm)[];
    if (keys.some((k) => errors[k])) setErrors((e) => ({ ...e, ...Object.fromEntries(keys.map((k) => [k, undefined])) }));
  };

  const submit = () => {
    const res = saasInfoSchemaFor(mode).safeParse(formToInput(form));
    if (res.success) {
      setErrors({});
      setStep(3);
      return;
    }
    const next: Errors = {};
    for (const issue of res.error.issues) {
      const key = issue.path[0] as keyof SaasForm;
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    const first = ORDER.find((k) => next[k]);
    if (first) document.getElementById(`f-${first}`)?.focus();
  };
  useStepNext(submit);

  const addStack = (value: string) => {
    const v = value.trim().slice(0, 40);
    if (!v || form.stack.includes(v) || form.stack.length >= 20) return;
    update({ stack: [...form.stack, v] });
  };
  const toggleStack = (v: string) =>
    update({ stack: form.stack.includes(v) ? form.stack.filter((x) => x !== v) : [...form.stack, v] });

  const desc = (k: keyof SaasForm) => (errors[k] ? `f-${k}-error` : `f-${k}-hint`);

  return (
    <div className="wrap py-12 lg:py-16">
      <StepHeader title="Conte sobre o seu SaaS">
        {zero
          ? "Só nome, descrição e modelo são obrigatórios. O resto o Claude pergunta na entrevista de descoberta."
          : "Quanto mais específico, mais certeiras ficam as sugestões e a personalização do kit."}
      </StepHeader>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid max-w-3xl gap-8"
      >
        <Field id="f-name" label="Nome do produto" error={errors.name} counter={{ value: form.name.length, max: 80 }}>
          <TextInput
            id="f-name"
            value={form.name}
            maxLength={80}
            autoComplete="off"
            placeholder="Ex.: Agenda Clínica"
            invalid={!!errors.name}
            aria-describedby={desc("name")}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>

        <Field
          id="f-description"
          label="Descrição curta"
          hint="O que o produto faz, em uma ou duas frases."
          error={errors.description}
          counter={{ value: form.description.length, max: MAX_FIELD }}
        >
          <TextArea
            id="f-description"
            value={form.description}
            maxLength={MAX_FIELD}
            placeholder="Ex.: Agenda online para clínicas pequenas, com lembretes por WhatsApp e confirmação automática."
            invalid={!!errors.description}
            aria-describedby={desc("description")}
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>

        <Field id="f-model" label="Modelo de negócio" error={errors.model}>
          <Segmented
            id="f-model"
            label="Modelo de negócio"
            value={form.model}
            invalid={!!errors.model}
            onChange={(v) => update({ model: v })}
            options={[
              { value: "B2B", label: "B2B", hint: "vende para empresas" },
              { value: "B2C", label: "B2C", hint: "vende para pessoas" },
              { value: "B2B2C", label: "B2B2C", hint: "os dois" },
            ]}
          />
        </Field>

        <Field
          id="f-niche"
          label="Nicho"
          optional={optional}
          hint={zero ? laterHint : "Escreva livremente ou escolha uma sugestão."}
          error={errors.niche}
          counter={{ value: form.niche.length, max: MAX_FIELD }}
        >
          <TextInput
            id="f-niche"
            value={form.niche}
            maxLength={MAX_FIELD}
            placeholder="Ex.: Saúde, clínicas odontológicas"
            invalid={!!errors.niche}
            aria-describedby={desc("niche")}
            onChange={(e) => update({ niche: e.target.value })}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sugestões de nicho">
            {NICHES.map((n) => (
              <Chip key={n} selected={form.niche === n} onClick={() => update({ niche: form.niche === n ? "" : n })}>
                {n}
              </Chip>
            ))}
          </div>
        </Field>

        <Field
          id="f-problem"
          label="Problema que resolve"
          optional={optional}
          hint={zero ? laterHint : "Qual dor do cliente o produto elimina?"}
          error={errors.problem}
          counter={{ value: form.problem.length, max: MAX_FIELD }}
        >
          <TextArea
            id="f-problem"
            value={form.problem}
            maxLength={MAX_FIELD}
            placeholder="Ex.: Clínicas perdem até 20% das consultas por faltas e gastam horas confirmando agendamentos por telefone."
            invalid={!!errors.problem}
            aria-describedby={desc("problem")}
            onChange={(e) => update({ problem: e.target.value })}
          />
        </Field>

        <Field id="f-stage" label="Estágio" optional={optional} hint={zero ? laterHint : undefined} error={errors.stage}>
          <Segmented<SaasStage>
            id="f-stage"
            label="Estágio"
            value={form.stage}
            invalid={!!errors.stage}
            onChange={(v) => update({ stage: v })}
            options={(Object.keys(STAGE_LABEL) as SaasStage[]).map((v) => ({ value: v, label: STAGE_LABEL[v] }))}
          />
        </Field>

        <Field id="f-stack" label="Stack" optional="opcional" hint={zero ? laterHint : "Toque para marcar ou escreva outra e aperte Enter."}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tecnologias">
            {[...new Set([...STACKS, ...form.stack])].map((s) => (
              <Chip key={s} selected={form.stack.includes(s)} onClick={() => toggleStack(s)}>
                {s}
                {form.stack.includes(s) && !STACKS.includes(s) && <X className="size-3" aria-hidden />}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <TextInput
              id="f-stack"
              value={stackDraft}
              maxLength={40}
              placeholder="Outra tecnologia"
              aria-describedby="f-stack-hint"
              onChange={(e) => setStackDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  addStack(stackDraft);
                  setStackDraft("");
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 shrink-0"
              aria-label="Adicionar tecnologia"
              onClick={() => {
                addStack(stackDraft);
                setStackDraft("");
              }}
            >
              <Plus />
            </Button>
          </div>
        </Field>

        <Field
          id="f-goal"
          label="Maior objetivo do momento"
          optional="opcional"
          hint={zero ? laterHint : "Ex.: conseguir os 10 primeiros clientes pagantes."}
          error={errors.goal}
          counter={{ value: form.goal.length, max: MAX_FIELD }}
        >
          <TextArea
            id="f-goal"
            value={form.goal}
            maxLength={MAX_FIELD}
            placeholder="Ex.: Reduzir o churn do primeiro mês."
            aria-describedby={desc("goal")}
            onChange={(e) => update({ goal: e.target.value })}
          />
        </Field>

        <Field
          id="f-techLevel"
          label="Nível técnico de quem vai usar o kit"
          optional={optional}
          hint="Ajusta o tom do tutorial que vai no zip."
          error={errors.techLevel}
        >
          <Segmented<TechLevel>
            id="f-techLevel"
            label="Nível técnico"
            value={form.techLevel}
            invalid={!!errors.techLevel}
            onChange={(v) => update({ techLevel: v })}
            options={[
              { value: "iniciante", label: TECH_LABEL.iniciante, hint: "explica tudo" },
              { value: "intermediario", label: TECH_LABEL.intermediario, hint: "direto ao ponto" },
              { value: "avancado", label: TECH_LABEL.avancado, hint: "só o essencial" },
            ]}
          />
        </Field>

        <StepFooter>
          <Button type="button" variant="ghost" onClick={() => setStep(1)}>
            Voltar
          </Button>
          <Button type="submit" size="lg">
            Ver recomendações
          </Button>
        </StepFooter>
      </form>
    </div>
  );
}

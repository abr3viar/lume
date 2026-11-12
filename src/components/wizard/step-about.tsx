"use client";

import { ChevronDown, Lightbulb, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { isTaskMode, MAX_FIELD, saasInfoSchemaFor, STAGE_LABEL, TECH_LABEL, type SaasStage, type TechLevel } from "@/lib/schemas";
import { isVague } from "@/lib/vague";
import { formToInput, useKit, type SaasForm } from "@/store/kit-store";
import { Chip, Field, Segmented, TextArea, TextInput } from "./fields";
import { useStepNext } from "./step-actions";
import { StepFooter, StepHeader } from "./step-header";

const NICHES = ["Fintech", "Educação", "Saúde", "E-commerce", "RH", "Marketing", "Jurídico", "Logística", "Imobiliário", "Agro", "Turismo", "Restaurantes"];
const STACKS = ["Next.js", "React", "Node.js", "Python", "Django", "Laravel", "Ruby on Rails", "Supabase", "Firebase", "PostgreSQL", "Vercel", "AWS", "Flutter", "React Native", "WordPress", "Bubble"];

type Errors = Partial<Record<keyof SaasForm, string>>;
const ORDER: (keyof SaasForm)[] = ["name", "task", "details", "description", "model", "niche", "problem", "stage", "stack", "goal", "techLevel"];

export function StepAbout() {
  const mode = useKit((s) => s.mode)!;
  const form = useKit((s) => s.form);
  const setForm = useKit((s) => s.setForm);
  const setStep = useKit((s) => s.setStep);
  const [errors, setErrors] = useState<Errors>({});
  const [stackDraft, setStackDraft] = useState("");
  /** Mostra a pergunta de follow-up quando a descrição (ou a tarefa) está vaga. */
  const [vagueAsked, setVagueAsked] = useState(false);
  const initialForm = useKit.getState().form;
  const zero = mode === "zero";
  const task = isTaskMode(mode);
  const bug = mode === "erro";
  const laterHint = "Pode deixar em branco, o Claude vai perguntar depois.";
  const mainField: "task" | "description" = task ? "task" : "description";
  const examples = brand.examples[task ? (bug ? "erro" : "ajuste") : "saas"];
  const vague = isVague(form[mainField]);
  // "Mais detalhes" abre sozinho no modo projeto existente ou se já houver algo preenchido.
  const [detailsOpen, setDetailsOpen] = useState(() =>
    mode === "existente" ||
    (task
      ? Boolean(initialForm.description || initialForm.stack.length || initialForm.techLevel)
      : Boolean(initialForm.niche || initialForm.problem || initialForm.stage || initialForm.stack.length || initialForm.goal || initialForm.techLevel)),
  );

  const update = (patch: Partial<SaasForm>) => {
    setForm(patch);
    const keys = Object.keys(patch) as (keyof SaasForm)[];
    if (keys.some((k) => errors[k])) setErrors((e) => ({ ...e, ...Object.fromEntries(keys.map((k) => [k, undefined])) }));
  };

  const submit = (force = false) => {
    const res = saasInfoSchemaFor(mode).safeParse(formToInput(form));
    if (res.success) {
      setErrors({});
      // Descrição vaga: pergunta antes de gerar um kit genérico (uma vez; dá para seguir assim mesmo).
      if (vague && !vagueAsked && !force) {
        setVagueAsked(true);
        document.getElementById(`f-${mainField}`)?.focus();
        return;
      }
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
  useStepNext(() => submit());

  const addStack = (value: string) => {
    const v = value.trim().slice(0, 40);
    if (!v || form.stack.includes(v) || form.stack.length >= 20) return;
    update({ stack: [...form.stack, v] });
  };
  const toggleStack = (v: string) =>
    update({ stack: form.stack.includes(v) ? form.stack.filter((x) => x !== v) : [...form.stack, v] });

  const desc = (k: keyof SaasForm) => (errors[k] ? `f-${k}-error` : `f-${k}-hint`);

  const vagueBox = vagueAsked && vague && (
    <div role="alert" className="grid gap-3 rounded-2xl bg-warn-bg p-4 text-sm text-warn-ink" data-testid="aviso-vago">
      <p className="flex gap-2">
        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold">Dá para ser mais específico?</strong>{" "}
          {bug
            ? "Conte o que acontece, o que deveria acontecer e onde (página, tela ou rota)."
            : task
              ? "Diga o que muda, onde fica e como deve ficar depois."
              : "Para quem é o produto e qual problema ele resolve? Ex.: “para clínicas pequenas que perdem consultas por faltas”."}{" "}
          Com mais detalhes, o kit sai sob medida em vez de genérico.
        </span>
      </p>
      <Button type="button" variant="outline" size="sm" className="justify-self-start bg-bg" onClick={() => submit(true)}>
        Continuar assim mesmo
      </Button>
    </div>
  );

  const exampleChips = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Exemplos">
      <span className="text-xs text-ink-3">Exemplos:</span>
      {examples.map((e) => (
        <Chip key={e.label} aria-label={`Usar exemplo: ${e.text}`} onClick={() => update({ [mainField]: e.text } as Partial<SaasForm>)}>
          {e.label}
        </Chip>
      ))}
    </div>
  );

  const stackField = (
    <Field
      id="f-stack"
      label="Stack"
      optional="opcional"
      hint={zero ? laterHint : task ? "Ajuda o Claude a achar os arquivos e comandos certos." : "Toque para marcar ou escreva outra e aperte Enter."}
    >
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
  );

  const techField = (
    <Field id="f-techLevel" label="Nível técnico de quem vai usar o kit" optional="opcional" hint="Ajusta o tom do tutorial que vai no zip." error={errors.techLevel}>
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
  );

  return (
    <div className="wrap py-12 lg:py-16">
      <StepHeader title={bug ? "Conte qual é o erro" : task ? "Conte o que você quer mudar" : "Conte sobre o seu SaaS"}>
        {bug
          ? "Só o nome do projeto e o erro são obrigatórios. Quanto mais detalhes de como reproduzir, mais rápido o Claude acha a causa."
          : task
            ? "Só o nome do projeto e a mudança são obrigatórios. O kit vem enxuto, focado nessa tarefa."
            : "Só três coisas são obrigatórias: o nome, o que o produto faz e para quem. O resto é opcional e deixa as sugestões mais certeiras."}
      </StepHeader>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid max-w-3xl gap-8"
      >
        <Field id="f-name" label={task ? "Nome do projeto" : "Nome do produto"} error={errors.name} counter={{ value: form.name.length, max: 80 }}>
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

        {task ? (
          <>
            <Field
              id="f-task"
              label={bug ? "O que está dando errado?" : "O que você quer mudar?"}
              hint={bug ? "O que acontece e o que deveria acontecer." : "Uma mudança por kit: curta e bem definida."}
              error={errors.task}
              counter={{ value: form.task.length, max: MAX_FIELD }}
            >
              <TextArea
                id="f-task"
                value={form.task}
                maxLength={MAX_FIELD}
                placeholder={examples[0].text}
                invalid={!!errors.task}
                aria-describedby={desc("task")}
                onChange={(e) => update({ task: e.target.value })}
              />
              {exampleChips}
              {vagueBox}
            </Field>
            <Field
              id="f-details"
              label={bug ? "Como reproduzir e mensagem de erro" : "Onde fica e restrições"}
              optional="opcional"
              hint={
                bug
                  ? "Passos, página ou rota, e o texto do erro. Não cole senhas, tokens ou dados de clientes."
                  : "Página, arquivo ou tela, se souber, e o que não pode mudar."
              }
              error={errors.details}
              counter={{ value: form.details.length, max: MAX_FIELD }}
            >
              <TextArea
                id="f-details"
                value={form.details}
                maxLength={MAX_FIELD}
                placeholder={
                  bug
                    ? "Ex.: 1. Entrar em /agenda 2. Clicar em Novo 3. Salvar. Console: TypeError: Cannot read properties of undefined (reading 'id')"
                    : "Ex.: Página /cadastro. Não mudar o layout nem as cores."
                }
                aria-describedby={desc("details")}
                onChange={(e) => update({ details: e.target.value })}
              />
            </Field>
          </>
        ) : (
          <>
            <Field
              id="f-description"
              label="O que o produto faz e para quem"
              hint="Uma ou duas frases: o que faz, para quem e qual problema resolve."
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
              {exampleChips}
              {vagueBox}
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
          </>
        )}

        <details
          className="group rounded-3xl border border-line [&[open]]:bg-surface/40"
          open={detailsOpen}
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
          data-testid="mais-detalhes"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span>
              Mais detalhes <span className="font-normal text-ink-3">(opcional, {zero ? "o Claude pergunta depois" : "deixa o kit mais certeiro"})</span>
            </span>
            <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="grid gap-8 px-5 pb-6 pt-2">
            {task ? (
              <Field
                id="f-description"
                label="O que o produto faz"
                optional="opcional"
                hint="Uma frase de contexto ajuda o Claude a entender o projeto."
                error={errors.description}
                counter={{ value: form.description.length, max: MAX_FIELD }}
              >
                <TextArea
                  id="f-description"
                  value={form.description}
                  maxLength={MAX_FIELD}
                  placeholder="Ex.: Agenda online para clínicas pequenas, com lembretes por WhatsApp."
                  aria-describedby={desc("description")}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </Field>
            ) : (
              <>
                <Field
                  id="f-niche"
                  label="Nicho"
                  optional="opcional"
                  hint={zero ? laterHint : "Escreva livremente ou escolha uma sugestão."}
                  error={errors.niche}
                  counter={{ value: form.niche.length, max: MAX_FIELD }}
                >
                  <TextInput
                    id="f-niche"
                    value={form.niche}
                    maxLength={MAX_FIELD}
                    placeholder="Ex.: Saúde, clínicas odontológicas"
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
                  optional="opcional"
                  hint={zero ? laterHint : "Qual dor do cliente o produto elimina?"}
                  error={errors.problem}
                  counter={{ value: form.problem.length, max: MAX_FIELD }}
                >
                  <TextArea
                    id="f-problem"
                    value={form.problem}
                    maxLength={MAX_FIELD}
                    placeholder="Ex.: Clínicas perdem até 20% das consultas por faltas e gastam horas confirmando agendamentos por telefone."
                    aria-describedby={desc("problem")}
                    onChange={(e) => update({ problem: e.target.value })}
                  />
                </Field>

                <Field id="f-stage" label="Estágio" optional="opcional" hint={zero ? laterHint : undefined} error={errors.stage}>
                  <Segmented<SaasStage>
                    id="f-stage"
                    label="Estágio"
                    value={form.stage}
                    onChange={(v) => update({ stage: v })}
                    options={(Object.keys(STAGE_LABEL) as SaasStage[]).map((v) => ({ value: v, label: STAGE_LABEL[v] }))}
                  />
                </Field>
              </>
            )}

            {stackField}

            {!task && (
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
            )}

            {techField}
          </div>
        </details>

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

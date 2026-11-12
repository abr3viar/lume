"use client";

import { AlertCircle } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Field({
  id,
  label,
  optional,
  hint,
  error,
  counter,
  children,
}: {
  id: string;
  label: string;
  optional?: string | false;
  hint?: string;
  error?: string;
  counter?: { value: number; max: number };
  children: React.ReactNode;
}) {
  const near = counter && counter.value > counter.max * 0.9;
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.95rem] font-medium">
          {label}
          {optional && <span className="ml-2 font-normal text-ink-3">{optional}</span>}
        </label>
        {counter && (
          <span
            className={cn("text-xs tabular-nums", near ? "font-medium text-warn-ink" : "text-ink-3")}
            aria-live={near ? "polite" : undefined}
          >
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-2xl border bg-bg px-4 text-[0.98rem] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink focus-visible:rounded-2xl [[data-theme=dark]_&]:bg-surface";

export function TextInput({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, "h-12", invalid ? "border-danger" : "border-line", className)}
    />
  );
}

export function TextArea({
  invalid,
  className,
  value,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Cresce com o conteúdo, sem pular o layout.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 360)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={3}
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, "min-h-[6.5rem] resize-none py-3 leading-relaxed", invalid ? "border-danger" : "border-line", className)}
    />
  );
}

export function Segmented<T extends string>({
  id,
  value,
  onChange,
  options,
  invalid,
  label,
}: {
  id: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
  invalid?: boolean;
  label: string;
}) {
  return (
    <RadioGroup.Root
      id={id}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cn(
        "grid gap-1 rounded-2xl border bg-surface p-1",
        options.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
        invalid ? "border-danger" : "border-line",
      )}
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className="rounded-xl px-3 py-2.5 text-sm text-ink-2 transition-colors duration-200 hover:text-ink data-[state=checked]:bg-bg data-[state=checked]:font-medium data-[state=checked]:text-ink data-[state=checked]:shadow-soft focus-visible:rounded-xl [[data-theme=dark]_&]:data-[state=checked]:bg-surface-2"
        >
          {o.label}
          {o.hint && <span className="block text-xs font-normal text-ink-3">{o.hint}</span>}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

export function Chip({
  selected,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-200",
        selected
          ? "border-ink bg-ink text-bg [[data-theme=dark]_&]:border-brand [[data-theme=dark]_&]:bg-brand [[data-theme=dark]_&]:text-brand-ink"
          : "border-line bg-bg text-ink-2 hover:border-line-strong hover:text-ink",
        className,
      )}
    />
  );
}

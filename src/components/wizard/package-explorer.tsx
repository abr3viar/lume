"use client";

import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import type { KitFile } from "@/lib/kit/build";
import { buildTree, type TreeNode } from "@/lib/kit/tree";
import { cn } from "@/lib/utils";
import { CodePreview } from "./code-preview";

function TreeItem({
  node,
  depth,
  selected,
  onSelect,
  open,
  toggle,
}: {
  node: TreeNode;
  depth: number;
  selected: string;
  onSelect: (p: string) => void;
  open: Set<string>;
  toggle: (p: string) => void;
}) {
  const isDir = !!node.children;
  const expanded = open.has(node.path);
  const active = selected === node.path;
  return (
    <li role="treeitem" aria-expanded={isDir ? expanded : undefined} aria-selected={!isDir ? active : undefined}>
      <button
        type="button"
        onClick={() => (isDir ? toggle(node.path) : onSelect(node.path))}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left font-mono text-[0.8rem] transition-colors",
          active ? "bg-brand text-brand-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        {isDir ? (
          <>
            <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-90")} aria-hidden />
            {expanded ? <FolderOpen className="size-4 shrink-0" aria-hidden /> : <Folder className="size-4 shrink-0" aria-hidden />}
          </>
        ) : (
          <FileText className="ml-5 size-4 shrink-0" aria-hidden />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && expanded && (
        <ul role="group">
          {node.children!.map((c) => (
            <TreeItem key={c.path} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} open={open} toggle={toggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PackageExplorer({ files, root }: { files: KitFile[]; root: string }) {
  const tree = useMemo(() => buildTree(files.map((f) => f.path)), [files]);
  const dirs = useMemo(() => {
    const s = new Set<string>();
    for (const f of files) {
      const parts = f.path.split("/");
      for (let i = 1; i < parts.length; i++) s.add(parts.slice(0, i).join("/"));
    }
    return s;
  }, [files]);
  const [open, setOpen] = useState<Set<string>>(() => new Set([".claude", ".claude/agents", ".claude/skills"]));
  const [selected, setSelected] = useState("CLAUDE.md");
  const file = files.find((f) => f.path === selected) ?? files.find((f) => f.path === "CLAUDE.md") ?? files[0];

  const toggle = (p: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line bg-bg px-5 py-3">
        <span className="font-mono text-xs text-ink-2">{root}/</span>
        <span className="text-xs text-ink-3">
          {files.length} arquivos em {dirs.size} pastas
        </span>
      </div>
      <div className="grid md:grid-cols-[17rem_1fr]">
        <nav aria-label="Arquivos do pacote" className="max-h-[30rem] overflow-y-auto border-b border-line p-2 md:border-b-0 md:border-r">
          <ul role="tree" aria-label={root}>
            {tree.map((n) => (
              <TreeItem key={n.path} node={n} depth={0} selected={file?.path ?? ""} onSelect={setSelected} open={open} toggle={toggle} />
            ))}
          </ul>
        </nav>
        <section aria-label={`Prévia de ${file?.path}`} className="min-w-0">
          <div className="border-b border-line px-5 py-2.5 font-mono text-xs text-ink-2">{file?.path}</div>
          <div className="max-h-[27rem] overflow-auto bg-bg px-5 py-4 [[data-theme=dark]_&]:bg-surface">
            {file && <CodePreview path={file.path} code={file.content} />}
          </div>
        </section>
      </div>
    </div>
  );
}

export type TreeNode = { name: string; path: string; children?: TreeNode[] };

/** Monta uma árvore a partir de caminhos "a/b/c.md". Pastas antes de arquivos, ordem alfabética. */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const p of paths) {
    const parts = p.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      node.children ??= [];
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, path: parts.slice(0, i + 1).join("/"), ...(isFile ? {} : { children: [] }) };
        node.children.push(child);
      }
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const af = a.children ? 0 : 1;
      const bf = b.children ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.name.localeCompare(b.name, "pt-BR");
    });
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root.children!);
  return root.children!;
}

/** Desenha a árvore em texto, no estilo do comando `tree`. */
export function renderTreeText(nodes: TreeNode[], prefix = ""): string {
  return nodes
    .map((n, i) => {
      const last = i === nodes.length - 1;
      const line = `${prefix}${last ? "└── " : "├── "}${n.name}${n.children ? "/" : ""}`;
      const sub = n.children ? renderTreeText(n.children, prefix + (last ? "    " : "│   ")) : "";
      return sub ? `${line}\n${sub}` : line;
    })
    .join("\n");
}

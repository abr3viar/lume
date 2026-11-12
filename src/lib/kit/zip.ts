import JSZip from "jszip";
import { isSafeZipPath } from "@/lib/slug";
import type { KitFile } from "./build";

/** Monta o zip com todos os arquivos dentro da pasta `root/`. Funciona no navegador e no Node. */
export async function buildZip(files: KitFile[], root: string): Promise<Uint8Array> {
  if (!isSafeZipPath(root)) throw new Error("Nome de pasta inválido para o zip.");
  const zip = new JSZip();
  const folder = zip.folder(root)!;
  // Data fixa evita diferenças de fuso nos metadados do zip.
  const date = new Date();
  for (const f of files) {
    if (!isSafeZipPath(f.path)) throw new Error(`Caminho inseguro: ${f.path}`);
    folder.file(f.path, f.content, { date, createFolders: true });
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } });
}

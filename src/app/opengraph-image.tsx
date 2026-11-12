import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const alt = `${brand.name}: ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0A",
          color: "#F5F5F0",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <path
              d="M16.6 2.5c.6 4.4 3.1 6.6 5.6 9 2.6 2.5 4.8 5.3 4.8 9.3C27 26.4 22.3 30 16 30S5 26.4 5 20.8c0-3.5 1.6-6 3.7-8.1.3 2.6 1.3 4.3 3.1 5.3-.6-5.8 1.4-10.6 4.8-15.5Z"
              fill="#FFC700"
            />
            <path
              d="M16.3 15.2c.4 2.4 1.8 3.5 3 4.8 1.1 1.2 1.9 2.5 1.9 4.1 0 2.6-2.2 4.4-5.2 4.4s-5.2-1.8-5.2-4.4c0-2.6 2.1-4.6 3.6-6.4.2 1.3.9 2.1 1.8 2.5-.3-1.9-.3-3.3.1-5Z"
              fill="#0A0A0A"
            />
          </svg>
          <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2 }}>{brand.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <span style={{ fontSize: 112, fontWeight: 800, letterSpacing: -5, lineHeight: 0.95 }}>{brand.tagline}</span>
          <span style={{ fontSize: 34, color: "#B9B9B2", maxWidth: 920, lineHeight: 1.3 }}>
            Kits de agentes, skills e MCPs para o Claude Code, sob medida para o seu produto.
          </span>
        </div>
        <div style={{ display: "flex", height: 10, width: 220, background: "#FFC700", borderRadius: 999 }} />
      </div>
    ),
    size,
  );
}

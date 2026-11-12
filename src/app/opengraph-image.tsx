import { ImageResponse } from "next/og";

export const alt = "Surfaced: be the answer when buyers ask AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Generated share card (§17.1). Plain shapes and the default font, so it needs no network at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(180deg,#ffffff 0%,#eef3ff 100%)", color: "#14161a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#14161a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: "#fff" }} />
          </div>
          Surfaced
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Be the answer when buyers ask AI</div>
          <div style={{ fontSize: 34, color: "#5d6470" }}>Check what ChatGPT, Claude, Gemini and DeepSeek say about you. Free.</div>
        </div>
      </div>
    ),
    size,
  );
}

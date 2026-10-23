import { ImageResponse } from "next/og";

// Home-screen icon on iPhones (they don't use SVG icons).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ff8a3d",
          color: "#0f2a3d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          fontWeight: 800,
          paddingBottom: 18,
        }}
      >
        a
      </div>
    ),
    size,
  );
}

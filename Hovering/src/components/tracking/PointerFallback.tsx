import { useEffect, useState } from "react";

export const PointerFallback = () => {
  const [point, setPoint] = useState({ x: 0.5, y: 0.5 });
  const [mode, setMode] = useState<"hover" | "attract" | "repel" | "grab">("hover");

  useEffect(() => {
    const move = (event: PointerEvent) => {
      setPoint({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      });
      if (event.buttons === 1) setMode(event.shiftKey ? "grab" : "attract");
      else if (event.buttons === 2) setMode("repel");
      else setMode("hover");
    };
    const up = () => setMode("hover");
    const context = (event: MouseEvent) => event.preventDefault();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("contextmenu", context);
    };
  }, []);

  return (
    <div
      className={`pointer-reticle pointer-reticle--${mode}`}
      style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
      aria-hidden="true"
    >
      <span />
      <em>{mode.toUpperCase()}</em>
    </div>
  );
};

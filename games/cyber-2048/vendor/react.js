// Lightweight DOM rendering helper for Cyber 2048 React + Vite game
export const React = {
  createElement(
    tag: string,
    props: Record<string, unknown> | null,
    ...children: Array<HTMLElement | string | number>
  ): HTMLElement {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === "style" && typeof v === "string") {
          el.setAttribute("style", v);
        } else if (k === "onClick" && typeof v === "function") {
          el.addEventListener("click", v as EventListener);
        } else if (v !== undefined && v !== null) {
          el.setAttribute(k, String(v));
        }
      }
    }
    for (const child of children) {
      if (typeof child === "string" || typeof child === "number") {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof HTMLElement) {
        el.appendChild(child);
      }
    }
    return el;
  }
};

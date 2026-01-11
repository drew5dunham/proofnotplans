import { useEffect } from "react";

type RestoreStyles = Partial<Record<keyof CSSStyleDeclaration, string>>;

function snapshotStyles(el: HTMLElement, keys: (keyof CSSStyleDeclaration)[]): RestoreStyles {
  const out: RestoreStyles = {};
  for (const k of keys) out[k] = el.style[k] as string;
  return out;
}

function restoreStyles(el: HTMLElement, styles: RestoreStyles) {
  for (const [k, v] of Object.entries(styles)) {
    (el.style as any)[k] = v ?? "";
  }
}

/**
 * iOS WKWebView/Safari keyboard can scroll the document when an input focuses.
 * Locking the body with `position: fixed` prevents the whole UI from jumping.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;

    const body = document.body;
    const docEl = document.documentElement;

    const bodyKeys: (keyof CSSStyleDeclaration)[] = [
      "position",
      "top",
      "left",
      "right",
      "width",
      "overflow",
    ];
    const docKeys: (keyof CSSStyleDeclaration)[] = ["overflow"];

    const prevBody = snapshotStyles(body, bodyKeys);
    const prevDoc = snapshotStyles(docEl, docKeys);

    docEl.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      restoreStyles(body, prevBody);
      restoreStyles(docEl, prevDoc);
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

"use client";

import { createElement, useCallback, type HTMLAttributes } from "react";
import { observeScrollReveal } from "@/lib/scroll-reveal";
import styles from "./ScrollReveal.module.css";

/** Server markup remains visible; motion only enhances newly encountered content. */
export default function ScrollReveal({ as = "div", className, children, ...props }: HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "aside";
}) {
  const ref = useCallback((element: HTMLElement | null) => element ? observeScrollReveal(element) : undefined, []);
  return createElement(as, { ...props, ref, className: `${styles.reveal}${className ? ` ${className}` : ""}` }, children);
}

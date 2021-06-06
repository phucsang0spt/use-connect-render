import { useMemo } from "react";

const _global = {};

export function useGlobal<T extends Record<string, any>>(
  initialValue?: T,
  onInitial?: (initialValue?: T) => void
) {
  return useMemo(() => {
    const global = (typeof window === "undefined"
      ? _global
      : window) as any as Record<string, any>;
    if (initialValue) {
      for (const k of Object.keys(initialValue)) {
        if (!global.hasOwnProperty(k)) {
          global[k] = initialValue![k];
        }
      }
    }
    onInitial && onInitial(global as any);
    return global as T;
  }, []);
}

export function getGlobal<T extends Record<string, any>>() {
  const global = (typeof window === "undefined" ? _global : window) as any;
  return global as T;
}

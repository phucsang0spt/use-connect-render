import { useMemo } from "react";

export function useGlobal<T extends Record<string, any>>(
  initialValue?: T,
  onInitial?: (initialValue?: T) => void
) {
  const global = window as any;
  return useMemo(() => {
    if (initialValue) {
      for (const k of Object.keys(initialValue)) {
        if (!global.hasOwnProperty(k)) {
          global[k] = initialValue![k];
        }
      }
    }

    onInitial && onInitial(global);
    return global as T;
  }, []);
}

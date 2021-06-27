import { useMemo } from "react";

//@ts-ignore
const _global = typeof global === "undefined" ? {} : global;

export function useGlobal<T extends Record<string, any>>(
  initialValue?: T,
  onInitial?: (initialValue?: T) => void
) {
  return useMemo(() => {
    const __global = getGlobal();
    if (initialValue) {
      for (const k of Object.keys(initialValue)) {
        if (!__global.hasOwnProperty(k)) {
          __global[k] = initialValue![k];
        }
      }
    }
    onInitial && onInitial(__global as any);
    return __global as T;
  }, []);
}

export function getGlobal<T extends Record<string, any>>() {
  const __global = (typeof window === "undefined" ? _global : window) as any as Record<string, any>;
  return __global as T;
}

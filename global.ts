import { useMemo } from "react";

//@ts-ignore
const globalStore: Record<string, any> = (function () {
  let __global;
  if (typeof window !== "undefined") {
    // browser
    __global = window as Record<string, any>;
    //@ts-ignore
  } else if (typeof global !== "undefined") {
    //@ts-ignore
    __global = global;
  } else {
    __global = {};
  }
  return __global as Record<string, any>;
})();

//@ts-ignore
const nextjsStore: Record<string, any> = globalStore;

export function useGlobal<T extends Record<string, any>>(
  initialValue?: T,
  onInitial?: (initialValue?: T) => void,
  deps: any[] = []
) {
  const gb = useMemo(() => {
    const __global = getGlobal();
    if (initialValue) {
      for (const k of Object.keys(initialValue)) {
        if (!__global.hasOwnProperty(k)) {
          __global[k] = initialValue![k];
        }
      }
    }
    return __global as T;
  }, []);

  useMemo(() => {
    const __global = getGlobal();
    onInitial?.(__global as any);
  }, deps);

  return gb;
}

export function getGlobal() {
  return globalStore;
}

export function getServerStore<O = any>(storeId: string) {
  nextjsStore[storeId] = nextjsStore[storeId] || {};
  return nextjsStore as O;
}

export function clearGlobal(storeId: string) {
  delete nextjsStore[storeId];
}

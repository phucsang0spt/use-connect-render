import { useCallback, useMemo } from "react";
import { useGlobal } from "./global";

interface Listener {
  id: string;
  name: string;
  func: (...args: any[]) => any;
}

interface UseEventOptions<D = Record<string, any>> {
  name: string;
  initialData?: D;
}

export type Event<D> = {
  listeners: Listener[];
} & D;
export function useEvent<D>({ name, initialData }: UseEventOptions<D>) {
  const global = useGlobal<{
    events: Record<string, Event<D>>;
  }>(
    {
      events: {},
    },
    (arg) => {
      const { events } = arg!;
      if (!events[name]) {
        events[name] = {
          listeners: [],
        } as any;
      }
      if (initialData) {
        for (const k of Object.keys(initialData)) {
          if (!events[name].hasOwnProperty(k)) {
            events[name][k as keyof D] = initialData![k as keyof D] as any;
          }
        }
      }
    }
  );

  const event = useMemo(() => {
    return global.events[name];
  }, [global, name]);

  const addListener = useCallback(
    (name: string, dispatch) => {
      const id = `${Math.random()}${new Date().getTime()}`;
      event.listeners.push({
        id,
        name,
        func: (...args: any[]) => {
          dispatch(...args);
        },
      });
      return () => {
        event.listeners = event.listeners.filter((list) => list.id !== id);
      };
    },
    [event]
  );

  const emit = useCallback(
    (name: string, ...args: any[]) => {
      for (const listener of event.listeners) {
        if (listener.name === name) {
          listener.func(...args);
        }
      }
    },
    [event]
  );

  return [event, addListener, emit] as [
    Event<D>,
    (name: string, ...args: any[]) => any,
    (name: string, ...args: any[]) => any
  ];
}

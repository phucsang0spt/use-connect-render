export { useGlobal } from "./global";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEvent } from "./event";

type Watch = <T = any>(
  name: string,
  defaultValue?: T
) => [T, (value: T) => void];

type Listen = <TS = any[]>(...names: string[]) => TS;
type Pusher = <T = any>(name: string, value: T | ((prev: T) => T)) => any;

export function useConnectRender<T = any>(
  scope: string,
  defaultValue: Record<string, T> = {}
) {
  const eventName = useMemo(() => {
    return `${scope.toUpperCase()}:connect-render`;
  }, [scope]);

  const [event, addListener, emit] = useEvent<Record<string, T>>({
    name: eventName,
    initialData: defaultValue,
  });
  const refWatchList = useRef<Record<string, any>>({});
  const refPusher = useRef<Record<string, (value: any) => void>>({});
  const [, setTick] = useState<number>();

  const dispatch = useCallback(
    (name: string, value: any) => {
      event[name] = value;
      if (refWatchList.current.hasOwnProperty(name)) {
        if (refWatchList.current[name] !== value) {
          refWatchList.current[name] = value;
          setTick(new Date().getTime());
        }
      }
    },
    [event]
  );

  useEffect(() => {
    const unsub = addListener("dispatch", dispatch);
    return unsub;
  }, [addListener, dispatch]);

  const watch = useCallback<Watch>(
    (name, defaultValue) => {
      if (!refWatchList.current.hasOwnProperty(name)) {
        refWatchList.current[name] =
          event[name] === undefined ? defaultValue : event[name];
      }
      if (!refPusher.current.hasOwnProperty(name)) {
        refPusher.current[name] = (value: any) => {
          emit("dispatch", name, value);
        };
      }
      return [refWatchList.current[name], refPusher.current[name]];
    },
    [event, emit]
  );

  const listen = useCallback<Listen>(
    (...names) => {
      for (const name of names) {
        if (!refWatchList.current.hasOwnProperty(name)) {
          refWatchList.current[name] = event[name];
        }
      }
      return names.map((name) => refWatchList.current[name]) as any;
    },
    [event]
  );

  const pusher = useCallback<Pusher>(
    (name, value) => {
      if (typeof value === "function") {
        const func = value as Function;
        return emit("dispatch", name, func(event[name] as any));
      }
      return emit("dispatch", name, value);
    },
    [event, emit]
  );

  return {
    listen,
    watch,
    pusher,
  };
}

export { useEvent };

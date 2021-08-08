export { useGlobal } from "./global";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Event, useEvent } from "./event";
import { getGlobal, useGlobal } from "./global";

type Watch = <T = any>(
  name: string,
  defaultValue?: T
) => [T, (value: T) => void];

type Listen = <TS = any[]>(...names: string[]) => TS;
type GetCurrent = <TS = any[]>(...names: string[]) => TS;
type GetOther = <TS = any[]>(scope: string, ...names: string[]) => TS;
type Pusher = <T = any>(name: string, value: T | ((prev: T) => T)) => any;

type KeyPair<T> = [string, T];
type Hydrate<T = any> = (scope: string, ...keypairs: KeyPair<T>[]) => void;

export function useConnectRender<T = any>(
  scope: string,
  defaultValue: Record<string, T> = {}
) {
  const eventName = useMemo(() => {
    return `${scope.toUpperCase()}:connect-render`;
  }, [scope]);

  const global = useGlobal();

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

  const getOther = useCallback<GetOther>(
    (scope, ...names) => {
      if (!global.events) {
        return [];
      }
      const _event = global.events[`${scope.toUpperCase()}:connect-render`];
      return _event ? (names.map((name) => _event[name]) as any) : [];
    },
    [event, global]
  );

  const getCurrent = useCallback<GetCurrent>(
    (...names) => {
      return names.map((name) => event[name]) as any;
    },
    [event]
  );

  return {
    getOther,
    getCurrent,
    listen,
    watch,
    pusher,
  };
}

const pushToHydrate: Hydrate = function (scope, ...keypairs) {
  const global = getGlobal<{ events: Record<string, any> }>();
  if (!global.events) {
    global.events = {};
  }
  const eventName = `${scope.toUpperCase()}:connect-render`;
  if (!global.events[eventName]) {
    global.events[eventName] = {
      listeners: [],
    };
  }
  for (const [name, value] of keypairs) {
    global.events[eventName][name] = value;
  }
};

export function useHydrate(data: Record<string, Event<any>>) {
  useMemo(() => {
    if (typeof window !== "undefined") {
      for (const key of Object.keys(data)) {
        if (key.endsWith(":connect-render")) {
          const scope = key.split(":")[0];
          const obj = { ...data[key] };
          delete obj.listeners;
          pushToHydrate(
            scope,
            ...Object.keys(obj).map((k) => [k, obj[k]] as KeyPair<any>)
          );
        }
      }
    }
  }, []);
}

export function connectHydrate<F extends (...args: any[]) => any>(
  func: (
    options: { pushToHydrate: Hydrate },
    ...argsF: Parameters<F>
  ) => ReturnType<F>
) {
  return async (...args: Parameters<F>) => {
    const server = await func({ pushToHydrate }, ...args);
    server.props = server.props || {};
    const events = getGlobal().events;
    if (events) {
      server.props.connectRenderHydrate = events;
    }
    return server;
  };
}

export { useEvent };
export { useGlobal } from "./global";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Event, useEvent } from "./event";
import { clearGlobal, getGlobal, getNextStore, useGlobal } from "./global";
import cloneDeep from "lodash/cloneDeep";

type Watch = <T = any>(
  name: string,
  defaultValue?: T
) => [T, (value: T) => void];

type Listen = <TS = any[]>(...names: string[]) => TS;
type GetCurrent = <TS = any[]>(...names: string[]) => TS;
type GetOther = <TS = any[]>(scope: string, ...names: string[]) => TS;
type Push = <T = any>(name: string, value: T | ((prev: T) => T)) => any;

type KeyPair<T> = [string, T];

type PushToHydrate<T = any> = (
  storeId: string,
  scope: string,
  ...keypairs: KeyPair<T>[]
) => void;

type PushToClientStore<T = any> = (
  scope: string,
  ...keypairs: KeyPair<T>[]
) => void;

type PushToHydrateShort<T = any> = (
  scope: string,
  ...keypairs: KeyPair<T>[]
) => void;

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
  const refPush = useRef<Record<string, (value: any) => void>>({});
  const refSubscriptions = useRef<any[]>([]);
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

  useMemo(() => {
    const unsub = addListener("dispatch", dispatch);
    refSubscriptions.current.push(unsub);
  }, [addListener, dispatch]);

  useEffect(() => {
    return () => {
      for (const unsub of refSubscriptions.current) {
        unsub();
      }
    };
  }, [addListener, dispatch]);

  const watch = useCallback<Watch>(
    (name, defaultValue) => {
      if (!refWatchList.current.hasOwnProperty(name)) {
        refWatchList.current[name] =
          event[name] === undefined ? defaultValue : event[name];
      }
      if (!refPush.current.hasOwnProperty(name)) {
        refPush.current[name] = (value: any) => {
          emit("dispatch", name, value);
        };
      }
      return [refWatchList.current[name], refPush.current[name]];
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

  const push = useCallback<Push>(
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
    push,
  };
}

const pushToClientStore: PushToClientStore = function (scope, ...keypairs) {
  const global = getGlobal<{ events: Record<string, any> }>();
  if (!global.events) {
    global.events = {};
  }
  const eventName = `${scope.toUpperCase()}:connect-render`;
  global.events[eventName] = global.events[eventName] || {};
  global.events[eventName].listeners = [];

  for (const [name, value] of keypairs) {
    global.events[eventName][name] = value;
  }
};

const pushToHydrate: PushToHydrate = function (storeId, scope, ...keypairs) {
  const global = getNextStore<{ events: Record<string, any> }>(storeId);
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
          pushToClientStore(
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
    options: { pushToHydrate: PushToHydrateShort },
    ...argsF: Parameters<F>
  ) => ReturnType<F>
) {
  return async (...args: Parameters<F>) => {
    const storeId = `${Math.random()}:${new Date().getTime()}`;
    const server = await func(
      { pushToHydrate: (...args) => pushToHydrate(storeId, ...args) },
      ...args
    );
    server.props = server.props || {};
    const events = getNextStore(storeId).events;
    if (events) {
      server.props.connectRenderHydrate = cloneDeep(
        Object.keys(events).reduce(
          (evs: Record<string, any>, eventName: string) => {
            evs[eventName] = { ...events[eventName] };
            delete evs[eventName].listeners;
            return evs;
          },
          {}
        )
      );
    }
    clearGlobal(storeId);
    return server;
  };
}

export { useEvent };

import React, { Dispatch, useReducer } from 'react';
import type { Manager } from './devtools/Manager';

export const $ACTION = Symbol('ACTION');
export const $PREV_STATE = Symbol('PREV_STATE');
export const $TRANSITIONS = Symbol('TRANSITIONS');
export const DEBUG_TRANSITIONS = Symbol('DEBUG_TRANSITIONS');
export const DEBUG_COMMAND = Symbol('DEBUG_COMMAND');
export const DEBUG_ID = Symbol('DEBUG_ID');

const DEBUG_TRIGGER_TRANSITIONS = Symbol('DEBUG_TRIGGER_TRANSITIONS');

export interface IState {
  state: string;
  [$ACTION]?: IAction;
  [$TRANSITIONS]?: TReadableTransition<any>;
}

export interface IAction {
  type: string;
}

type TMatch<S extends IState, R = any> = {
  [SS in S['state']]: (state: S & { state: SS }) => R;
};

type TPartialMatch<S extends IState, R = any> = {
  [SS in S['state']]?: (state: S & { state: SS }) => R;
};

export type PickState<S extends IState, T extends S['state'] = never> = [T] extends [never]
  ? S
  : S extends { state: T }
  ? S
  : never;

export type PickAction<A extends IAction, T extends A['type']> = A extends { type: T } ? A : never;

export type TTransition<S extends IState, A extends IAction, SS extends S['state'] = S['state']> = {
  [AA in A['type']]?: (state: S & { state: SS }, action: A extends { type: AA } ? A : never) => S;
};

export type TTransitions<S extends IState, A extends IAction> = {
  [SS in S['state']]: TTransition<S, A, SS>;
};

type TReadableTransition<T extends TTransitions<any, any>> = {
  [S in keyof T]: {
    [A in keyof T[S]]: S extends string
      ?
          | (A extends string
              ? T[S][A] extends (...args: any[]) => IState
                ? `${S} => ${A} => ${ReturnType<T[S][A]>['state']}`
                : never
              : never)
          | S
      : never;
  }[keyof T[S]];
}[keyof T];

export function transition<S extends IState, A extends IAction, T extends TTransitions<S, A>>(
  state: S,
  action: A,
  transitions: T,
): S & { [$ACTION]?: A; [$PREV_STATE]?: S; [$TRANSITIONS]?: TReadableTransition<T> } {
  let newState = state;

  // @ts-ignore
  const debugId = state[DEBUG_ID];

  // @ts-ignore
  if (transitions[state.state] && transitions[state.state][action.type]) {
    // @ts-ignore
    newState = transitions[state.state][action.type](state, action);
    // @ts-ignore
    newState[$ACTION] = action;
    // @ts-ignore
    action[$ACTION] && newState !== state && action[$ACTION](debugId, false);
    // @ts-ignore
    newState[$PREV_STATE] = state;
  } else {
    // @ts-ignore
    action[$ACTION] && action[$ACTION](debugId, true);
  }

  if (debugId) {
    // @ts-ignore
    newState[DEBUG_ID] = debugId;

    // @ts-ignore
    newState[DEBUG_TRANSITIONS] = transitions;
  }

  return newState as any;
}

export function useTransitionEffect<S extends IState, T extends S[typeof $TRANSITIONS] | S[typeof $TRANSITIONS][]>(
  state: S,
  transition: T,
  effect: T extends `${infer SP} => ${infer A} => ${infer SC}` | `${infer SP} => ${infer A} => ${infer SC}`[]
    ? (
        prev: S & { state: SP },
        action: Exclude<S[typeof $ACTION], undefined> & { type: A },
        current: S & { state: SC },
      ) => void | (() => void)
    : T extends string
    ? (current: S & { state: T }) => void | (() => void)
    : T extends string[]
    ? (current: S & { state: T[number] }) => void | (() => void)
    : never,
  deps?: unknown[],
): void;
export function useTransitionEffect<S extends IState>(
  state: S,
  effect: (
    prev: S | undefined,
    action: Exclude<S[typeof $ACTION], undefined> | undefined,
    current: S,
  ) => void | (() => void),
  deps?: unknown[],
): void;
export function useTransitionEffect(...params: any[]) {
  const state = params[0];
  const transitions = params[1];
  const cb = params[2] || params[1];
  const deps = Array.isArray(params[params.length - 1]) ? params[params.length - 1] : [];

  if (typeof state === 'function') {
    return React.useEffect(() => cb(state[$PREV_STATE], state[$ACTION], state), deps.concat(state));
  }

  const transitionsList: string[] = Array.isArray(transitions) ? transitions : [transitions];
  const currentState = state;
  const prevState = state[$PREV_STATE];
  const action = state[$ACTION];
  const transition = `${prevState?.state} => ${action?.type} => ${currentState.state}`;
  const hasTransitioned = Boolean(
    // Transitioned into
    (transitionsList.includes(currentState.state as string) &&
      prevState &&
      !transitionsList.includes(prevState?.state as string)) ||
      (transitionsList.includes(prevState?.state as string) && !transitionsList.includes(currentState.state as string)),
  );

  console.log(hasTransitioned, currentState, prevState);

  React.useEffect(() => {
    if (transitionsList.includes(currentState.state as string)) {
      return cb(currentState);
    }

    if (transitionsList.includes()) {
      return cb(prevState, action, currentState);
    }
  }, deps.concat(hasTransitioned));
}

export function match<S extends IState, T extends TMatch<S>>(
  state: S,
  matches: T,
): {
  [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
}[keyof T];
export function match<S extends IState, T extends TPartialMatch<S>, U>(
  state: S,
  matches: T,
  _: (state: S & { state: Exclude<S['state'], keyof T> }) => U,
):
  | {
      [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
    }[keyof T]
  | U;
export function match() {
  const state = arguments[0];
  const matches = arguments[1];
  const _ = arguments[2];

  if (_) {
    return (matches[state.state] || _)(state);
  }

  return matches[state.state](state);
}

export function matchProp<
  S extends IState,
  P extends {
    [K in keyof S]: keyof (S & { state: K });
  }[keyof S]
>(state: S, prop: P): S extends Record<P, unknown> ? S : undefined;
export function matchProp() {
  const state = arguments[0];
  const prop = arguments[1];
  // @ts-ignore
  return prop in state ? state : undefined;
}

export const managerContext = React.createContext((null as unknown) as Manager);

// We have to type as any as States<any, any> throws error not matching
// the explicit context
export const useDevtools = (id: string, reducer: [any, any]) => {
  const manager = React.useContext(managerContext);

  // We allow using the hook without having the wrapping devtool
  if (!manager) {
    return reducer;
  }

  const [state, dispatch] = reducer;

  React.useEffect(() => () => manager.dispose(id), [id, manager]);

  // @ts-ignore
  reducer[0][DEBUG_ID] = id;
  // @ts-ignore
  reducer[0][DEBUG_COMMAND] = (command: { cmd: string }) => {
    manager.onMessage(id, {
      type: 'command',
      command,
    });
  };

  reducer[1] = (action: any) => {
    action[$ACTION] = (id: string, isIgnored: boolean) => {
      manager.onMessage(id, {
        type: 'dispatch',
        action,
        ignored: isIgnored,
      });
    };

    dispatch(action);

    if (action.type === DEBUG_TRIGGER_TRANSITIONS) {
      manager.onMessage(id, {
        type: 'transitions',
        // @ts-ignore
        transitions: state[DEBUG_TRANSITIONS],
      });
      return;
    }
  };

  React.useEffect(() => {
    manager.onMessage(id, {
      type: 'state',
      state,
      // @ts-ignore
      transitions: state[DEBUG_TRANSITIONS],
      triggerTransitions: () => {
        // We dispatch to ensure the transition is run
        reducer[1]({
          type: DEBUG_TRIGGER_TRANSITIONS,
        });
      },
    });
  }, [id, manager, state]);

  return reducer;
};

export type TEmit<T extends IAction> = (event: T) => void;

export type TSubscribe<T extends IAction> = (listener: (event: T) => void) => void;

export const createEmitter = <T extends IAction>(): {
  emit: TEmit<T>;
  subscribe: TSubscribe<T>;
} => {
  const listeners: TEmit<T>[] = [];

  return {
    emit(event) {
      listeners.forEach((listener) => listener(event));
    },
    subscribe(listener) {
      listeners.push(listener);

      return () => {
        listeners.splice(listeners.indexOf(listener), 1);
      };
    },
  };
};

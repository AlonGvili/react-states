# Patterns

- [Hook](#Hook)
- [Lift Transitions](#lift-transitions)
- [BaseState](#BaseState)
- [Creators](#Creators)
- [Environment Interface](#Environment-Interface)

## Hook

Expose the reducer and related effects as a hook.

```tsx
import { useReducer } from 'react';
import { transition, TTransitions, useStateEffect } from 'react-states';

type State =
  | {
      state: 'FOO';
    }
  | {
      state: 'BAR';
    };

type Action = {
  type: 'SWITCH';
};

const transitions: TTransitions<State, Action> = {
  FOO: {
    SWITCH: () => ({
      state: 'BAR',
    }),
  },
  BAR: {
    SWITCH: () => ({
      state: 'FOO',
    }),
  },
};

const reducer = (state: State, action: Action) => transition(state, action, transitions);

// Allow setting initialState for more reusability and also
// improved testability
export const useSwitcher = (initialState?: State) => {
  const switcherReducer = useReducer(reducer, initialState || FOO());

  useDevtools('Switcher', switcherReducer);

  const [state] = switcherReducer;

  useStateEffect(state, 'BAR', () => {
    console.log('Switched to BAR');
  });

  return switcherReducer;
};
```

### Lift Transitions

```ts
import { transition, TTransitions, TTransition, ReturnTypes, PickState, IState, pick } from 'react-states';

type Action =
  | {
      type: 'GO_TO_FOO';
    }
  | {
      type: 'GO_TO_BAR';
    }
  | {
      type: 'GO_TO_BAZ';
    };

type State =
  | {
      state: 'FOO';
    }
  | {
      state: 'BAR';
    }
  | {
      state: 'BAZ';
    };

// A single transition to be used in any state
const GO_TO_FOO = (state: State) => FOO();

// Multiple transitions to be used in any state
const baseTransitions: TTransition<State, Action> = {
  GO_TO_FOO: (): State => ({
    state: 'FOO',
  }),
  GO_TO_BAR: (): State => ({
    state: 'BAR',
  }),
};

// Multiple transitions to be used in specific states
const fooBarTransitions: TTransition<State, Action, 'FOO' | 'BAR'> = {
  GO_TO_FOO: (): State => ({
    state: 'FOO',
  }),
  GO_TO_BAR: (): State => ({
    state: 'BAR',
  }),
};

// All transitions
const transitions: TTransitions<State, Action> = {
  FOO: {
    ...baseTransitions,
    ...fooBarTransitions,
    GO_TO_FOO,
  },
  BAR: {
    ...baseTransitions,
    ...fooBarTransitions,
    GO_TO_FOO,
  },
  BAZ: {
    ...baseTransitions,
    GO_TO_FOO,
  },
};
```

### BaseState

When you work with complex state it can be a good idea to define all possible values across states and then rather pick which one is being used in either state. This improves reusability and reduces duplication.

```ts
type BaseState = {
  foo: string;
  bar: number;
  baz: boolean;
};

type State =
  | ({
      state: 'FOO';
    } & Pick<BaseSTate, 'foo' | 'bar'>)
  | ({
      state: 'BAR';
    } & Pick<BaseState, 'foo' | 'baz'>);
```

## Creators

Instead of defining your state, actions and commands with explicit types you can create state/action/command creators instead. This gives additional type safety by protecting against invalid spreading and gives explicit return types. It also allow action creators to be exposed through your state.

```ts
const COMMAND_A = (someValue: string) => ({
  cmd: 'COMMAND_B' as const,
  someValue,
});

type Command = ReturnType<typeof COMMAND_A>;

const ACTION_A = (params: { foo: string; bar: string }) => ({
  type: 'ACTION_A' as const,
});

const ACTION_B = (params: { foo: string; bar: string }) => ({
  type: 'ACTION_B' as const,
});

type Action = ReturnType<typeof ACTION_A | typeof ACTION_B>;

// First argument is state related values and should always be
// destructured. This protects against TypeScript not protecting
// invalid spreading
const STATE_A = ({ foo, bar }: { foo: string; bar: string }) => ({
  state: 'STATE_A' as const,
  foo,
  bar,
});

// Use second argument for commands
const STATE_B = ({ foo, bar }: { foo: string; bar: string }, command?: Command) => ({
  state: 'STATE_B' as const,
  foo,
  bar,
  [$COMMAND]: command,
});

// When always firing a command, include it directly
const STATE_C = ({ foo, bar }: { foo: string; bar: string }) => ({
  state: 'STATE_C' as const,
  foo,
  bar,
  [$COMMAND]: COMMAND_A({ foo: 'foo', bar: 'bar' }),
});

// Include actions by spreading all or use pick utility
const STATE_D = ({ foo, bar }: { foo: string; bar: string }) => ({
  state: 'STATE_D' as const,
  foo,
  bar,
});
```

You can include action creators with the state to emphasize what actions are available in what states.

```ts
const ACTION_A = (params: { foo: string; bar: string }) => ({
  type: 'ACTION_A' as const,
});

type Action = ReturnType<typeof ACTION_A>;

const STATE_A = ({ foo, bar }: { foo: string; bar: string }) => ({
  state: 'STATE_A' as const,
  foo,
  bar,
  ACTION_A,
});

type State = ReturnType<typeof STATE_A>;
```

```tsx
const [state, dispatch] = useReducer(reducer);

dispatch(state.ACTION_A({ foo: 'foo', bar: 'bar' }));
```

# Environment Interface

```tsx
import * as React from 'react';
import { createEmitter } from 'react-states';

export type EnvironmentEvent =
  | {
      type: 'DATA-FETCHER:FETCH_SUCCESS';
      data: any[];
    }
  | {
      type: 'DATA-FETCHER:FETCH_ERROR';
      error: string;
    };

export type Environment = {
  dataFetcher: {
    fetch(): void;
  };
};

const context = React.createContext({} as Environment);

export const useEnvironment = () => React.useContext(context);

export const EnvironmentProvider: React.FC<{ environment: Environment }> = ({ children, environment }) => (
  <context.Provider value={environment}>{children}</context.Provider>
);

export const createEnvironment = (constr: (emit: TEmit<EnvironmentEvent>) => Environment) => {
  const emitter = createEmitter<EnvironmentEvent>();
  return {
    ...emitter,
    ...constr(emitter.emit),
  };
};
```

```ts
import { createEnvironment } from '../environment-interface';

export const environment = createEnvironment((emit) => ({
  dataFetcher: {
    fetch: () => {
      emit({ type: 'DATA-FETCHER:FETCH_SUCCESS' });
    },
  },
}));
```

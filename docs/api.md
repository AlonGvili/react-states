# API

## Transition

```ts
import { transition } from 'react-states';

type State =
  | {
      state: 'NOT_LOADED';
    }
  | {
      state: 'LOADING';
    }
  | {
      state: 'LOADED';
      data: string[];
    }
  | {
      state: 'ERROR';
      error: string;
    };

type Action =
  | {
      type: 'LOAD';
    }
  | {
      type: 'LOAD_SUCCESS';
      data: string[];
    }
  | {
      type: 'LOAD_ERROR';
      error: string;
    };

const reducer = (state: State, action: Action) =>
  transition(state, action, {
    NOT_LOADED: {
      LOAD: (): State => ({ state: 'LOADING' }),
    },
    LOADING: {
      LOAD_SUCCESS: (_, { data }): State => ({ state: 'LOADED', data }),
      LOAD_ERROR: (_, { error }): State => ({ state: 'ERROR', error }),
    },
    LOADED: {},
    ERRORL: {},
  });
```

### Utilities

#### match

```tsx
import { match } from 'react-states';
import { useData } from './useData';

const DataComponent = () => {
  const [state, dispatch] = useData();

  return (
    <div>
      {match(state, {
        NOT_LOADED: () => <button onClick={() => dispatch({ type: 'LOAD' })}>Load data</button>,
        LOADING: () => 'Loading...',
        LOADED: ({ data }) => (
          <ul>
            {data.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ),
        ERROR: ({ error }) => <span style={{ color: 'red' }}>{error}</span>,
      })}
    </div>
  );
};
```

#### matchProp

```tsx
import { matchProp } from 'react-states';
import { useData } from './useData';

const DataComponent = () => {
  const [state, dispatch] = useData();

  const data = matchProp(state, 'data')?.data ?? [];

  return (
    <ul>
      {data.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};
```

#### useStateEffect

```tsx
import { useStateEffect } from 'react-states';
import { useData } from './useData';

const DataComponent = () => {
  const [state, dispatch] = useData();

  useStateEffect(state, 'NOT_LOADED', () => {
    fetch('/data')
      .then((response) => response.json())
      .then((data) =>
        dispatch({
          type: 'LOAD_SUCCESS',
          data,
        }),
      )
      .catch((error) =>
        dispatch({
          type: 'LOAD_ERROR',
          error: error.message,
        }),
      );
  });

  return <div />;
};
```

#### useCommandEffect

```tsx
import { transition, $COMMAND } from 'react-states';

type Command = {
  cmd: 'SAVE_DATA';
  data: string[];
};

type State =
  | {
      state: 'LOADING';
    }
  | {
      state: 'LOADED';
      [$COMMAND]?: Command;
    }
  | {
      state: 'ERROR';
      error: string;
    };

type Action =
  | {
      type: 'LOAD';
    }
  | {
      type: 'LOAD_SUCCESS';
      data: string[];
    }
  | {
      type: 'LOAD_ERROR';
      error: string;
    }
  | {
      type: 'ADD_ITEM';
    };

const reducer = (state: State, action: Action) =>
  transition(state, action, {
    LOADING: {
      LOAD_SUCCESS: (_, { data }): State => ({
        state: 'LOADED',
        data,
      }),
      LOAD_ERROR: (_, { error }): State => ({
        state: 'ERROR',
        error,
      }),
    },
    LOADED: {
      ADD_ITEM: ({ data }, { item }): State => {
        const data = [item].concat(data);

        return {
          state: 'LOADED',
          data,
          [$COMMAND]: {
            cmd: 'SAVE_DATA',
            data,
          },
        };
      },
    },
    ERROR: {},
  });

const DataComponent = () => {
  const [state, dispatch] = useReducer(reducer, { state: 'LOADING' });

  useCommandEffect(state, 'SAVE_DATA', ({ data }) => {
    localStorage.setItem('data', JSON.stringify(data));
  });

  return <div />;
};
```

#### renderReducer

```tsx
import { act } from '@testing-library/react';
import { renderReducer } from 'react-states/test';
import { createEnvironment } from './environments/test';

it('should do something', () => {
  const environment = createEnvironment();
  const [state, dispatch] = renderReducer(
    () => useData(),
    (UseData) => (
      <EnvironmentProvider environment={environment}>
        <UseData />
      </EnvironmentProvider>
    ),
  );

  act(() => {
    dispatch({ type: 'LOAD' });
  });

  expect(state.state).toBe('LOADING');

  expect(environment.dataLoader.load).toBeCalled();

  act(() => {
    environment.emitter.emit({
      type: 'DATA:LOAD_SUCCESS',
      items: ['foo', 'bar'],
    });
  });

  expect(state).toEqual({
    state: 'LOADED',
    items: ['foo', 'bar'],
  });
});
```

### Utility Types

#### TTransitions

```ts
import { transition, TTransitions } from 'react-states';

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
    SWITCH: (state, action): State => ({
      state: 'BAR',
    }),
  },
  BAR: {
    SWITCH: (state, action): State => ({
      state: 'FOO',
    }),
  },
};

const reducer = (state: State, action: Action) => transition(state, action, transitions);
```

#### TTransition

```ts
import { transition, TTransitions, TTransition } from 'react-states';

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

const fooTransitions: TTransition<State, Action, 'FOO'> = {
  SWITCH: (state, action): State => ({
    state: 'FOO',
  }),
};

const transitions: TTransitions<State, Action> = {
  FOO: fooTransitions,
  BAR: {
    SWITCH: (state, action): State => ({
      state: 'FOO',
    }),
  },
};

const reducer = (state: State, action: Action) => transition(state, action, transitions);

const transitions: TTransitions<State, Action> = {
  FOO: fooTransitions,
  BAR: {
    SWITCH: (): State => ({
      state: 'FOO',
    }),
  },
};
```

#### PickState

```ts
type ABState = PickState<State, 'A' | 'B'>;
```

#### PickAction

```ts
type ABAction = PickAction<Action, 'A' | 'B'>;
```

#### PickCommand

```ts
type ABCommand = PickCommand<Command, 'A' | 'B'>;
```

### Devtools

#### DevtoolsProvider

```tsx
import { DevtoolsProvider } from 'react-states/devtools';

export const AppWrapper: React.FC = () => {
  return (
    <DevtoolsProvider>
      <App />
    </DevtoolsProvider>
  );
};
```

#### useDevtools

```tsx
import { useReducer } from 'react';
import { useDevtools } from 'react-states/devtools';

export const SomeComponent: React.FC = () => {
  const dataReducer = useData();

  useDevtools('Data', dataReducer);

  const [state, dispatch] = dataReducer;

  return <div />;
};
```

import { transition, PickCommand, $COMMAND } from '../../src';

type Todo = {
  title: string;
  completed: boolean;
};

type Command = {
  cmd: 'SAVE_TODO';
  todo: Todo;
};

type State =
  | {
      state: 'NOT_LOADED';
    }
  | {
      state: 'LOADING';
    }
  | {
      state: 'LOADED';
      todos: Todo[];
      [$COMMAND]?: PickCommand<Command, 'SAVE_TODO'>;
    }
  | {
      state: 'ERROR';
      error: string;
    };

type Action =
  | {
      type: 'ADD_TODO';
      todo: Todo;
    }
  | {
      type: 'FETCH_TODOS';
    }
  | {
      type: 'FETCH_TODOS_SUCCESS';
      todos: Todo[];
    }
  | {
      type: 'FETCH_TODOS_ERROR';
      error: string;
    };

export const reducer = (state: State, action: Action) =>
  transition(state, action, {
    NOT_LOADED: {
      FETCH_TODOS: (): State => ({
        state: 'LOADING',
      }),
    },
    LOADING: {
      FETCH_TODOS_SUCCESS: (_, { todos }): State => ({
        state: 'LOADED',
        todos,
      }),
      FETCH_TODOS_ERROR: (_, { error }): State => ({
        state: 'ERROR',
        error,
      }),
    },
    LOADED: {
      ADD_TODO: (state, { todo }): State => ({
        state: 'LOADED',
        todos: [todo].concat(state.todos),
        [$COMMAND]: {
          cmd: 'SAVE_TODO',
          todo,
        },
      }),
    },
    ERROR: {},
  });

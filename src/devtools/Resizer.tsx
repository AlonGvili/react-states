import * as React from 'react';
import { StatesTransition, useCommandEffect, useStateEffect, createReducer, States } from '../';
import { colors } from './styles';

type State =
  | {
      state: 'IDLE';
    }
  | {
      state: 'DETECTING_RESIZE';
      initialX: number;
    }
  | {
      state: 'RESIZING';
      x: number;
    };

type Action =
  | {
      type: 'MOUSE_MOVE';
      x: number;
    }
  | {
      type: 'MOUSE_UP';
      x: number;
    }
  | {
      type: 'MOUSE_UP_RESIZER';
    }
  | {
      type: 'MOUSE_DOWN';
      x: number;
    };

type Command =
  | {
      cmd: 'NOTIFY_RESIZE';
      x: number;
    }
  | {
      cmd: 'NOTIFY_CLICK';
    };

type Resizer = States<State, Action, Command>;

type Transition = StatesTransition<Resizer>;

const reducer = createReducer<Resizer>({
  IDLE: {
    MOUSE_DOWN: (_, { x }): Transition => ({
      state: 'DETECTING_RESIZE',
      initialX: x,
    }),
  },
  DETECTING_RESIZE: {
    MOUSE_MOVE: (state, { x }): Transition => {
      if (Math.abs(x - state.initialX) > 3) {
        return { state: 'RESIZING', x };
      }

      return state;
    },
    MOUSE_UP: (): Transition => ({ state: 'IDLE' }),
    MOUSE_UP_RESIZER: (_): Transition => [
      { state: 'IDLE' },
      {
        cmd: 'NOTIFY_CLICK',
      },
    ],
  },
  RESIZING: {
    MOUSE_MOVE: (state, { x }): Transition => [
      { ...state, x },
      { cmd: 'NOTIFY_RESIZE', x },
    ],
    MOUSE_UP: (): Transition => ({ state: 'IDLE' }),
  },
});

export const Resizer = ({
  onResize,
  onClick,
  isOpen,
}: {
  onResize: (width: number) => void;
  onClick: () => void;
  isOpen: boolean;
}) => {
  const [resizer, dispatch] = React.useReducer(reducer, { state: 'IDLE' });

  useStateEffect(resizer, ['DETECTING_RESIZE', 'RESIZING'], () => {
    const onMouseMove = (event: MouseEvent) => {
      dispatch({
        type: 'MOUSE_MOVE',
        x: event.clientX,
      });
    };
    const onMouseUp = (event: MouseEvent) => {
      dispatch({
        type: 'MOUSE_UP',
        x: event.clientX,
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  });

  useCommandEffect(resizer, 'NOTIFY_RESIZE', ({ x }) => {
    onResize(window.innerWidth - x);
  });

  useCommandEffect(resizer, 'NOTIFY_CLICK', () => {
    onClick();
  });

  return (
    <div
      style={{
        position: 'absolute',
        height: '100%',
        width: '10px',
        backgroundColor: colors.blue,
        userSelect: 'none',
      }}
      onMouseUp={() => {
        dispatch({
          type: 'MOUSE_UP_RESIZER',
        });
      }}
      onMouseDown={(event) => {
        dispatch({
          type: 'MOUSE_DOWN',
          x: event.clientX,
        });
      }}
    />
  );
};
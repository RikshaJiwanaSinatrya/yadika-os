import { useEffect, useReducer, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  calculatorReducer,
  formatDisplay,
  initialCalculatorState,
} from './calculatorLogic';
import type { CalculatorAction } from './calculatorLogic';

interface KeyDefinition {
  label: string;
  action: CalculatorAction;
  variant: 'function' | 'digit' | 'operator' | 'equals';
  span?: boolean;
}

const KEY_GRID: KeyDefinition[] = [
  { label: 'C', action: { type: 'clear' }, variant: 'function' },
  { label: '±', action: { type: 'toggle-sign' }, variant: 'function' },
  { label: '%', action: { type: 'percent' }, variant: 'function' },
  { label: '÷', action: { type: 'operator', operator: '÷' }, variant: 'operator' },

  { label: '7', action: { type: 'digit', digit: '7' }, variant: 'digit' },
  { label: '8', action: { type: 'digit', digit: '8' }, variant: 'digit' },
  { label: '9', action: { type: 'digit', digit: '9' }, variant: 'digit' },
  { label: '×', action: { type: 'operator', operator: '×' }, variant: 'operator' },

  { label: '4', action: { type: 'digit', digit: '4' }, variant: 'digit' },
  { label: '5', action: { type: 'digit', digit: '5' }, variant: 'digit' },
  { label: '6', action: { type: 'digit', digit: '6' }, variant: 'digit' },
  { label: '−', action: { type: 'operator', operator: '−' }, variant: 'operator' },

  { label: '1', action: { type: 'digit', digit: '1' }, variant: 'digit' },
  { label: '2', action: { type: 'digit', digit: '2' }, variant: 'digit' },
  { label: '3', action: { type: 'digit', digit: '3' }, variant: 'digit' },
  { label: '+', action: { type: 'operator', operator: '+' }, variant: 'operator' },

  { label: '0', action: { type: 'digit', digit: '0' }, variant: 'digit', span: true },
  { label: '.', action: { type: 'decimal' }, variant: 'digit' },
  { label: '=', action: { type: 'equals' }, variant: 'equals' },
];

const KEY_STYLES: Record<KeyDefinition['variant'], string> = {
  function: 'bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-slate-200',
  digit: 'bg-white/[0.06] text-slate-100 hover:bg-white/[0.12]',
  operator: 'bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20',
  equals:
    'bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 font-semibold hover:brightness-110',
};

function keyToAction(key: string): CalculatorAction | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key };
  switch (key) {
    case '.':
    case ',':
      return { type: 'decimal' };
    case '+':
      return { type: 'operator', operator: '+' };
    case '-':
      return { type: 'operator', operator: '−' };
    case '*':
    case 'x':
      return { type: 'operator', operator: '×' };
    case '/':
      return { type: 'operator', operator: '÷' };
    case 'Enter':
    case '=':
      return { type: 'equals' };
    case 'Backspace':
      return { type: 'backspace' };
    case 'Escape':
    case 'c':
    case 'C':
      return { type: 'clear' };
    case '%':
      return { type: 'percent' };
    default:
      return null;
  }
}

export function CalculatorApp() {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);
  const keypadRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const action = keyToAction(event.key);
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  };

  // Focus the keypad so keyboard input works as soon as the window opens.
  useEffect(() => {
    keypadRef.current?.focus();
  }, []);

  const hint =
    state.lastExpression ??
    (state.accumulator !== null && state.pendingOperator !== null
      ? `${formatDisplay(String(state.accumulator))} ${state.pendingOperator}`
      : '');

  return (
    <div
      ref={keypadRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex h-full flex-col gap-3 p-4 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-300/40"
    >
      <output
        aria-live="polite"
        className="flex min-h-16 flex-col items-end justify-end rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-right"
      >
        <span className="h-4 truncate text-[11px] tabular-nums text-cyan-300/60">{hint}</span>
        <span className="w-full truncate text-3xl font-light tabular-nums text-white">
          {formatDisplay(state.display)}
        </span>
      </output>

      <div
        role="group"
        aria-label="Keypad"
        className="grid flex-1 grid-cols-4 grid-rows-5 gap-1.5"
      >
        {KEY_GRID.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => dispatch(key.action)}
            className={`rounded-lg text-sm transition active:scale-95 ${KEY_STYLES[key.variant]} ${
              key.span ? 'col-span-2' : ''
            }`}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}

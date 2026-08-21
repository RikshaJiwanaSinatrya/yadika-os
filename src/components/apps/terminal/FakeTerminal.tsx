import { useEffect, useReducer, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  PROMPT_HOST,
  PROMPT_USER,
  initialTerminalState,
  runCommand,
  terminalReducer,
} from './terminalLogic';
import type { LineKind } from './terminalLogic';

const LINE_STYLES: Record<Exclude<LineKind, 'input'>, string> = {
  output: 'text-slate-300',
  error: 'text-red-400',
  success: 'text-emerald-300',
  muted: 'text-slate-500',
};

function Prompt() {
  return (
    <span className="shrink-0 select-none">
      <span className="text-cyan-300">
        {PROMPT_USER}@{PROMPT_HOST}
      </span>
      <span className="text-slate-500">:</span>
      <span className="text-indigo-300">~</span>
      <span className="text-slate-500">$ </span>
    </span>
  );
}

export function FakeTerminal({ offline = false }: { offline?: boolean }) {
  const [state, dispatch] = useReducer(terminalReducer, initialTerminalState);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (offline) {
      dispatch({
        type: 'submit',
        input: '',
        output: [
          { kind: 'error', text: 'Backend terminal tidak terhubung — mode simulasi (ysh).' },
          { kind: 'muted', text: 'Jalankan `npm run dev` atau `npm start` untuk shell asli.' },
        ],
        shouldClear: false,
      });
    }
  }, [offline]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state.lines]);

  const submit = (input: string) => {
    const result = runCommand(input, state.history);
    dispatch({ type: 'submit', input, output: result.output, shouldClear: result.shouldClear });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey) {
      if (event.key === 'l') {
        event.preventDefault();
        dispatch({ type: 'clear' });
      } else if (event.key === 'c') {
        event.preventDefault();
        dispatch({ type: 'cancel' });
      }
      return;
    }

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        submit(state.draft);
        break;
      case 'ArrowUp':
        event.preventDefault();
        dispatch({ type: 'history-previous' });
        break;
      case 'ArrowDown':
        event.preventDefault();
        dispatch({ type: 'history-next' });
        break;
      case 'Tab': {
        event.preventDefault();
        dispatch({ type: 'complete' });
        break;
      }
    }
  };

  return (
    <div
      className="h-full bg-black font-mono text-[13px] leading-relaxed"
      onPointerDown={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="os-scroll h-full overflow-y-auto p-3" aria-live="polite">
        {state.lines.map((line) => (
          <div key={line.id} className="whitespace-pre-wrap break-words">
            {line.kind === 'input' ? (
              <>
                <Prompt />
                <span className="text-slate-100">{line.text}</span>
              </>
            ) : (
              <span className={LINE_STYLES[line.kind]}>{line.text || '\u00a0'}</span>
            )}
          </div>
        ))}

        <div className="flex items-baseline">
          <Prompt />
          <input
            ref={inputRef}
            value={state.draft}
            onChange={(e) => dispatch({ type: 'set-draft', value: e.target.value })}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Terminal input"
            className="min-w-0 flex-1 bg-transparent text-slate-100 caret-emerald-300 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

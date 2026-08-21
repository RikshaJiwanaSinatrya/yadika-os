import { APP_LIST } from '../../../apps/registry';
import { useWindowStore } from '../../../store/windowStore';

export type LineKind = 'input' | 'output' | 'error' | 'success' | 'muted';

export interface TerminalLine {
  id: number;
  kind: LineKind;
  text: string;
}

export interface CommandOutput {
  kind: LineKind;
  text: string;
}

export const PROMPT_USER = 'guest';
export const PROMPT_HOST = 'yadika';
export const HOME_PATH = '/home/guest';

const APP_ALIASES: Record<string, string> = {
  calc: 'calculator',
  files: 'explorer',
};

const VIRTUAL_FILES: Record<string, string> = {
  'welcome.txt':
    'Welcome to Yadika OS!\nThis desktop lives entirely in your browser.\nExplore the apps, tweak the settings, and enjoy the ride.',
  'todo.md': '# Todo\n\n- [x] Ship Phase 2\n- [ ] Terminal (done!)\n- [ ] Conquer the world',
  'secret.txt': 'Nice try. Some things stay off the record.',
};

const HELP_ROWS: Array<[string, string]> = [
  ['help', 'List available commands'],
  ['clear', 'Clear the terminal'],
  ['echo <text>', 'Print text back'],
  ['date', 'Show current date and time'],
  ['whoami', 'Show the current user'],
  ['pwd', 'Print working directory'],
  ['ls', 'List files in home'],
  ['cat <file>', 'Print a file'],
  ['apps', 'List installed apps'],
  ['open <app>', 'Launch an app'],
  ['history', 'Show command history'],
  ['neofetch', 'System info with flair'],
];

const LOGO_ART = [
  '    /\\',
  '   /  \\',
  '  / /\\ \\',
  ' / ____ \\',
  '/_/    \\_\\',
];

function formatUptime(): string {
  const totalSeconds = Math.floor(performance.now() / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function tokenize(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

export function completeCommand(partial: string): string | null {
  if (!partial) return null;
  const matches = COMMAND_NAMES.filter((name) => name.startsWith(partial.toLowerCase()));
  return matches.length === 1 ? matches[0] : null;
}

interface CommandContext {
  args: string[];
  history: readonly string[];
}

type CommandHandler = (ctx: CommandContext) => CommandOutput[];

const COMMANDS: Record<string, CommandHandler> = {
  help: () =>
    HELP_ROWS.map(([command, description]) => ({
      kind: 'output',
      text: `  ${command.padEnd(16)}${description}`,
    })),
  clear: () => [],
  echo: ({ args }) => [{ kind: 'output', text: args.join(' ') }],
  date: () => [{ kind: 'output', text: new Date().toLocaleString() }],
  whoami: () => [{ kind: 'output', text: PROMPT_USER }],
  pwd: () => [{ kind: 'output', text: HOME_PATH }],
  ls: () => [
    {
      kind: 'output',
      text: Object.keys(VIRTUAL_FILES).join('   '),
    },
  ],
  cat: ({ args }) => {
    const name = args[0];
    if (!name) return [{ kind: 'error', text: 'usage: cat <file>' }];
    const file = VIRTUAL_FILES[name];
    if (!file) return [{ kind: 'error', text: `cat: ${name}: No such file` }];
    return file.split('\n').map((text) => ({ kind: 'output', text }));
  },
  apps: () =>
    APP_LIST.map((app) => ({
      kind: 'output',
      text: `  ${app.id.padEnd(12)}${app.title}`,
    })),
  open: ({ args }) => {
    const query = args[0]?.toLowerCase();
    if (!query) return [{ kind: 'error', text: 'usage: open <app>' }];

    const app =
      APP_LIST.find((candidate) => candidate.id === query) ??
      APP_LIST.find((candidate) => candidate.id === APP_ALIASES[query]) ??
      APP_LIST.find((candidate) => candidate.id.startsWith(query));

    if (!app) {
      return [
        { kind: 'error', text: `open: no app named "${args[0]}"` },
        { kind: 'muted', text: 'Run `apps` to see what is installed.' },
      ];
    }

    useWindowStore.getState().openWindow(app.id);
    return [{ kind: 'success', text: `Launching ${app.title}…` }];
  },
  history: ({ history }) =>
    history.length === 0
      ? [{ kind: 'muted', text: 'No commands yet.' }]
      : history.map((command, index) => ({
          kind: 'output',
          text: `  ${(index + 1).toString().padStart(3)}  ${command}`,
        })),
  neofetch: () => {
    const label = `${PROMPT_USER}@${PROMPT_HOST}`;
    const info = [
      `${label}`,
      '-'.repeat(label.length),
      'OS: Yadika OS 0.2.0',
      'Shell: ysh 1.0.0',
      `Resolution: ${window.innerWidth}x${window.innerHeight}`,
      `Uptime: ${formatUptime()}`,
      'Theme: Glass Dark',
    ];
    const width = Math.max(...LOGO_ART.map((line) => line.length));
    const rowCount = Math.max(LOGO_ART.length, info.length);
    const rows: CommandOutput[] = [];
    for (let i = 0; i < rowCount; i += 1) {
      const art = (LOGO_ART[i] ?? '').padEnd(width + 4);
      const text = info[i] ?? '';
      rows.push({ kind: i < LOGO_ART.length ? 'success' : 'output', text: `${art}${text}` });
    }
    return rows;
  },
  sudo: () => [
    { kind: 'error', text: 'sudo: permission denied' },
    { kind: 'muted', text: 'You are already the master of this browser.' },
  ],
};

export const COMMAND_NAMES = Object.keys(COMMANDS);

export interface CommandResult {
  output: CommandOutput[];
  shouldClear: boolean;
}

export function runCommand(input: string, history: readonly string[]): CommandResult {
  const tokens = tokenize(input);
  if (tokens.length === 0) return { output: [], shouldClear: false };

  const [name, ...args] = tokens;
  const handler = COMMANDS[name.toLowerCase()];
  if (!handler) {
    return {
      output: [{ kind: 'error', text: `ysh: command not found: ${name}` }],
      shouldClear: false,
    };
  }

  return { output: handler({ args, history }), shouldClear: name.toLowerCase() === 'clear' };
}

export interface TerminalState {
  lines: TerminalLine[];
  history: string[];
  historyIndex: number | null;
  draft: string;
  savedDraft: string;
  nextId: number;
}

export type TerminalAction =
  | {
      type: 'submit';
      input: string;
      output: CommandOutput[];
      shouldClear: boolean;
    }
  | { type: 'set-draft'; value: string }
  | { type: 'history-previous' }
  | { type: 'history-next' }
  | { type: 'complete' }
  | { type: 'cancel' }
  | { type: 'clear' };

const BANNER: CommandOutput[] = [
  { kind: 'muted', text: 'Yadika OS terminal — ysh 1.0.0' },
  { kind: 'muted', text: 'Type `help` to see available commands.' },
];

export const initialTerminalState: TerminalState = {
  lines: BANNER.map((line, index) => ({ ...line, id: index })),
  history: [],
  historyIndex: null,
  draft: '',
  savedDraft: '',
  nextId: BANNER.length,
};

export function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'submit': {
      const trimmed = action.input.trim();
      let nextId = state.nextId;

      const inputLine: TerminalLine = { id: nextId++, kind: 'input', text: action.input };
      const baseLines = action.shouldClear ? [] : [...state.lines, inputLine];
      const outputLines = action.output.map((line) => ({ ...line, id: nextId++ }));

      const history =
        trimmed && state.history[state.history.length - 1] !== trimmed
          ? [...state.history, trimmed]
          : state.history;

      return {
        lines: [...baseLines, ...outputLines],
        history,
        historyIndex: null,
        draft: '',
        savedDraft: '',
        nextId,
      };
    }
    case 'set-draft':
      return { ...state, draft: action.value, historyIndex: null };
    case 'history-previous': {
      if (state.history.length === 0) return state;
      if (state.historyIndex === null) {
        return {
          ...state,
          savedDraft: state.draft,
          historyIndex: state.history.length - 1,
          draft: state.history[state.history.length - 1],
        };
      }
      const index = Math.max(0, state.historyIndex - 1);
      return { ...state, historyIndex: index, draft: state.history[index] };
    }
    case 'history-next': {
      if (state.historyIndex === null) return state;
      const index = state.historyIndex + 1;
      if (index >= state.history.length) {
        return { ...state, historyIndex: null, draft: state.savedDraft };
      }
      return { ...state, historyIndex: index, draft: state.history[index] };
    }
    case 'complete': {
      const parts = state.draft.split(/\s+/);
      const last = parts[parts.length - 1] ?? '';
      const completed = completeCommand(last);
      if (!completed || completed === last) return state;
      parts[parts.length - 1] = completed;
      return { ...state, draft: parts.join(' ') };
    }
    case 'cancel': {
      if (!state.draft) return state;
      return {
        ...state,
        lines: [
          ...state.lines,
          { id: state.nextId, kind: 'input', text: `${state.draft}^C` },
        ],
        draft: '',
        historyIndex: null,
        nextId: state.nextId + 1,
      };
    }
    case 'clear':
      return { ...state, lines: [] };
  }
}

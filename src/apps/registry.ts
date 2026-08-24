import type { ComponentType, SVGProps } from 'react';
import type { AppProps, WindowSize } from '../types/window';
import {
  CalculatorIcon,
  FileIcon,
  FolderIcon,
  NotesIcon,
  SettingsIcon,
  TerminalIcon,
} from '../components/icons/icons';
import { CalculatorApp } from '../components/apps/calculator/CalculatorApp';
import { EditorApp } from '../components/apps/editor/EditorApp';
import { ExplorerApp } from '../components/apps/explorer/ExplorerApp';
import { NotesApp } from '../components/apps/notes/NotesApp';
import { SettingsApp } from '../components/apps/settings/SettingsApp';
import { TerminalApp } from '../components/apps/terminal/TerminalApp';

/**
 * Static definition of an application. The window manager only talks to
 * this registry, so new apps can be added without touching OS internals.
 */
export interface AppDefinition {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  defaultSize: WindowSize;
  /** Real UI for the app. Apps without a component fall back to a placeholder. */
  component?: ComponentType<AppProps>;
}

export const APP_REGISTRY: Record<string, AppDefinition> = {
  explorer: {
    id: 'explorer',
    title: 'File Explorer',
    icon: FolderIcon,
    defaultSize: { width: 760, height: 480 },
    component: ExplorerApp,
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    icon: NotesIcon,
    defaultSize: { width: 560, height: 420 },
    component: NotesApp,
  },
  calculator: {
    id: 'calculator',
    title: 'Calculator',
    icon: CalculatorIcon,
    defaultSize: { width: 360, height: 480 },
    component: CalculatorApp,
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    icon: TerminalIcon,
    defaultSize: { width: 640, height: 400 },
    component: TerminalApp,
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    icon: SettingsIcon,
    defaultSize: { width: 720, height: 500 },
    component: SettingsApp,
  },
  editor: {
    id: 'editor',
    title: 'Editor',
    icon: FileIcon,
    defaultSize: { width: 680, height: 480 },
    component: EditorApp,
  },
};

export const APP_LIST: AppDefinition[] = Object.values(APP_REGISTRY);

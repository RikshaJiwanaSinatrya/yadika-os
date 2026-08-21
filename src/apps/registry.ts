import type { ComponentType, SVGProps } from 'react';
import type { WindowSize } from '../types/window';
import {
  CalculatorIcon,
  FolderIcon,
  NotesIcon,
  SettingsIcon,
  TerminalIcon,
} from '../components/icons/icons';

/**
 * Static definition of an application. The window manager only talks to
 * this registry, so new apps can be added without touching OS internals.
 */
export interface AppDefinition {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  defaultSize: WindowSize;
  /** Real UI for the app. Phase 1 apps fall back to a placeholder. */
  component?: ComponentType;
}

export const APP_REGISTRY: Record<string, AppDefinition> = {
  explorer: {
    id: 'explorer',
    title: 'File Explorer',
    icon: FolderIcon,
    defaultSize: { width: 760, height: 480 },
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    icon: NotesIcon,
    defaultSize: { width: 560, height: 420 },
  },
  calculator: {
    id: 'calculator',
    title: 'Calculator',
    icon: CalculatorIcon,
    defaultSize: { width: 360, height: 480 },
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    icon: TerminalIcon,
    defaultSize: { width: 640, height: 400 },
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    icon: SettingsIcon,
    defaultSize: { width: 720, height: 500 },
  },
};

export const APP_LIST: AppDefinition[] = Object.values(APP_REGISTRY);

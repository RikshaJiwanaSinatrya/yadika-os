export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowBounds {
  position: WindowPosition;
  size: WindowSize;
}

export type WindowSnap = 'full' | 'left' | 'right' | null;

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: WindowPosition;
  size: WindowSize;
  /** Bounds to restore to after leaving maximized/snapped state. */
  previousBounds: WindowBounds | null;
  /** Which edge this window is snapped to ('full' == maximized). */
  snap: WindowSnap;
  /** App-specific launch parameters (e.g. file path for the editor). */
  params?: Record<string, string>;
}

export interface WorkArea {
  width: number;
  height: number;
}


/** Props handed to every registered app component. */
export interface AppProps {
  win: WindowState;
}

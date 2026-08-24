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
  /** Bounds to restore to after leaving maximized state. */
  previousBounds: WindowBounds | null;
  /** App-specific launch parameters (e.g. file path for the editor). */
  params?: Record<string, string>;
}

/** Props handed to every registered app component. */
export interface AppProps {
  win: WindowState;
}

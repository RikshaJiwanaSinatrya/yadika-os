import type { ITheme } from '@xterm/xterm';

/**
 * Kitty's default dark palette, taken verbatim from the upstream
 * template.conf so the web terminal matches a real kitty session.
 */
export const KITTY_THEME: ITheme = {
  foreground: '#dddddd',
  background: '#000000',
  cursor: '#cccccc',
  cursorAccent: '#111111',
  selectionForeground: '#000000',
  selectionBackground: '#fffacd',
  black: '#000000',
  brightBlack: '#767676',
  red: '#cc0403',
  brightRed: '#f2201f',
  green: '#19cb00',
  brightGreen: '#23fd00',
  yellow: '#cecb00',
  brightYellow: '#fffd00',
  blue: '#0d73cc',
  brightBlue: '#1a8fff',
  magenta: '#cb1ed1',
  brightMagenta: '#fd28ff',
  cyan: '#0dcdcd',
  brightCyan: '#14ffff',
  white: '#dddddd',
  brightWhite: '#ffffff',
};

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9v8A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17Z" />
    </IconBase>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6M9 12h6M9 16h3.5" />
    </IconBase>
  );
}

export function CalculatorIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M8.5 7.5h7" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </IconBase>
  );
}

export function TerminalIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
      <path d="m7 9.5 3 3-3 3M12.5 15.5H17" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </IconBase>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 9.5a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 16.5a4 4 0 0 1 4 0" />
      <path d="M12 19.5h.01" />
    </IconBase>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 10v4h3l4 3.5v-11L7 10Z" />
      <path d="M14.5 9.5a4 4 0 0 1 0 5M17 7a7.5 7.5 0 0 1 0 10" />
    </IconBase>
  );
}

export function BatteryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="8" width="17" height="8" rx="1.5" />
      <path d="M21.5 11v2" />
      <rect x="4.5" y="10" width="10" height="4" rx="0.5" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function MinimizeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 12h12" />
    </IconBase>
  );
}

export function MaximizeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </IconBase>
  );
}

export function RestoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="8.5" width="10.5" height="10.5" rx="1" />
      <path d="M8.5 8.5V6a1 1 0 0 1 1-1H18a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-2.5" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </IconBase>
  );
}

/** Brand mark used by the Start button. */
export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 2.5c1.1 4.6 2.9 6.4 7.5 7.5-4.6 1.1-6.4 2.9-7.5 7.5-1.1-4.6-2.9-6.4-7.5-7.5 4.6-1.1 6.4-2.9 7.5-7.5Z"
        fill="url(#logo-gradient)"
      />
      <circle cx="18.5" cy="18.5" r="2.2" fill="url(#logo-gradient)" opacity={0.85} />
      <defs>
        <linearGradient id="logo-gradient" x1="4" y1="4" x2="20" y2="20">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

import { useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { ClockIcon, InfoIcon, PaletteIcon } from '../../icons/icons';
import { AppearanceSection } from './AppearanceSection';
import { DateTimeSection } from './DateTimeSection';
import { AboutSection } from './AboutSection';

type SectionId = 'appearance' | 'datetime' | 'about';

const SECTIONS: Array<{
  id: SectionId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
  { id: 'datetime', label: 'Date & Time', icon: ClockIcon },
  { id: 'about', label: 'About', icon: InfoIcon },
];

export function SettingsApp() {
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');

  return (
    <div className="flex h-full">
      <nav
        aria-label="Settings sections"
        className="w-40 shrink-0 space-y-1 border-r border-white/10 p-2"
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveSection(id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-300/80' : ''}`} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="os-scroll min-w-0 flex-1 overflow-y-auto p-5">
        {activeSection === 'appearance' && <AppearanceSection />}
        {activeSection === 'datetime' && <DateTimeSection />}
        {activeSection === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <header className="mb-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
    </header>
  );
}

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border px-4 py-3">
      <h1 className="text-lg font-bold tracking-tight">{title}</h1>
    </header>
  );
}

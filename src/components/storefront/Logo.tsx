import { useSettings } from '@/lib/queries';

export function Logo({
  className = 'h-9 w-auto',
  variant = 'light',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  const { data: settings } = useSettings();
  const logoUrl = settings?.logo_url;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={settings?.business_name ?? 'Milano Foods'}
        className={`object-contain ${className}`}
      />
    );
  }

  const textColor = variant === 'dark' ? 'text-white' : 'text-ink-900';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white font-heading text-lg font-bold shrink-0">
        M
      </span>
      <span className={`font-heading text-xl font-bold ${textColor} leading-none tracking-tight`}>
        Milano<span className="text-primary">.</span>
      </span>
    </div>
  );
}

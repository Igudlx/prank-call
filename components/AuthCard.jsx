'use client';

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-panel border border-line mb-4">
            <span className="font-mono text-accent text-lg">☎</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted text-sm mt-2">{subtitle}</p>}
        </div>
        <div className="bg-panel border border-line rounded-lg p-6">{children}</div>
      </div>
    </div>
  );
}

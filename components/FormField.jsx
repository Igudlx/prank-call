'use client';

export default function FormField({ label, ...props }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm text-muted mb-1.5">{label}</span>
      <input
        {...props}
        className="w-full rounded-md bg-panel2 border border-line px-3 py-2.5 text-white placeholder-muted/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />
    </label>
  );
}

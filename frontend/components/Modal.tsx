'use client';

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className="text-text-muted text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Select({ label, name, options }: { label: string; name: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" name={name} required>
        <option value="">Selecione...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

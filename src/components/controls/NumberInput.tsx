// added by new ERP update
export default function NumberInput({
  value,
  onChange,
  min = 0,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(parseInt(e.target.value || "0"))}
      className={`w-24 border rounded px-2 py-1 text-right ${className}`}
    />
  );
}

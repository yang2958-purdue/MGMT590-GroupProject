export function TailoredResume({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      className="w-full min-h-[400px] p-4 font-mono text-sm border rounded"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

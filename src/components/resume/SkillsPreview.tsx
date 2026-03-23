'use client';

export function SkillsPreview({ skills }: { skills: string[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        {skills.length} skills detected
      </p>
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <span
            key={s}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

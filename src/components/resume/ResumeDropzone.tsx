'use client';

interface ResumeDropzoneProps {
  onBrowse: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  dragging: boolean;
  disabled?: boolean;
}

export function ResumeDropzone({
  onBrowse,
  onDrop,
  onDragOver,
  onDragLeave,
  dragging,
  disabled,
}: ResumeDropzoneProps) {
  return (
    <div
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <p className="text-gray-600 mb-4">
        Drop your resume here (PDF, DOCX, or TXT)
      </p>
      <button
        type="button"
        onClick={onBrowse}
        disabled={disabled}
        className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Browse
      </button>
    </div>
  );
}

export function ExportButtons({
  onCopy,
  onSaveDocx,
  onSaveTxt,
}: {
  onCopy: () => void;
  onSaveDocx: () => void;
  onSaveTxt: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCopy}>Copy to Clipboard</button>
      <button type="button" onClick={onSaveDocx}>Save as DOCX</button>
      <button type="button" onClick={onSaveTxt}>Save as TXT</button>
    </div>
  );
}

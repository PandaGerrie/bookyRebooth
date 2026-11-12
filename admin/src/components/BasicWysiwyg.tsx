import { useEffect, useRef } from "react";

type BasicWysiwygProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function runCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function BasicWysiwyg({
  value,
  onChange,
  placeholder = "Typ hier…",
}: BasicWysiwygProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (node.innerHTML !== value) {
      node.innerHTML = value || "";
    }
  }, [value]);

  function emitChange() {
    onChange(ref.current?.innerHTML || "");
  }

  function onLink() {
    const url = window.prompt("Link-URL");
    if (!url) return;
    runCommand("createLink", url);
    emitChange();
  }

  return (
    <div className="wysiwyg">
      <div className="wysiwyg-toolbar" role="toolbar" aria-label="Opmaak">
        <button type="button" onClick={() => { runCommand("bold"); emitChange(); }} title="Vet">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => { runCommand("italic"); emitChange(); }} title="Cursief">
          <em>I</em>
        </button>
        <button type="button" onClick={() => { runCommand("underline"); emitChange(); }} title="Onderlijnen">
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>
        <button type="button" onClick={() => { runCommand("insertUnorderedList"); emitChange(); }} title="Lijst">
          • Lijst
        </button>
        <button type="button" onClick={onLink} title="Link">
          Link
        </button>
        <button type="button" onClick={() => { runCommand("removeFormat"); emitChange(); }} title="Wis opmaak">
          Wis
        </button>
      </div>
      <div
        ref={ref}
        className="wysiwyg-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        suppressContentEditableWarning
      />
    </div>
  );
}

import { useEffect, useRef, type MouseEvent } from "react";

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

  function apply(command: string, commandValue?: string) {
    ref.current?.focus();
    runCommand(command, commandValue);
    emitChange();
  }

  function onLink() {
    const url = window.prompt("Link-URL");
    if (!url) return;
    apply("createLink", url);
  }

  /** Keep editor selection when clicking toolbar buttons. */
  function onToolbarMouseDown(e: MouseEvent) {
    e.preventDefault();
  }

  return (
    <div className="wysiwyg">
      <div
        className="wysiwyg-toolbar"
        role="toolbar"
        aria-label="Opmaak"
        onMouseDown={onToolbarMouseDown}
      >
        <button type="button" onClick={() => apply("bold")} title="Vet">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => apply("italic")} title="Cursief">
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => apply("underline")}
          title="Onderlijnen"
        >
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>
        <span className="wysiwyg-toolbar-sep" aria-hidden="true" />
        <button
          type="button"
          onClick={() => apply("justifyLeft")}
          title="Links uitlijnen"
        >
          Links
        </button>
        <button
          type="button"
          onClick={() => apply("justifyCenter")}
          title="Centreren"
        >
          Midden
        </button>
        <button
          type="button"
          onClick={() => apply("justifyRight")}
          title="Rechts uitlijnen"
        >
          Rechts
        </button>
        <span className="wysiwyg-toolbar-sep" aria-hidden="true" />
        <button
          type="button"
          onClick={() => apply("insertUnorderedList")}
          title="Lijst"
        >
          • Lijst
        </button>
        <button type="button" onClick={onLink} title="Link">
          Link
        </button>
        <button
          type="button"
          onClick={() => apply("removeFormat")}
          title="Wis opmaak"
        >
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

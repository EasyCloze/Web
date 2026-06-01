import { useEffect, useRef } from "react";

export default function ({ setEditorRef, getItemRef }) {
  const ref = useRef();

  useEffect(() => {
    setEditorRef({
      setHighlight: () => {},
      focus: () => {},
      edit: () => {},
      setContent: content => ref.current.textContent = content,
      selectAll: () => {},
      redo: () => {},
      undo: () => {},
    });
    return () => setEditorRef(null);
  }, []);

  return (
    <div>
      An error occurred parsing the editor content, displaying the raw content:
      <div ref={ref} contentEditable onInput={() => getItemRef().setContent(ref.current.textContent)}>
        {getItemRef().getContent()}
      </div>
    </div>
  )
}

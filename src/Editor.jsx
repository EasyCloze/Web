import React, { useEffect, useMemo, useRef } from 'react';
import { Slate, ReactEditor, Editable, withReact, useSlate, useFocused } from 'slate-react';
import { withHistory } from 'slate-history';
import { Editor, Transforms, Range, createEditor } from 'slate';
import Text from './lang/Text';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import PositionAbsolute from './widget/PositionAbsolute';
import './Editor.css';

export default function ({ readonly, setEditorRef, value, onChange, onFocusChange }) {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  if (readonly) {
    return (
      <Slate
        editor={editor}
        value={value}
      >
        <Editable
          readOnly
          renderLeaf={props => <TextNode {...props} />}
        />
      </Slate>
    );
  }

  setEditorRef({
    setFocus: () => {
      ReactEditor.focus(editor);
      Transforms.select(editor, Editor.start(editor, []));
    },
    setValue: value => {
      Transforms.delete(editor, { at: { anchor: Editor.start(editor, []), focus: Editor.end(editor, []) } });
      Transforms.removeNodes(editor, { at: [0] });
      Transforms.insertNodes(editor, value);
    }
  });

  const FocusAware = () => {
    const focused = useFocused();
    useEffect(() => {
      onFocusChange(focused);
    });
    return null;
  }

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={value => {
        if (editor.operations.some(op => op.type !== 'set_selection')) {
          onChange(value);
        }
      }}
    >
      <FocusAware />
      <Editable
        renderLeaf={props => <TextNode {...props} />}
        onMouseMove={event => editor.mouse = { x: event.clientX, y: event.clientY }}
      />
      <Toolbar />
    </Slate>
  );
}

const TextNode = ({ attributes, children, text }) => {
  return <span {...attributes} className={Object.hasOwn(text, 'mark') ? ('hidden' + (text.mark ? ' mark' : '')) : ''}>{children}</span>;
}

const Toolbar = () => {
  const ref = useRef();
  const editor = useSlate();
  const focused = useFocused();
  const { selection } = editor;
  const [first, next] = Editor.nodes(editor, { match: node => Object.hasOwn(node, 'mark'), mode: 'all' });

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const body_rect = document.body.getBoundingClientRect();
    const parent_rect = ref.current.offsetParent.getBoundingClientRect();
    ref.current.style.left = Math.max(0, Math.min(editor.mouse.x + 20 - body_rect.left, body_rect.width - rect.width)) - (parent_rect.left - body_rect.left) + 'px';
    ref.current.style.top = Math.max(0, Math.min(editor.mouse.y + 20 - body_rect.top, body_rect.height - rect.height)) - (parent_rect.top - body_rect.top) + 'px';
    ref.current.style.visibility = 'visible';
  });

  if (!focused || !selection || !first && (Range.isCollapsed(selection) || !Editor.string(editor, selection))) {
    return null;
  }

  const hide = () => {
    Transforms.setNodes(
      editor,
      { mark: false },
      { match: () => true, split: true }
    );
  }

  const mark = () => {
    Transforms.setNodes(
      editor,
      { mark: true },
      { match: () => true, split: true }
    );
  }

  const mark_all = () => {
    Transforms.setNodes(
      editor,
      { mark: true },
      { match: node => Object.hasOwn(node, 'mark') }
    );
  }

  const unmark_all = () => {
    Transforms.setNodes(
      editor,
      { mark: false },
      { match: node => Object.hasOwn(node, 'mark') }
    );
  }

  const show_all = () => {
    Transforms.unsetNodes(
      editor,
      'mark',
      { match: () => true }
    );
  }

  return (
    <PositionAbsolute
      innerRef={ref}
      zIndex='2048'
      style={{ display: 'flex', visibility: 'hidden' }}
      onMouseDown={event => event.preventDefault()}
    >
      {
        !first ? (
          <React.Fragment>
            <Button onClick={hide} ><Text id='item.editor.hide.button' /></Button>
            <Placeholder width='2px' />
            <Button onClick={mark} ><Text id='item.editor.mark.button' /></Button>
          </React.Fragment>
        ) : !next ? (
          <React.Fragment>
            {
              !first.at(0).mark ? (
                <Button onClick={mark_all} ><Text id='item.editor.mark.button' /></Button>
              ) : (
                <Button onClick={unmark_all} ><Text id='item.editor.unmark.button' /></Button>
              )
            }
            <Placeholder width='2px' />
            <Button onClick={show_all} ><Text id='item.editor.show.button' /></Button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Button onClick={mark_all} ><Text id='item.editor.mark.button' /></Button>
            <Placeholder width='2px' />
            <Button onClick={unmark_all} ><Text id='item.editor.unmark.button' /></Button>
            <Placeholder width='2px' />
            <Button onClick={show_all} ><Text id='item.editor.show.button' /></Button>
          </React.Fragment>
        )
      }
    </PositionAbsolute>
  )
}

import { useEffect, useRef, useState } from "react";
import { $getSelection, $selectAll, $isRangeSelection, TextNode, createCommand, COMMAND_PRIORITY_LOW, UNDO_COMMAND, REDO_COMMAND, CAN_UNDO_COMMAND, CAN_REDO_COMMAND } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { registerHistory, createEmptyHistoryState } from '@lexical/history';
import { useRefGetSet } from './utility/refGetSet';
import Text from './lang/Text';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import PositionAbsolute from './widget/PositionAbsolute';
import './Editor.css';

const TOOLBAR_COMMAND = createCommand();

const Content = (() => {
  function inverseObjectMap(obj) {
    let result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[v] = k;
    }
    return result;
  }

  function replaceWithMap(str, map) {
    return str.replace(new RegExp(Object.keys(map).join('|'), 'g'), matched => map[matched]);
  }

  const removeKeys = ['detail', 'format', 'mode', 'style', 'direction', 'version', 'textFormat'];
  const replacementMap = { '\"type\"': '\"t\"', '\"root\"': '\"r\"', '\"paragraph\"': '\"p\"', '\"children\"': '\"c\"', '\"text\"': '\"x\"', '\"indent\"': '\"i\"', '\"hidden\"': '\"h\"' };
  const inverseReplacementMap = inverseObjectMap(replacementMap);

  return {
    stringify: content => replaceWithMap(JSON.stringify(content, (key, value) => removeKeys.includes(key) ? undefined : value), replacementMap),
    parse: content => replaceWithMap(content, inverseReplacementMap),
  }
})();

export default function Editor({ readonly, initialContent, setEditorRef, setContent, setFocus, setCanUndo, setCanRedo }) {
  if (readonly) {
    return (
      <LexicalComposer initialConfig={{ namespace: 'EasyCloze', editable: !readonly, editorState: Content.parse(initialContent), theme: {}, nodes: [HiddenNode], onError(error) { throw error } }} >
        <PlainTextPlugin contentEditable={<ContentEditable style={{ outline: 'none' }} />} />
      </LexicalComposer>
    )
  } else {
    return (
      <LexicalComposer initialConfig={{ namespace: 'EasyCloze', editable: !readonly, editorState: Content.parse(initialContent), theme: {}, nodes: [HiddenNode], onError(error) { throw error } }} >
        <RichTextPlugin contentEditable={<ContentEditable style={{ outline: 'none' }} />} />
        <State setEditorRef={setEditorRef} setFocus={setFocus} setCanUndo={setCanUndo} setCanRedo={setCanRedo} />
        <OnChangePlugin ignoreSelectionChange ignoreHistoryMergeTagChange onChange={editorState => setContent(Content.stringify(editorState.toJSON()))} />
        <TabIndentationPlugin />
      </LexicalComposer>
    )
  }
}

class HiddenNode extends TextNode {
  mark;

  constructor(text, key, mark) {
    super(text, key);
    this.mark = mark;
  }

  static getType() {
    return 'hidden';
  }

  static clone(node) {
    return new HiddenNode(node.__text, node.__key, node.mark);
  }

  setMark(mark) {
    super.getWritable().mark = mark;
  }

  createDOM(config, editor) {
    const dom = super.createDOM(config, editor);
    dom.classList.add('hidden');
    dom.dataset.mark = this.mark;
    dom.dataset.new = true;
    dom.onmouseleave = () => dom.dataset.new = false;
    return dom;
  }

  updateDOM(prevNode, dom, config) {
    const updated = super.updateDOM(prevNode, dom, config);
    if (this.mark !== prevNode.mark) {
      dom.dataset.mark = this.mark;
      return true;
    }
    return updated;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: HiddenNode.getType()
    }
  }

  static importJSON(node) {
    return new HiddenNode(node.text, undefined, false);
  }
}

const State = ({ setEditorRef, setFocus, setCanUndo, setCanRedo }) => {
  const [editor] = useLexicalComposerContext();
  const [getToolbarRef, setToolbarRef] = useRefGetSet();

  function setToolbarState(state) {
    getToolbarRef().setState(state);
  }

  function undo() { editor.dispatchCommand(UNDO_COMMAND); }
  function redo() { editor.dispatchCommand(REDO_COMMAND); }

  setEditorRef({
    focus: () => {
      editor.focus();
    },
    setContent: content => {
      editor.update(() => {
        editor.setEditorState(editor.parseEditorState(Content.parse(content)));
      });
    },
    selectAll: () => {
      editor.mouse = undefined;
      editor.update(() => $selectAll());
    },
    redo,
    undo,
  });

  useEffect(() => {
    setCanUndo(false);
    setCanRedo(false);

    const unregisterHistory = registerHistory(editor, createEmptyHistoryState(), 500);

    const root = editor.getRootElement();
    root.ontouchstart =
      root.ontouchmove = event => { const touch = event.targetTouches[0]; editor.mouse = { x: touch.clientX, y: touch.clientY }; }
    root.onmousedown =
      root.onmousemove = event => { editor.mouse = { x: event.clientX, y: event.clientY }; }
    root.onfocus = () => { setFocus(true); }
    root.onblur = () => { setToolbarState({ show: false }); setFocus(false); }
    root.onkeydown = event => {
      if (event.ctrlKey) {
        switch (event.key) {
          case 'z': undo(); break;
          case 'y': redo(); break;
          default: return;
        }
        event.preventDefault();
      }
    }

    editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const nodes = selection.getNodes();
          if (selection.isCollapsed()) {
            const node = nodes[0];
            if (node instanceof HiddenNode) {
              setToolbarState({ show: true, plain: false, single: true, mark: node.mark });
            } else {
              setToolbarState({ show: false });
            }
          } else {
            const hiddenNodes = nodes.filter(node => node instanceof HiddenNode);
            if (hiddenNodes.length === 0) {
              setToolbarState({ show: true, plain: true });
            } else {
              if (hiddenNodes.length === 1) {
                setToolbarState({ show: true, plain: false, single: true, mark: hiddenNodes[0].mark });
              } else {
                const markCount = hiddenNodes.reduce((count, node) => { return node.mark ? count + 1 : count; }, 0);
                if (markCount === 0) {
                  setToolbarState({ show: true, plain: false, single: true, mark: false });
                } else if (markCount === hiddenNodes.length) {
                  setToolbarState({ show: true, plain: false, single: true, mark: true });
                } else {
                  setToolbarState({ show: true, plain: false, single: false });
                }
              }
            }
          }
        }
      });
    });

    editor.registerCommand(
      CAN_UNDO_COMMAND,
      (canUndo) => {
        setCanUndo(canUndo);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    editor.registerCommand(
      CAN_REDO_COMMAND,
      (canRedo) => {
        setCanRedo(canRedo);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    editor.registerCommand(
      TOOLBAR_COMMAND,
      (name) => {
        const selection = $getSelection();
        const nodes = selection.getNodes();

        const hide = () => {
          selection.insertNodes([new HiddenNode(selection.getTextContent(), undefined, false)]);
        }

        const mark = () => {
          selection.insertNodes([new HiddenNode(selection.getTextContent(), undefined, true)]);
        }

        const mark_all = () => {
          nodes.forEach(node => {
            if (node instanceof HiddenNode) {
              node.setMark(true);
            }
          });
        }

        const unmark_all = () => {
          nodes.forEach(node => {
            if (node instanceof HiddenNode) {
              node.setMark(false);
            }
          });
        }

        const show_all = () => {
          nodes.forEach(node => {
            if (node instanceof HiddenNode) {
              node.replace(new TextNode(node.getTextContent()));
            }
          });
        }

        ({
          hide,
          mark,
          mark_all,
          unmark_all,
          show_all
        })[name]();

        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    return unregisterHistory;
  }, []);

  return (
    <Toolbar setToolbarRef={setToolbarRef} />
  )
}

const Toolbar = ({ setToolbarRef }) => {
  const [editor] = useLexicalComposerContext();
  const ref = useRef();
  const [state, setState] = useState({ show: false });

  setToolbarRef({
    setState
  });

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const body_rect = document.body.getBoundingClientRect();
    const parent_rect = ref.current.offsetParent.getBoundingClientRect();
    if (editor.mouse) {
      ref.current.style.left = Math.max(0, Math.min(editor.mouse.x + 20 - body_rect.left, body_rect.width - rect.width)) - (parent_rect.left - body_rect.left) + 'px';
      ref.current.style.top = Math.max(0, Math.min(editor.mouse.y + 20 - body_rect.top, body_rect.height - rect.height)) - (parent_rect.top - body_rect.top) + 'px';
    } else {
      ref.current.style.left = '10px';
      ref.current.style.top = parent_rect.height - 7 + 'px';
    }
    ref.current.style.visibility = 'visible';
  });

  function command(name) {
    return () => editor.dispatchCommand(TOOLBAR_COMMAND, name);
  }

  return (
    state.show ? (
      <PositionAbsolute
        innerRef={ref}
        zIndex='2048'
        style={{ display: 'flex', visibility: 'hidden' }}
        onMouseDown={event => event.preventDefault()}
      >
        {
          state.plain ? (
            <>
              <Button onClick={command('hide')} ><Text id='item.editor.hide.button' /></Button>
              <Placeholder width='2px' />
              <Button onClick={command('mark')} ><Text id='item.editor.mark.button' /></Button>
            </>
          ) : state.single ? (
            <>
              {
                !state.mark ? (
                  <Button onClick={command('mark_all')} ><Text id='item.editor.mark.button' /></Button>
                ) : (
                  <Button onClick={command('unmark_all')} ><Text id='item.editor.unmark.button' /></Button>
                )
              }
              <Placeholder width='2px' />
              <Button onClick={command('show_all')} ><Text id='item.editor.show.button' /></Button>
            </>
          ) : (
            <>
              <Button onClick={command('mark_all')} ><Text id='item.editor.mark.button' /></Button>
              <Placeholder width='2px' />
              <Button onClick={command('unmark_all')} ><Text id='item.editor.unmark.button' /></Button>
              <Placeholder width='2px' />
              <Button onClick={command('show_all')} ><Text id='item.editor.show.button' /></Button>
            </>
          )
        }
      </PositionAbsolute>
    ) : null
  )
}

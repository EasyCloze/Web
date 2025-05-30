import { useEffect, useRef, useState } from "react";
import { $getSelection, $selectAll, $isRangeSelection, $createRangeSelection, $setSelection, $getRoot, $createParagraphNode, $isParagraphNode, $createTabNode, TextNode, createCommand, COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND, UNDO_COMMAND, REDO_COMMAND, CAN_UNDO_COMMAND, CAN_REDO_COMMAND, PASTE_COMMAND } from 'lexical';
import { objectKlassEquals } from '@lexical/utils';
import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
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

  const removeKeys = ['detail', 'format', 'mode', 'style', 'direction', 'version', 'textFormat', 'textStyle'];
  const replacementMap = { '\"root\"\:': '\"r\"\:', '\"children\"\:': '\"c\"\:', '\"text\"\:': '\"x\"\:', '\"indent\"\:': '\"i\"\:', '\"type\"\:\"root\"': '\"t\"\:\"r\"', '\"type\"\:\"paragraph\"': '\"t\"\:\"p\"', '\"type\"\:\"text\"': '\"t\"\:\"x\"', '\"type\"\:\"hidden\"': '\"t\"\:\"h\"' };
  const inverseReplacementMap = inverseObjectMap(replacementMap);

  return {
    stringify: content => replaceWithMap(JSON.stringify(content, (key, value) => removeKeys.includes(key) ? undefined : value), replacementMap),
    parse: content => replaceWithMap(content, inverseReplacementMap),
  }
})();

export default function Editor({ readonly, setEditorRef, getContent, setContent, setFocus, setCanUndo, setCanRedo }) {
  let editorState = Content.parse(getContent());
  if (readonly) {
    return (
      <LexicalComposer initialConfig={{ namespace: 'EasyCloze', editable: !readonly, editorState, theme: {}, nodes: [HiddenNode], onError(error) { throw error } }} >
        <PlainTextPlugin contentEditable={<ContentEditable style={{ outline: 'none' }} />} />
        <ReadonlyState editorState={editorState} />
      </LexicalComposer>
    )
  } else {
    return (
      <LexicalComposer initialConfig={{ namespace: 'EasyCloze', editable: !readonly, editorState, theme: {}, nodes: [HiddenNode], onError(error) { throw error } }} >
        <RichTextPlugin contentEditable={<ContentEditable style={{ outline: 'none' }} inputMode='none' />} />
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

const ReadonlyState = ({ editorState }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor) {
      editor.setEditorState(editor.parseEditorState(editorState));
    }
  }, [editor, editorState]);
}

const State = ({ setEditorRef, setFocus, setCanUndo, setCanRedo }) => {
  const [editor] = useLexicalComposerContext();
  const [getToolbarRef, setToolbarRef] = useRefGetSet();
  const [getToolbarPos, setToolbarPos] = useRefGetSet();

  function setToolbarState(state) {
    setToolbarPos(editor.mouse);
    getToolbarRef().setState(state);
  }

  function undo() { editor.dispatchCommand(UNDO_COMMAND); }
  function redo() { editor.dispatchCommand(REDO_COMMAND); }

  setEditorRef({
    focus: () => {
      editor.getRootElement().inputMode = 'text';
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
    root.onfocus = () => { editor.mouse || root.inputMode !== 'none' ? setFocus(true) : root.blur(); }
    root.onblur = () => { setFocus(false); editor.mouse = undefined; root.inputMode = 'none'; editor_onblur(); }
    root.onkeydown = event => {
      if (event.ctrlKey) {
        switch (event.code) {
          case 'KeyZ': undo(); break;
          case 'KeyY': redo(); break;
          default: return;
        }
        event.preventDefault();
      }
    }

    function editor_onblur() {
      editor.update(() => {
        $setSelection(null);
      });

      editor.update(() => {
        const root = $getRoot();
        let children = root.getChildren();
        while (children.length > 0 && $isParagraphNode(children.at(0)) && children.at(0).getTextContent().trim() === '') {
          children.at(0).remove();
          children = root.getChildren();
        }
        while (children.length > 0 && $isParagraphNode(children.at(-1)) && children.at(-1).getTextContent().trim() === '') {
          children.at(-1).remove();
          children = root.getChildren();
        }
      });
    }

    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return;
          }
          const root = $getRoot();
          const last = root.getChildren().at(-1);
          if (last && !last.isParentOf(selection.anchor.getNode())) {
            return;
          }
          if (!last || last.getTextContent().trim() !== '') {
            root.append($createParagraphNode());
          }
        });
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

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
        } else {
          setToolbarState({ show: false });
        }
      });
    });

    editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();
          const dataTransfer = objectKlassEquals(event, InputEvent) || objectKlassEquals(event, KeyboardEvent) ? null : event.clipboardData;
          if (dataTransfer != null && selection !== null) {
            const lexicalString = dataTransfer.getData('application/x-lexical-editor');
            if (lexicalString) {
              try {
                const payload = JSON.parse(lexicalString);
                if (payload.namespace === editor._config.namespace && Array.isArray(payload.nodes)) {
                  payload.nodes.forEach(node => node.style = '')
                  const nodes = $generateNodesFromSerializedNodes(payload.nodes);
                  return selection.insertNodes(nodes);
                }
              } catch (_) {
              }
            }
            const text = dataTransfer.getData('text/plain') || dataTransfer.getData('text/uri-list');
            if (text != null) {
              if ($isRangeSelection(selection)) {
                const parts = text.split(/(\r?\n|\t)/);
                if (parts[parts.length - 1] === '') {
                  parts.pop();
                }
                for (let i = 0; i < parts.length; i++) {
                  const currentSelection = $getSelection();
                  if ($isRangeSelection(currentSelection)) {
                    const part = parts[i];
                    if (part === '\n' || part === '\r\n') {
                      currentSelection.insertParagraph();
                    } else if (part === '\t') {
                      currentSelection.insertNodes([$createTabNode()]);
                    } else {
                      currentSelection.insertText(part);
                    }
                  }
                }
              } else {
                selection.insertRawText(text);
              }
            }
          }
        }, {
          tag: 'paste'
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

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
        editor.mouse = getToolbarPos();

        const selection = $getSelection();
        const nodes = selection.getNodes();

        const hide = (mark) => {
          let content = selection.getTextContent();
          let node = new HiddenNode(content, undefined, mark);
          selection.insertNodes([node]);
          let new_selection = $createRangeSelection();
          new_selection.setTextNodeRange(node, 0, node, content.length);
          $setSelection(new_selection);
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
          if (selection.isCollapsed()) {
            let node = nodes[0];
            let content = node.getTextContent();
            let prev = node.getPreviousSibling();
            let next = node.getNextSibling();
            let begin = 0, end = content.length;
            if (prev instanceof TextNode && !(prev instanceof HiddenNode)) {
              content = prev.getTextContent() + content;
              begin = prev.getTextContent().length, end += begin;
              prev.remove();
            }
            if (next instanceof TextNode && !(next instanceof HiddenNode)) {
              content = content + next.getTextContent();
              next.remove();
            }
            node = node.replace(new TextNode(content));
            let new_selection = $createRangeSelection();
            new_selection.setTextNodeRange(node, begin, node, end);
            $setSelection(new_selection);
          } else {
            nodes.forEach(node => {
              if (node instanceof HiddenNode) {
                node.replace(new TextNode(node.getTextContent()));
              }
            });
          }
        }

        ({
          hide: () => hide(false),
          mark: () => hide(true),
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
    <Toolbar setToolbarRef={setToolbarRef} getToolbarPos={getToolbarPos} command={name => () => editor.dispatchCommand(TOOLBAR_COMMAND, name)} />
  )
}

const Toolbar = ({ setToolbarRef, getToolbarPos, command }) => {
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
    const pos = getToolbarPos();
    if (pos) {
      ref.current.style.left = Math.max(0, Math.min(pos.x - 10 - body_rect.left, body_rect.width - rect.width - 5)) - (parent_rect.left - body_rect.left) + 'px';
      ref.current.style.top = Math.max(0, Math.min(pos.y + 20 - body_rect.top, body_rect.height - rect.height - 5)) - (parent_rect.top - body_rect.top) + 'px';
    } else {
      ref.current.style.left = '10px';
      ref.current.style.top = parent_rect.height - 7 + 'px';
    }
    ref.current.style.visibility = 'visible';
  });

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
              <Button onClick={command('show_all')} ><Text id='item.editor.show.button' /></Button>
              <Placeholder width='2px' />
              {
                !state.mark ? (
                  <Button onClick={command('mark_all')} ><Text id='item.editor.mark.button' /></Button>
                ) : (
                  <Button onClick={command('unmark_all')} ><Text id='item.editor.unmark.button' /></Button>
                )
              }
            </>
          ) : (
            <>
              <Button onClick={command('show_all')} ><Text id='item.editor.show.button' /></Button>
              <Placeholder width='2px' />
              <Button onClick={command('mark_all')} ><Text id='item.editor.mark.button' /></Button>
              <Placeholder width='2px' />
              <Button onClick={command('unmark_all')} ><Text id='item.editor.unmark.button' /></Button>
            </>
          )
        }
      </PositionAbsolute>
    ) : null
  )
}

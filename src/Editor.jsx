import { useEffect, useRef, useState } from "react";
import { $getRoot, $getSelection, $isRangeSelection, $createRangeSelection, $setSelection, $selectAll } from 'lexical';
import { $isParagraphNode, $createParagraphNode, $createTextNode, TextNode } from 'lexical';
import { $addUpdateTag, HISTORIC_TAG } from 'lexical';
import { createCommand, COMMAND_PRIORITY_LOW, FOCUS_COMMAND, BLUR_COMMAND, SELECTION_CHANGE_COMMAND, KEY_TAB_COMMAND, PASTE_COMMAND, UNDO_COMMAND, REDO_COMMAND, CAN_UNDO_COMMAND, CAN_REDO_COMMAND } from 'lexical';
import { mergeRegister, objectKlassEquals } from '@lexical/utils';
import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useRefGetSet } from './common/refGetSet';
import { useMetaState } from "./data/metaState";
import { emptyContent, stringifyContent, parseContent } from "./data/editor";
import Text from './lang/Text';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import PositionAbsolute from './widget/PositionAbsolute';
import './Editor.css';

const TAG_NO_HISTORY = HISTORIC_TAG;
const TOOLBAR_COMMAND = createCommand();

function getEditorContent(editorState, editor) {
  return stringifyContent({ ...editorState.toJSON(), meta: editor.meta });
}

function setEditorContent(editor, content) {
  const parsedEditorState = JSON.parse(parseContent(content || emptyContent));
  editor.setEditorState(editor.parseEditorState(parsedEditorState));
  editor.meta = parsedEditorState.meta;
}

export default function ({ readonly, initialContent, setEditorRef, getItemRef }) {
  return (
    <LexicalComposer initialConfig={{
      namespace: 'EasyCloze',
      editable: !readonly,
      editorState: readonly ? undefined : editor => setEditorContent(editor, getItemRef().getContent()),
      theme: {},
      nodes: [HiddenNode],
      onError(error) { throw error }
    }} >
      {
        readonly ? (
          <>
            <PlainTextPlugin contentEditable={<ContentEditable style={{ outline: 'none' }} />} />
            <ReadonlyState initialContent={initialContent} />
          </>
        ) : (
          <>
            <RichTextPlugin contentEditable={<ContentEditable style={{ outline: 'none' }} inputMode='none' />} />
            <State setEditorRef={setEditorRef} getItemRef={getItemRef} />
            <OnChangePlugin ignoreSelectionChange ignoreHistoryMergeTagChange onChange={(editorState, editor, tags) => { if (!tags.has(TAG_NO_HISTORY)) { getItemRef().setContent(getEditorContent(editorState, editor)); } }} />
            <HistoryPlugin delay={500} />
          </>
        )
      }
    </LexicalComposer>
  )
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
    this.getWritable().mark = mark;
    return this;
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

const ReadonlyState = ({ initialContent }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => setEditorContent(editor, initialContent));
    editor.getRootElement().dataset.highlight = editor.meta.highlight;
  }, [editor, initialContent]);
}

const State = ({ setEditorRef, getItemRef }) => {
  const [editor] = useLexicalComposerContext();
  const [getToolbarRef, setToolbarRef] = useRefGetSet();
  const [getToolbarPos, setToolbarPos] = useRefGetSet(undefined);

  function undo() { editor.dispatchCommand(UNDO_COMMAND); }
  function redo() { editor.dispatchCommand(REDO_COMMAND); }

  function setToolbarState(state) {
    setToolbarPos(editor.mouse);
    getToolbarRef().setState(state);
  }

  useEffect(() => {
    setEditorRef({
      setHighlight: highlight => getToolbarRef().setHighlight(highlight),
      focus: () => { editor.focus(undefined, { defaultSelection: 'rootStart' }); editor.dispatchCommand(FOCUS_COMMAND, null); },
      edit: () => editor.getRootElement().inputMode = 'text',
      setContent: content => editor.update(() => setEditorContent(editor, content)),
      selectAll: () => { editor.mouse = undefined; editor.update(() => $selectAll()); },
      redo,
      undo,
    });
    return () => setEditorRef(null);
  }, [editor]);

  useEffect(() => {
    return () => getItemRef().setFocused(false);
  }, []);

  useEffect(() => {
    const root = editor.getRootElement();
    root.onpointerdown =
      root.onpointermove = event => { editor.mouse = { x: event.clientX, y: event.clientY }; }
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

    function updateRootHighlight() {
      root.dataset.highlight = editor.meta.highlight;
    }

    updateRootHighlight();

    function normalize() {
      editor.update(() => {
        $addUpdateTag(TAG_NO_HISTORY);
        const root = $getRoot();
        let children = root.getChildren();
        while (children.length > 1 && $isParagraphNode(children.at(0)) && children.at(0).getTextContent().trim() === '') {
          children.at(0).remove();
          children = root.getChildren();
        }
        while (children.length > 1 && $isParagraphNode(children.at(-1)) && children.at(-1).getTextContent().trim() === '') {
          children.at(-1).remove();
          children = root.getChildren();
        }
      });
    }

    normalize();

    return mergeRegister(
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          getItemRef().setFocused(true);
          getToolbarRef().setFocused(true);
          if (!editor.mouse && editor.prevSelection) {
            editor.update(() => {
              $setSelection(editor.prevSelection);
            });
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),

      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          getItemRef().setFocused(false);
          getToolbarRef().setFocused(false);
          root.inputMode = 'none';
          editor.mouse = undefined;
          normalize();
          editor.update(() => {
            editor.prevSelection = $getSelection();
            $setSelection(null);
          });
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const range = window.getSelection()?.getRangeAt(0);
          if (range) {
            const node = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
            const rect = range.getClientRects().length > 0 ? range.getBoundingClientRect() : node.getBoundingClientRect();
            if (rect.top > window.innerHeight * 3 / 4) {
              window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight / 2, behavior: "smooth", });
            } else if (rect.top < 50) {
              window.scrollTo({ top: window.scrollY + rect.top - 100, behavior: "smooth", });
            }
          }

          const root = $getRoot();
          let last = root.getChildren().at(-1);
          if (!last || !last.isParentOf(selection.anchor.getNode())) {
            return false;
          }
          while (last.getChildren && last.getChildren().length > 0) {
            last = last.getChildren().at(-1);
          }
          if (selection.anchor.key !== last.__key || selection.anchor.offset !== last.getTextContentSize()) {
            return false;
          }
          editor.update(() => {
            $addUpdateTag(TAG_NO_HISTORY);
            root.append($createParagraphNode());
            root.append($createParagraphNode());
          });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerUpdateListener(() => {
        updateRootHighlight();
      }),

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
      }),

      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          event.preventDefault();
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return true;
          }
          selection.insertNodes([$createTextNode('\t')]);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!objectKlassEquals(event, ClipboardEvent)) {
            return false;
          }
          const dataTransfer = event.clipboardData;
          if (!dataTransfer) {
            return false;
          }
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if (!selection || !$isRangeSelection(selection)) {
              return;
            }
            const lexicalString = dataTransfer.getData('application/x-lexical-editor');
            if (lexicalString) {
              try {
                const payload = JSON.parse(lexicalString);
                if (payload.namespace === editor._config.namespace && Array.isArray(payload.nodes)) {
                  payload.nodes.forEach(node => node.style = '');
                  selection.insertNodes($generateNodesFromSerializedNodes(payload.nodes));
                  return;
                }
              } catch (_) {
              }
            }
            const text = dataTransfer.getData('text/plain') || dataTransfer.getData('text/uri-list');
            if (text) {
              const nodes = [];
              let currParagraph = null;
              text.split(/(\r?\n)/).forEach(part => {
                if (part === '\n' || part === '\r\n') {
                  if (currParagraph) {
                    nodes.push(currParagraph);
                  }
                  currParagraph = $createParagraphNode();
                } else {
                  if (currParagraph) {
                    currParagraph.append($createTextNode(part));
                  } else {
                    nodes.push($createTextNode(part));
                  }
                }
              });
              if (currParagraph) {
                nodes.push(...currParagraph.getChildren());
              }
              selection.insertNodes(nodes);
            }
          }, {
            tag: 'paste'
          });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (canUndo) => {
          getItemRef().setCanUndo(canUndo);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        CAN_REDO_COMMAND,
        (canRedo) => {
          getItemRef().setCanRedo(canRedo);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),

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
            let newSelection = $createRangeSelection();
            newSelection.setTextNodeRange(node, 0, node, content.length);
            $setSelection(newSelection);
          }

          const markAll = () => {
            nodes.forEach(node => {
              if (node instanceof HiddenNode) {
                node.setMark(true);
              }
            });
          }

          const unmarkAll = () => {
            nodes.forEach(node => {
              if (node instanceof HiddenNode) {
                node.setMark(false);
              }
            });
          }

          const showAll = () => {
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
              let newSelection = $createRangeSelection();
              newSelection.setTextNodeRange(node, begin, node, end);
              $setSelection(newSelection);
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
            markAll,
            unmarkAll,
            showAll
          })[name]();

          return true;
        },
        COMMAND_PRIORITY_LOW,
      )
    );
  }, []);

  return (
    <Toolbar setToolbarRef={setToolbarRef} getToolbarPos={getToolbarPos} command={name => () => editor.dispatchCommand(TOOLBAR_COMMAND, name)} />
  )
}

const Toolbar = ({ setToolbarRef, getToolbarPos, command }) => {
  const [editor] = useLexicalComposerContext();
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState({ show: false });
  const [highlight, setHighlight] = useMetaState('highlight', true);
  const ref = useRef();

  setToolbarRef({
    setFocused,
    setState,
  });

  function editorUpdateHighlight(highlight) {
    editor.update(() => {
      editor.meta.highlight = highlight;
      $getRoot().markDirty();
    });
  }

  useEffect(() => {
    if (focused) {
      if (editor.meta.highlight === undefined) {
        editorUpdateHighlight(highlight);
      } else {
        setHighlight(editor.meta.highlight);
      }
    }
  }, [focused]);

  useEffect(() => {
    if (focused) {
      if (editor.meta.highlight !== highlight) {
        editorUpdateHighlight(highlight);
      }
    }
  }, [highlight]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    const parentRect = ref.current.offsetParent.getBoundingClientRect();
    const pos = getToolbarPos();
    if (pos) {
      ref.current.style.left = Math.max(0, Math.min(pos.x - 10 - bodyRect.left, bodyRect.width - rect.width - 10)) - (parentRect.left - bodyRect.left) + 'px';
      ref.current.style.top = Math.max(0, Math.min(pos.y + 20 - bodyRect.top, bodyRect.height - rect.height - 10)) - (parentRect.top - bodyRect.top) + 'px';
    } else {
      ref.current.style.left = '10px';
      ref.current.style.top = parentRect.height - 7 + 'px';
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
          highlight ? (
            state.plain ? (
              <Button onClick={command('hide')} ><Text id='item.editor.highlight.button' /></Button>
            ) : (
              <Button onClick={command('showAll')} ><Text id='item.editor.unhighlight.button' /></Button>
            )
          ) : (
            state.plain ? (
              <>
                <Button onClick={command('hide')} ><Text id='item.editor.hide.button' /></Button>
                <Placeholder width='2px' />
                <Button onClick={command('mark')} ><Text id='item.editor.mark.button' /></Button>
              </>
            ) : state.single ? (
              <>
                <Button onClick={command('showAll')} ><Text id='item.editor.show.button' /></Button>
                <Placeholder width='2px' />
                {
                  !state.mark ? (
                    <Button onClick={command('markAll')} ><Text id='item.editor.mark.button' /></Button>
                  ) : (
                    <Button onClick={command('unmarkAll')} ><Text id='item.editor.unmark.button' /></Button>
                  )
                }
              </>
            ) : (
              <>
                <Button onClick={command('showAll')} ><Text id='item.editor.show.button' /></Button>
                <Placeholder width='2px' />
                <Button onClick={command('markAll')} ><Text id='item.editor.mark.button' /></Button>
                <Placeholder width='2px' />
                <Button onClick={command('unmarkAll')} ><Text id='item.editor.unmark.button' /></Button>
              </>
            )
          )
        }
      </PositionAbsolute>
    ) : null
  )
}

import React, { useEffect, useMemo, useState } from 'react';
import { ReactEditor, Slate, Editable, withReact, useSlate, useFocused } from 'slate-react';
import { withHistory } from 'slate-history';
import { Editor, Transforms, Range, createEditor } from 'slate';
import { localJson } from './utility/local';
import { useLocalRefJson } from './utility/localRef';
import { useRefGetSet } from './utility/refGetSet';
import { generate_local_id, key_remote, key_local, current_version, get_version_date } from './utility/id';
import Text from './lang/Text';
import Button from './widget/Button';
import Message from './widget/Message';
import Label from './widget/Label';
import Placeholder from './widget/Placeholder';
import PositionAbsolute from './widget/PositionAbsolute';
import PositionFixed from './widget/PositionFixed';
import './Item.css';

function check_val_length(val) {
  return val.length <= 4096;
}

export default function Item({ item_map, id, onUpdate }) {
  const [getRemote, setRemote] = useLocalRefJson(key_remote(id), { ver: 0, val: JSON.stringify([{ children: [{ text: '' }] }]) });
  const [getLocal, setLocal] = useLocalRefJson(key_local(id), { ref: 0, ver: 0, val: null });
  const [getTemp, setTemp] = useRefGetSet({ ver: 0, val: null });
  const getValue = () => getLocal().val || getRemote().val;

  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const frame = useMemo(() => { return {} }, []);

  function current_state() {
    const ver_remote = getRemote().ver, { ref, ver, val } = getLocal();
    if (ref === ver_remote) {
      if (ver_remote === 0) {
        if (ver > 0) {
          if (check_val_length(val)) {
            return 'created';
          } else {
            return 'created invalid';
          }
        } else {
          return 'deleted created';
        }
      } else {
        if (!val) {
          if (ver > 0) {
            return 'normal';
          } else {
            return 'deleted normal';
          }
        } else {
          if (ver > 0) {
            if (check_val_length(val)) {
              return 'updated';
            } else {
              return 'updated invalid';
            }
          } else {
            return 'deleted updated';
          }
        }
      }
    } else {
      if (ver_remote === 0) {
        return 'conflict missing';
      } else {
        if (ver > 0) {
          return 'conflict updated';
        } else {
          return 'conflict deleted';
        }
      }
    }
  }

  function update_frame_state() {
    frame.setState(current_state());
  }

  useEffect(() => {
    if (getLocal().ver === 0) {
      ReactEditor.focus(editor);
      Transforms.select(editor, Editor.start(editor, []));
      setLocal({ ref: 0, ver: current_version(), val: getRemote().val });
    }
    update_frame_state();
  });

  function RefreshLocal() {
    if (getRemote().ver > 0 && getLocal().ver > 0 && getLocal().val === getRemote().val) {
      const ver_remote = getRemote().ver;
      setLocal({ ref: ver_remote, ver: ver_remote, val: null });
    }
    update_frame_state();
  }

  function onChange(val) {
    setLocal({ ref: getLocal().ref, ver: current_version(), val });
    RefreshLocal();
    onUpdate();
  }

  function Revert() {
    Transforms.delete(editor, { at: { anchor: Editor.start(editor, []), focus: Editor.end(editor, []) } });
    Transforms.removeNodes(editor, { at: [0] });
    Transforms.insertNodes(editor, JSON.parse(getRemote().val));
  }

  function DeleteOrRestore() {
    const { ref, ver, val } = getLocal();
    setLocal({ ref, ver: -ver, val });
    update_frame_state();
    onUpdate();
  }

  function ConflictDelete() {
    const ver_remote = getRemote().ver;
    const { ver, val } = getLocal();
    setLocal({ ref: ver_remote, ver: -ver, val });
    update_frame_state();
    onUpdate();
  }

  function ConflictSetRemote() {
    Revert();
  }

  function ConflictSetLocal() {
    const ver_remote = getRemote().ver;
    const { ver, val } = getLocal();
    setLocal({ ref: ver_remote, ver, val });
    update_frame_state();
    onUpdate();
  }

  item_map.set(id, {
    sync: () => {
      const ver_remote = getRemote().ver;
      const { ref, ver, val } = getLocal();
      switch (current_state()) {
        case 'created invalid':
        case 'deleted created':
        case 'conflict missing':
          return null;
        case 'created':
          setTemp({ ver, val });
          return { id, op: 'C', ver, val };
        case 'normal':
        case 'updated invalid':
        case 'conflict deleted':
        case 'conflict updated':
          return { id, op: 'R', ref: ver_remote };
        case 'updated':
          setTemp({ ver, val });
          return { id, op: 'U', ref, ver, val };
        case 'deleted normal':
        case 'deleted updated':
          return { id, op: 'D', ref };
      }
    },
    merge: (remote, onMove, onRemove) => {
      if (remote === null) {
        const { ref, ver, val } = getLocal();
        if (ver > 0 && val) {
          if (getRemote().ver > 0) {
            const id_new = generate_local_id(ver);
            const [, setLocalNew] = localJson(key_local(id_new));
            setLocalNew({ ref, ver, val });
            setRemote(null);
            setLocal(null);
            onMove(id, id_new);
          }
        } else {
          setRemote(null);
          setLocal(null);
          onRemove(id);
        }
      } else {
        if (remote.id_new) {
          const { ver, id_new } = remote;
          const [, setRemoteNew] = localJson(key_remote(id_new));
          const [, setLocalNew] = localJson(key_local(id_new));
          setRemoteNew({ ver, val: getTemp().val });
          if (getLocal().val === getTemp().val) {
            setLocalNew({ ref: ver, ver, val: null });
          } else {
            setLocalNew({ ref: ver, ver: getLocal().ver, val: getLocal().val });
          }
          setRemote(null);
          setLocal(null);
          onMove(id, id_new);
        } else {
          const { ver, val } = remote;
          if (ver !== getRemote().ver) {
            if (!val) {
              setRemote({ ver, val: getTemp().val });
              setLocal({ ref: ver, ver: getLocal().ver, val: getLocal().val });
            } else {
              setRemote({ ver, val });
              if (getLocal().ver > 0 && !getLocal().val) {
                setLocal({ ref: ver, ver: getLocal().ver, val: null });
                Revert();
              }
            }
            RefreshLocal();
          }
        }
      }
    },
  });

  return (
    <Slate
      editor={editor}
      value={JSON.parse(getValue())}
      onChange={value => {
        if (editor.operations.some(op => op.type !== 'set_selection')) {
          onChange(JSON.stringify(value));
        }
      }}
    >
      <Frame
        frame={frame}
        getRemote={getRemote}
        getLocal={getLocal}
        command={{
          Revert,
          DeleteOrRestore,
          ConflictDelete,
          ConflictSetRemote,
          ConflictSetLocal,
        }}
      >
        <Editable
          renderLeaf={props => <TextNode {...props} />}
          onMouseMove={event => editor.mouse = { x: event.clientX, y: event.clientY }}
        />
        <Toolbar />
      </Frame>
    </Slate>
  )
}

const Frame = ({ frame, getRemote, getLocal, children, command }) => {
  const focused = useFocused()
  const [state, setState] = useState('normal');

  frame['setState'] = setState;

  function current_border_color() {
    switch (state) {
      case 'normal':
        return focused ? 'orange' : 'lightgray';
      case 'created':
      case 'updated':
        return focused ? 'orange' : 'green';
      case 'created invalid':
      case 'updated invalid':
      case 'deleted normal':
      case 'deleted created':
      case 'deleted updated':
      case 'conflict deleted':
      case 'conflict updated':
      case 'conflict missing':
        return 'red';
    }
  }

  function current_children() {
    const CommandBar = ({ children }) => {
      return (
        <PositionAbsolute left='20px' bottom='20px' onMouseDown={event => event.preventDefault()}>
          {children}
        </PositionAbsolute>
      )
    }

    const DiffView = ({ children }) => {
      const editor = useMemo(() => withReact(createEditor()), []);
      return (
        <React.Fragment>
          {
            getRemote().ver > 0
            &&
            <React.Fragment>
              <Label text={get_version_date(getRemote().ver) + ' remote (readonly)'} />
              <div style={{
                border: '1px solid',
                borderRadius: '2px',
                borderColor: 'lightgray',
                padding: '5px'
              }}>
                <Slate
                  editor={editor}
                  value={JSON.parse(getRemote().val)}
                >
                  <Editable
                    readOnly={true}
                    renderLeaf={props => <TextNode {...props} />}
                  />
                </Slate>
              </div>
            </React.Fragment>
          }
          {
            <React.Fragment>
              <Label text={get_version_date(Math.abs(getLocal().ver)) + ' local'} />
              <div style={{
                border: '1px solid',
                borderRadius: '2px',
                borderColor: focused ? 'orange' : 'lightgray',
                padding: '5px',
              }}>
                {children}
              </div>
            </React.Fragment>
          }
          <Placeholder height='5px' />
        </React.Fragment>
      )
    }

    switch (state) {
      case 'normal':
        return (
          <React.Fragment>
            {children}
            {focused && (
              <CommandBar>
                <Button text='delete' onClick={command.DeleteOrRestore} />
              </CommandBar>
            )}
          </React.Fragment>
        );
      case 'created':
      case 'updated':
        return (
          <React.Fragment>
            {children}
            {focused && (
              <CommandBar>
                <Button text='delete' onClick={command.DeleteOrRestore} />
                <Placeholder width='10px' />
                <Button text='revert change' onClick={command.Revert} />
              </CommandBar>
            )}
          </React.Fragment>
        );
      case 'created invalid':
      case 'updated invalid':
        return (
          <React.Fragment>
            <Message text='This item is too long.' />
            <Placeholder height='5px' />
            {children}
            {focused && (
              <CommandBar>
                <Button text='delete' onClick={command.DeleteOrRestore} />
                <Placeholder width='10px' />
                <Button text='revert change' onClick={command.Revert} />
              </CommandBar>
            )}
          </React.Fragment>
        );
      case 'deleted normal':
      case 'deleted created':
      case 'deleted updated':
        return (
          <React.Fragment>
            <Message text='This item has been deleted.' />
            <Placeholder height='5px' />
            <Button text='restore' onClick={command.DeleteOrRestore} />
          </React.Fragment>
        );
      case 'conflict deleted':
        return (
          <React.Fragment>
            <Message text='Conflict: This item was updated on remote, but deleted on local.' />
            <DiffView>{children}</DiffView>
            <Button text='delete' onClick={command.ConflictDelete} />
            <Placeholder width='2px' />
            <Button text='keep remote' onClick={command.ConflictSetRemote} />
            <Placeholder width='2px' />
            <Button text='keep local' onClick={command.ConflictSetLocal} />
          </React.Fragment>
        );
      case 'conflict updated':
        return (
          <React.Fragment>
            <Message text='Conflict: This item was updated on both remote and local.' />
            <DiffView>{children}</DiffView>
            <Button text='delete' onClick={command.ConflictDelete} />
            <Placeholder width='2px' />
            <Button text='keep remote' onClick={command.ConflictSetRemote} />
            <Placeholder width='2px' />
            <Button text='keep local' onClick={command.ConflictSetLocal} />
          </React.Fragment>
        );
      case 'conflict missing':
        return (
          <React.Fragment>
            <Message text='Conflict: This item was deleted on remote, but updated on local.' />
            <DiffView>{children}</DiffView>
            <Button text='remove from list' onClick={command.ConflictDelete} />
            <Placeholder width='2px' />
            <Button text='create a new item' onClick={command.ConflictSetLocal} />
          </React.Fragment>
        );
    }
  }

  return (
    <div
      className={'item'}
      style={{ borderColor: current_border_color() }}
    >
      {current_children()}
    </div>
  )
}

const Toolbar = () => {
  const editor = useSlate();
  const focused = useFocused();
  const { selection } = editor;
  const [first, next] = Editor.nodes(editor, { match: node => Object.hasOwn(node, 'star'), mode: 'all' });

  if (!focused || !selection || !first && (Range.isCollapsed(selection) || Editor.string(editor, selection) === '')) {
    return null;
  }

  const hide = () => {
    Transforms.setNodes(
      editor,
      { star: false },
      { match: () => true, split: true }
    );
  }

  const star = () => {
    Transforms.setNodes(
      editor,
      { star: true },
      { match: () => true, split: true }
    );
  }

  const star_all = () => {
    Transforms.setNodes(
      editor,
      { star: true },
      { match: node => Object.hasOwn(node, 'star') }
    );
  }

  const unstar_all = () => {
    Transforms.setNodes(
      editor,
      { star: false },
      { match: node => Object.hasOwn(node, 'star') }
    );
  }

  const show_all = () => {
    Transforms.unsetNodes(
      editor,
      'star',
      { match: () => true }
    );
  }

  return (
    <PositionFixed left={editor.mouse.x + 20 + 'px'} top={editor.mouse.y + 20 + 'px'} onMouseDown={event => event.preventDefault()}>
      {
        !first ? (
          <React.Fragment>
            <Button text='hide' onClick={hide} />
            <Placeholder width='2px' />
            <Button text='star' onClick={star} />
          </React.Fragment>
        ) : !next ? (
          <React.Fragment>
            {
              !first.at(0).star ? (
                <Button text='star' onClick={star_all} />
              ) : (
                <Button text='unstar' onClick={unstar_all} />
              )
            }
            <Placeholder width='2px' />
            <Button text='show' onClick={show_all} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Button text='star' onClick={star_all} />
            <Placeholder width='2px' />
            <Button text='unstar' onClick={unstar_all} />
            <Placeholder width='2px' />
            <Button text='show' onClick={show_all} />
          </React.Fragment>
        )
      }
    </PositionFixed>
  )
}

const TextNode = ({ attributes, children, text }) => {
  return <span {...attributes} className={Object.hasOwn(text, 'star') ? ('hidden' + (text.star ? ' star' : '')) : ''}>{children}</span>
}

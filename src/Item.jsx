import { useEffect, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { localJson } from './utility/local';
import { useLocalRefJson } from './utility/localRef';
import { useRefGetSet } from './utility/refGetSet';
import { generate_local_id, key_remote, key_local, current_version, get_version_date } from './utility/id';
import Text from './lang/Text';
import IconButton from './widget/IconButton';
import Button from './widget/Button';
import Message from './widget/Message';
import Label from './widget/Label';
import Placeholder from './widget/Placeholder';
import PositionRelative from './widget/PositionRelative';
import PositionSticky from './widget/PositionSticky';
import PositionFixed from './widget/PositionFixed';
import Editor from './Editor';
import './Item.css';

const val_length_limit = 4096;

export default function ({ token, highlight, setItemRef, id, onUpdate, onDelete }) {
  const [getRemote, setRemote] = useLocalRefJson(key_remote(id), { ver: 0, val: "{\"r\":{\"c\":[{\"c\":[],\"i\":0,\"t\":\"p\"}],\"t\":\"r\"}}" });
  const [getLocal, setLocal] = useLocalRefJson(key_local(id), { ref: 0, ver: 0, val: null });
  const [getTemp, setTemp] = useRefGetSet({ ver: 0, val: null });

  const [getFrameRef, setFrameRef] = useRefGetSet();
  const [getEditorRef, setEditorRef] = useRefGetSet();

  function current_state() {
    const ver_remote = getRemote().ver, { ref, ver, val } = getLocal();
    if (ref === ver_remote) {
      if (ver_remote === 0) {
        if (ver >= 0) {
          if (!token) {
            return 'normal';
          } else if (ver === 0 || val.length <= val_length_limit) {
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
            if (val.length <= val_length_limit) {
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
    getFrameRef().setState(current_state());
    getFrameRef().setFormat(getFormat());
  }

  useEffect(() => {
    if (getLocal().ver === 0) {
      getEditorRef().focus();
      setLocal({ ref: 0, ver: current_version(), val: getRemote().val });
      setFormat(highlight.value);
    }
    getEditorRef().setHighlight(getFormat());
  }, []);

  useEffect(() => {
    update_frame_state();
  }, [token]);

  function RefreshLocal() {
    if (getRemote().ver > 0 && getLocal().ver > 0 && getLocal().val === getRemote().val) {
      const ver_remote = getRemote().ver;
      setLocal({ ref: ver_remote, ver: ver_remote, val: null });
    }
    update_frame_state();
  }

  function getValue() {
    return getLocal().val || getRemote().val;
  }

  function getFormat() {
    return getValue()[0] === ' ';
  }

  function getContent() {
    return getValue()[0] === ' ' ? getValue().substring(1) : getValue();
  }

  function setValue(val) {
    setLocal({ ref: getLocal().ref, ver: current_version(), val });
    RefreshLocal();
    if (val.length <= val_length_limit) {
      onUpdate();
    }
  }

  function setFormat(format) {
    return setValue(format ? ' ' + getContent() : getContent());
  }

  function setContent(content) {
    setValue(getFormat() ? ' ' + content : content);
  }

  function onFocus(focused) {
    if (focused) {
      highlight.setHighlight(getFormat());
      highlight.updateHighlight = highlight => {
        setFormat(highlight);
        getEditorRef().setHighlight(highlight);
      }
    } else {
      highlight.updateHighlight = () => {};
    }
  }

  function SelectAll() {
    getEditorRef().selectAll();
  }

  function Edit() {
    getEditorRef().focus();
  }

  function Undo() {
    getEditorRef().undo();
  }

  function Redo() {
    getEditorRef().redo();
  }

  function Revert() {
    getLocal().val = null;
    highlight.setHighlight(getFormat());
    getEditorRef().setContent(getContent());
  }

  function DeleteOrRestore() {
    const { ref, ver, val } = getLocal();
    setLocal({ ref, ver: -ver, val });
    update_frame_state();
    if (ver > 0) {
      onDelete();
    }
  }

  function ConflictDelete() {
    const ver_remote = getRemote().ver;
    const { ver, val } = getLocal();
    setLocal({ ref: ver_remote, ver: -ver, val });
    update_frame_state();
    if (ver > 0) {
      onDelete();
    }
  }

  function ConflictSetRemote() {
    Revert();
  }

  function ConflictSetLocal() {
    const ver_remote = getRemote().ver;
    const { ver, val } = getLocal();
    setLocal({ ref: ver_remote, ver, val });
    update_frame_state();
    if (val.length <= val_length_limit) {
      onUpdate();
    }
  }

  setItemRef({
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
          if (onRemove) {
            setRemote(null);
            setLocal(null);
            onRemove(id);
          }
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
              if (!(getLocal().ver > 0) && !getLocal().val) {
                setLocal({ ref: getLocal().ref, ver: getLocal().ver, val: getRemote().val });
              }
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
    <Frame
      initialState={current_state()}
      initialFormat={getFormat()}
      onFocus={onFocus}
      setFrameRef={setFrameRef}
      getRemote={getRemote}
      getLocal={getLocal}
      command={{
        SelectAll,
        Edit,
        Undo,
        Redo,
        Revert,
        DeleteOrRestore,
        ConflictDelete,
        ConflictSetRemote,
        ConflictSetLocal,
      }}
    >
      <Editor
        highlight={highlight}
        setEditorRef={setEditorRef}
        getContent={getContent}
        setContent={setContent}
        setFocus={focused => getFrameRef().setFocused(focused)}
        setCanUndo={canUndo => getFrameRef().setCanUndo(canUndo)}
        setCanRedo={canRedo => getFrameRef().setCanRedo(canRedo)}
      />
    </Frame>
  )
}

const Frame = ({ initialState, initialFormat, onFocus, setFrameRef, getRemote, getLocal, children, command }) => {
  const [focused, setFocused] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [state, setState] = useState(initialState);
  const [format, setFormat] = useState(initialFormat);

  setFrameRef({
    setFocused,
    setCanRedo,
    setCanUndo,
    setState,
    setFormat,
  });

  useEffect(() => {
    onFocus(focused);
  }, [focused]);

  function current_border_color() {
    switch (state) {
      case 'normal':
        return focused ? 'orange' : 'lightsteelblue';
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

  const MessageBar = () => {
    function current_message() {
      switch (state) {
        case 'normal':
        case 'created':
        case 'updated':
          return null;
        case 'created invalid':
        case 'updated invalid':
          return 'item.error.overlength.message';
        case 'deleted normal':
        case 'deleted created':
        case 'deleted updated':
          return 'item.deleted.message';
        case 'conflict deleted':
          return 'item.conflict.deleted.message';
        case 'conflict updated':
          return 'item.conflict.updated.message';
        case 'conflict missing':
          return 'item.conflict.missing.message';
      }
    }

    let text_id = current_message();
    if (!text_id) {
      return null;
    }

    return <Message style={{ marginBottom: '5px' }}><Text id={text_id} /></Message>
  }

  function current_content() {
    switch (state) {
      case 'normal':
      case 'created':
      case 'updated':
      case 'created invalid':
      case 'updated invalid':
      case 'conflict missing':
        return children;
      case 'deleted normal':
      case 'deleted created':
      case 'deleted updated':
        return null;
      case 'conflict deleted':
      case 'conflict updated':
        return (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            onClick={event => event.currentTarget.style.flexDirection = event.currentTarget.style.flexDirection === 'column' ? 'row' : 'column'}
          >
            <div style={{ flex: 1 }}>
              <Label>{get_version_date(getRemote().ver)} <Text id='item.conflict.remote.text' /></Label>
              <div className='item-diff-frame' onClick={event => event.stopPropagation()}>
                <Editor readonly getContent={() => getRemote().val} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <Label>{get_version_date(Math.abs(getLocal().ver))} <Text id='item.conflict.local.text' /></Label>
              <div className='item-diff-frame' onClick={event => event.stopPropagation()}>
                {children}
              </div>
            </div>
          </div>
        )
    }
  }

  function ActionBar() {
    function current_actions() {
      switch (state) {
        case 'normal':
        case 'created':
        case 'updated':
        case 'created invalid':
        case 'updated invalid':
          return null;
        case 'deleted normal':
        case 'deleted created':
        case 'deleted updated':
          return <Button onClick={command.DeleteOrRestore} ><Text id='item.action.restore.button' /></Button>
        case 'conflict deleted':
        case 'conflict updated':
          return (
            <>
              <Button onClick={command.ConflictSetRemote} ><Text id='item.action.keep_remote.button' /></Button>
              <Placeholder width='2px' />
              <Button onClick={command.ConflictSetLocal} ><Text id='item.action.keep_local.button' /></Button>
            </>
          )
        case 'conflict missing':
          return <Button onClick={command.ConflictSetLocal} ><Text id='item.action.create.button' /></Button>
      }
    }

    const actions = current_actions();
    if (!actions) {
      return null;
    }

    return <div style={{ marginTop: '5px' }}>{actions}</div>
  }

  const ToolBar = () => {
    if (!focused) {
      return null;
    }

    return (
      <PositionSticky className='item-toolbar' bottom={'100px'} style={{ marginLeft: 'auto', width: 'max-content', height: 0 }}>
        <Placeholder height='5px' />
        <Button className='button' onMouseDown={event => { command.SelectAll(); event.preventDefault(); }} ><Text id='item.action.select.button' /></Button>
        <Placeholder width='2px' />
        <Button className='button' onMouseDown={event => { command.Edit(); event.preventDefault(); }} ><Text id='item.action.edit.button' /></Button>
      </PositionSticky >
    );
  }

  const CommandBar = () => {
    if (!focused) {
      return null;
    }

    function current_commands() {
      switch (state) {
        case 'normal':
        case 'created':
        case 'updated':
        case 'created invalid':
        case 'updated invalid':
          return (
            <>
              <IconButton icon={<DeleteIcon htmlColor="lightcoral" />} title={<Text id='item.command.delete.tooltip' />} onClick={command.DeleteOrRestore} />
              <Placeholder width='10px' />
              <IconButton icon={<UndoIcon />} disabled={!canUndo} title={<Text id='item.command.undo.tooltip' />} onClick={command.Undo} />
              <Placeholder width='10px' />
              <IconButton icon={<RedoIcon />} disabled={!canRedo} title={<Text id='item.command.redo.tooltip' />} onClick={command.Redo} />
              <Placeholder width='10px' />
              <IconButton icon={<RestoreIcon />} disabled={state === 'normal'} title={<Text id='item.command.revert.tooltip' />} onClick={command.Revert} />
            </>
          )
        case 'conflict deleted':
        case 'conflict updated':
        case 'conflict missing':
          return (
            <>
              <IconButton icon={<DeleteIcon htmlColor="lightcoral" />} title={<Text id='item.command.delete.tooltip' />} onClick={command.ConflictDelete} />
              <Placeholder width='10px' />
              <IconButton icon={<UndoIcon />} disabled={!canUndo} title={<Text id='item.command.undo.tooltip' />} onClick={command.Undo} />
              <Placeholder width='10px' />
              <IconButton icon={<RedoIcon />} disabled={!canRedo} title={<Text id='item.command.redo.tooltip' />} onClick={command.Redo} />
            </>
          )
        case 'deleted normal':
        case 'deleted created':
        case 'deleted updated':
          return null;
      }
    }

    let commands = current_commands();
    if (!commands) {
      return null;
    }

    return (
      <PositionFixed left='20px' bottom='20px' onMouseDown={event => event.preventDefault()}>
        {commands}
      </PositionFixed>
    )
  }

  return (
    <PositionRelative
      className={'item'}
      zIndex='auto'
      style={{ borderColor: current_border_color() }}
      data-highlight={format}
      data-ver-local={getLocal().ver}
      data-ver-ref={getLocal().ref}
      data-ver-remote={getRemote().ver}
    >
      <MessageBar />
      {current_content()}
      <ActionBar />
      <ToolBar />
      <CommandBar />
    </PositionRelative>
  )
}

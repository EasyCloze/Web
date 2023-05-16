import React, { useEffect, useState } from 'react';
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
import Editor from './Editor';
import './Item.css';

export default function ({ item_map, id, onUpdate }) {
  const [getRemote, setRemote] = useLocalRefJson(key_remote(id), { ver: 0, val: JSON.stringify([{ children: [{ text: '' }] }]) });
  const [getLocal, setLocal] = useLocalRefJson(key_local(id), { ref: 0, ver: 0, val: null });
  const [getTemp, setTemp] = useRefGetSet({ ver: 0, val: null });

  const [getFrameRef, setFrameRef] = useRefGetSet();
  const [getEditorRef, setEditorRef] = useRefGetSet();

  function current_state() {
    const val_length_limit = 4096;
    const ver_remote = getRemote().ver, { ref, ver, val } = getLocal();
    if (ref === ver_remote) {
      if (ver_remote === 0) {
        if (ver > 0) {
          if (val.length <= val_length_limit) {
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
  }

  useEffect(() => {
    if (getLocal().ver === 0) {
      getEditorRef().setFocus();
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
    getEditorRef().setValue(JSON.parse(getRemote().val));
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
    <Frame
      setFrameRef={setFrameRef}
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
      <Editor
        setEditorRef={setEditorRef}
        value={JSON.parse(getLocal().val || getRemote().val)}
        onChange={value => onChange(JSON.stringify(value))}
        onFocusChange={focused => getFrameRef().setFocused(focused)}
      />
    </Frame>
  )
}

const Frame = ({ setFrameRef, getRemote, getLocal, children, command }) => {
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState('normal');

  setFrameRef({
    setFocused,
    setState,
  });

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

    return (
      <React.Fragment>
        <Message><Text id={text_id} /></Message>
        <Placeholder height='5px' />
      </React.Fragment>
    )
  }

  function current_content() {
    switch (state) {
      case 'normal':
      case 'created':
      case 'updated':
      case 'created invalid':
      case 'updated invalid':
      case 'conflict missing':
      case 'deleted normal':
      case 'deleted created':
      case 'deleted updated':
        return children;
      case 'conflict deleted':
      case 'conflict updated':
        return (
          <React.Fragment>
            <Label>{get_version_date(getRemote().ver)}<Text id='item.conflict.remote.text' /></Label>
            <div className='item-diff-frame'>
              <Editor readOnly value={JSON.parse(getRemote().val)} />
            </div>
            <Label>{get_version_date(Math.abs(getLocal().ver))}<Text id='item.conflict.local.text' /></Label>
            <div className='item-diff-frame'>
              {children}
            </div>
          </React.Fragment>
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
            <React.Fragment>
              <Button onClick={command.ConflictSetRemote} ><Text id='item.action.keep_remote.button' /></Button>
              <Placeholder width='2px' />
              <Button onClick={command.ConflictSetLocal} ><Text id='item.action.keep_local.button' /></Button>
            </React.Fragment>
          )
        case 'conflict missing':
          return <Button onClick={command.ConflictSetLocal} ><Text id='item.action.create.button' /></Button>
      }
    }

    const actions = current_actions();
    if (!actions) {
      return null;
    }

    return (
      <React.Fragment>
        <Placeholder height='5px' />
        {actions}
      </React.Fragment>
    )
  }

  const CommandBar = () => {
    if (!focused) {
      return null;
    }

    function current_commands() {
      switch (state) {
        case 'normal':
          return (
            <React.Fragment>
              <Button onClick={command.DeleteOrRestore} ><Text id='item.command.delete.button' /></Button>
            </React.Fragment>
          )
        case 'conflict deleted':
        case 'conflict updated':
        case 'conflict missing':
          return (
            <React.Fragment>
              <Button onClick={command.ConflictDelete} ><Text id='item.command.delete.button' /></Button>
            </React.Fragment>
          )
        case 'created':
        case 'updated':
        case 'created invalid':
        case 'updated invalid':
          return (
            <React.Fragment>
              <Button onClick={command.DeleteOrRestore} ><Text id='item.command.delete.button' /></Button>
              <Placeholder width='10px' />
              <Button onClick={command.Revert} ><Text id='item.command.revert.button' /></Button>
            </React.Fragment>
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
      <PositionAbsolute left='20px' bottom='20px' onMouseDown={event => event.preventDefault()}>
        {commands}
      </PositionAbsolute>
    )
  }

  return (
    <div
      className={'item'}
      style={{ borderColor: current_border_color() }}
    >
      <MessageBar />
      {current_content()}
      <ActionBar />
      <CommandBar />
    </div>
  )
}

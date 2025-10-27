import React, { useEffect, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import RestoreIcon from '@mui/icons-material/Restore';
import { useReadOnlyMetaState } from './data/metaState';
import { generateLocalId, generateArchiveId, currentVersion, getVersionDate } from './data/id';
import { ItemState, itemState } from './data/item';
import { addItem } from './data/itemCache';
import { getInitialItem, useItemState } from './data/itemState';
import { onItemUpdate } from './data/syncControll';
import { useRefGetSet } from './common/refGetSet';
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

export default React.memo(function ({ id, itemMap }) {
  const initialItem = getInitialItem(id);
  const initialContent = initialItem.val || initialItem.remoteVal;
  const [getFrameRef, setFrameRef] = useRefGetSet();
  const [getEditorRef, setEditorRef] = useRefGetSet();

  useEffect(() => {
    if (initialContent === null) {
      getEditorRef().focus();
      getEditorRef().edit();
    }
  }, []);

  return (
    <Frame id={id} itemMap={itemMap} initialContent={initialContent} setFrameRef={setFrameRef} getEditorRef={getEditorRef} >
      <Editor initialContent={initialContent} setEditorRef={setEditorRef} getItemRef={getFrameRef} />
    </Frame>
  )
})

const Frame = ({ id, itemMap, initialContent, setFrameRef, getEditorRef, children }) => {
  const loggedIn = useReadOnlyMetaState('loggedIn', false);
  const [item, setItem] = useItemState(id);
  const [focused, setFocused] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [getEditorContent, setEditorContent] = useRefGetSet(initialContent);

  const state = itemState(item, loggedIn);
  const content = item.val || item.remoteVal;

  useEffect(() => {
    itemMap.setItem(id, {
      focus: () => getEditorRef() ? (getEditorRef().focus(), true) : false
    });
    return () => itemMap.deleteItem(id);
  }, []);

  useEffect(() => {
    if (content !== getEditorContent()) {
      getEditorRef().setContent(content);
    }
  }, [item]);

  function updateItem(updates) {
    setItem({ ...item, ...updates });
    onItemUpdate();
  }

  function setContent(newContent) {
    setEditorContent(newContent);
    if (newContent !== content) {
      if (newContent === item.remoteVal) {
        updateItem({ ref: item.remoteVer, ver: item.remoteVer, val: null });
      } else {
        updateItem({ ver: currentVersion(), val: newContent });
      }
    }
  }

  function onRevert() {
    updateItem({ ref: item.remoteVer, ver: item.remoteVer, val: null });
  }

  function onDelete() {
    updateItem({ ver: -item.ver });
    itemMap.focusNext(id);
  }

  function onRestore() {
    updateItem({ ver: -item.ver });
  }

  function onConflictDelete() {
    updateItem({ ref: item.remoteVer, ver: -item.ver });
  }

  function onConflictSetRemote() {
    onRevert();
  }

  function onConflictSetLocal() {
    updateItem({ ref: item.remoteVer });
  }

  const onArchive = () => {
    addItem({ id: generateArchiveId(), remoteVer: 0, remoteVal: null, ref: 0, ver: item.ver, val: content });
    onDelete();
  };

  const onUnarchive = () => {
    addItem({ id: generateLocalId(), remoteVer: 0, remoteVal: null, ref: 0, ver: item.ver, val: content });
    onDelete();
  };

  setFrameRef({
    setContent,
    setFocused,
    setCanRedo,
    setCanUndo,
  });

  const borderColor = (() => {
    if (focused) {
      return 'orange';
    }
    switch (state) {
      case ItemState.Archived:
      case ItemState.Normal:
        return 'lightsteelblue';
      case ItemState.CreatedEmpty:
      case ItemState.Created:
      case ItemState.Updated:
        return 'green';
      case ItemState.DeletedArchived:
      case ItemState.CreatedInvalid:
      case ItemState.DeletedCreated:
      case ItemState.DeletedNormal:
      case ItemState.UpdatedInvalid:
      case ItemState.DeletedUpdated:
      case ItemState.ConflictMissing:
      case ItemState.ConflictUpdated:
      case ItemState.ConflictDeleted:
        return 'red';
    }
  })();

  const messageId = (() => {
    switch (state) {
      case ItemState.Archived:
      case ItemState.Normal:
      case ItemState.CreatedEmpty:
      case ItemState.Created:
      case ItemState.Updated:
        return null;
      case ItemState.CreatedInvalid:
      case ItemState.UpdatedInvalid:
        return 'item.error.overlength.message';
      case ItemState.DeletedArchived:
      case ItemState.DeletedNormal:
      case ItemState.DeletedCreated:
      case ItemState.DeletedUpdated:
        return 'item.deleted.message';
      case ItemState.ConflictMissing:
        return 'item.conflict.missing.message';
      case ItemState.ConflictUpdated:
        return 'item.conflict.updated.message';
      case ItemState.ConflictDeleted:
        return 'item.conflict.deleted.message';
    }
  })();

  const editor = (() => {
    switch (state) {
      case ItemState.Archived:
      case ItemState.Normal:
      case ItemState.CreatedEmpty:
      case ItemState.Created:
      case ItemState.CreatedInvalid:
      case ItemState.Updated:
      case ItemState.UpdatedInvalid:
      case ItemState.ConflictMissing:
        return children;
      case ItemState.DeletedArchived:
      case ItemState.DeletedNormal:
      case ItemState.DeletedCreated:
      case ItemState.DeletedUpdated:
        return null;
      case ItemState.ConflictDeleted:
      case ItemState.ConflictUpdated:
        return (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            onClick={event => event.currentTarget.style.flexDirection = event.currentTarget.style.flexDirection === 'column' ? 'row' : 'column'}
          >
            <div style={{ flex: 1 }}>
              <Label>{getVersionDate(item.remoteVer)} <Text id='item.conflict.remote.text' /></Label>
              <div className='item-diff-frame' onClick={event => event.stopPropagation()}>
                <Editor readonly initialContent={item.remoteVal} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <Label>{item.ver && getVersionDate(Math.abs(item.ver))} <Text id='item.conflict.local.text' /></Label>
              <div className='item-diff-frame' onClick={event => event.stopPropagation()}>
                {children}
              </div>
            </div>
          </div>
        )
    }
  })();

  const actions = (() => {
    switch (state) {
      case ItemState.Archived:
      case ItemState.Normal:
      case ItemState.CreatedEmpty:
      case ItemState.Created:
      case ItemState.CreatedInvalid:
      case ItemState.Updated:
      case ItemState.UpdatedInvalid:
        return null;
      case ItemState.DeletedArchived:
      case ItemState.DeletedNormal:
      case ItemState.DeletedCreated:
      case ItemState.DeletedUpdated:
        return <Button onClick={onRestore} ><Text id='item.action.restore.button' /></Button>
      case ItemState.ConflictMissing:
        return <Button onClick={onConflictSetLocal} ><Text id='item.action.create.button' /></Button>
      case ItemState.ConflictUpdated:
      case ItemState.ConflictDeleted:
        return (
          <>
            <Button onClick={onConflictSetRemote} ><Text id='item.action.keepRemote.button' /></Button>
            <Placeholder width='2px' />
            <Button onClick={onConflictSetLocal} ><Text id='item.action.keepLocal.button' /></Button>
          </>
        )
      default:
        return null;
    }
  })();

  const commands = (() => {
    switch (state) {
      case ItemState.Archived:
      case ItemState.CreatedEmpty:
      case ItemState.Created:
      case ItemState.CreatedInvalid:
      case ItemState.Normal:
      case ItemState.Updated:
      case ItemState.UpdatedInvalid:
        return (
          <>
            <IconButton icon={<DeleteIcon htmlColor="lightcoral" />} title={<Text id='item.command.delete.tooltip' />} onClick={onDelete} />
            {
              state === ItemState.Archived ?
                <IconButton icon={<UnarchiveIcon />} title={<Text id={'item.command.unarchive.tooltip'} />} onClick={onUnarchive} /> :
                <IconButton icon={<ArchiveIcon />} title={<Text id={'item.command.archive.tooltip'} />} onClick={onArchive} />
            }
            <IconButton icon={<UndoIcon />} disabled={!canUndo} title={<Text id='item.command.undo.tooltip' />} onClick={() => getEditorRef().undo()} />
            <IconButton icon={<RedoIcon />} disabled={!canRedo} title={<Text id='item.command.redo.tooltip' />} onClick={() => getEditorRef().redo()} />
            {
              (state === ItemState.Updated || state === ItemState.UpdatedInvalid) &&
              <IconButton icon={<RestoreIcon />} title={<Text id='item.command.revert.tooltip' />} onClick={onRevert} />
            }
          </>
        )
      case ItemState.ConflictMissing:
      case ItemState.ConflictUpdated:
      case ItemState.ConflictDeleted:
        return (
          <>
            <IconButton icon={<DeleteIcon htmlColor="lightcoral" />} title={<Text id='item.command.delete.tooltip' />} onClick={onConflictDelete} />
            <IconButton icon={<UndoIcon />} disabled={!canUndo} title={<Text id='item.command.undo.tooltip' />} onClick={() => getEditorRef().undo()} />
            <IconButton icon={<RedoIcon />} disabled={!canRedo} title={<Text id='item.command.redo.tooltip' />} onClick={() => getEditorRef().redo()} />
          </>
        )
      case ItemState.DeletedArchived:
      case ItemState.DeletedNormal:
      case ItemState.DeletedCreated:
      case ItemState.DeletedUpdated:
        return null;
    }
  })();

  const MessageBar = () => {
    if (!messageId) {
      return null;
    }
    return <Message style={{ marginBottom: '5px' }}><Text id={messageId} /></Message>
  }

  const ActionBar = () => {
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
        <Button className='button' onMouseDown={event => { getEditorRef().selectAll(); event.preventDefault(); }} ><Text id='item.action.select.button' /></Button>
        <Placeholder width='2px' />
        <Button className='button' onMouseDown={event => { getEditorRef().edit(); event.preventDefault(); }} ><Text id='item.action.edit.button' /></Button>
      </PositionSticky >
    )
  }

  const CommandBar = () => {
    if (!focused) {
      return null;
    }
    if (!commands) {
      return null;
    }
    return (
      <PositionFixed left='20px' bottom='20px' onPointerDown={event => event.preventDefault()}>
        {commands}
      </PositionFixed>
    )
  }

  return (
    <PositionRelative
      className={'item'}
      zIndex='auto'
      style={{ borderColor }}
      data-ver-local={item.ver}
      data-ver-ref={item.ref}
      data-ver-remote={item.remoteVer}
    >
      <MessageBar />
      {editor}
      <ActionBar />
      <ToolBar />
      <CommandBar />
    </PositionRelative>
  )
}

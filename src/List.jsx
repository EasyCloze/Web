import { useEffect, useState } from 'react';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import AddIcon from '@mui/icons-material/Add';
import Tooltip from '@mui/material/Tooltip';
import { useScrollTrigger } from '@mui/material';
import { localJson } from './utility/local';
import { useLocalStateJson } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import { useRefObj } from './utility/refObj';
import { generate_local_id, is_archive_id, key_remote, key_local } from './utility/id';
import API from './utility/api';
import Text from './lang/Text';
import IconButton from './widget/IconButton';
import Message from './widget/Message';
import PositionFixed from './widget/PositionFixed';
import PositionSticky from './widget/PositionSticky';
import Item from './Item';
import './List.css';

const max_list_length = 6;

function findArchiveIndex(list) {
  const index = list.findIndex(id => is_archive_id(id));
  return index === -1 ? list.length : index;
}

const min_sync_interval = 15 * 1000;
const check_sync_interval = 3 * 60 * 1000;
const op_delay_interval = 3 * 60 * 1000;
const delete_delay_interval = 1 * 60 * 1000;
const idle_sync_interval = 10 * 60 * 1000;

export default function ({ token, setToken, getMenuRef, setListRef }) {
  const [list, setList] = useLocalStateJson('list', []);
  const archiveIndex = findArchiveIndex(list);
  const [getErrorRef, setErrorRef] = useRefGetSet();
  const [getLengthRef, setLengthRef] = useRefGetSet();
  const highlight = useRefObj(() => {
    return {
      value: false,
      setHighlight: value => getMenuRef().setHighlight(highlight.value = value),
      updateHighlight: () => {},
    }
  });
  const item_map = useRefObj(() => new Map());
  const sync_state = useRefObj(() => {
    return {
      manager: null,
      enabled: false,
      syncing: false,
      deleting_item_buffer: [],
      new_item_buffer: [],
      time: 0,
      next: 0,
    }
  });

  function set_next_sync_time(next) {
    sync_state.next = next;
    getMenuRef().setNext(next);
  }

  useEffect(() => {
    set_next_sync_time(sync_state.next);
  });

  sync_state.manager = (function () {
    function enable() {
      if (sync_state.enabled) {
        return;
      }
      sync_state.enabled = true;
      sync_state.next = 0;
      prepare_sync();
    }

    function disable() {
      sync_state.enabled = false;
    }

    async function do_sync() {
      if (!token) {
        disable();
        return;
      }
      if (Date.now() < sync_state.time + min_sync_interval) {
        getErrorRef().setError('list.error.limit.sync.message');
        return;
      }
      if (sync_state.syncing) {
        return;
      }
      await sync();
    }

    async function prepare_sync() {
      if (!sync_state.enabled) {
        return;
      }
      if (Date.now() >= sync_state.next) {
        await do_sync();
        setTimeout(() => sync_state.manager.prepare_sync(), check_sync_interval);
      } else {
        setTimeout(() => sync_state.manager.prepare_sync(), Math.min(sync_state.next - Date.now(), check_sync_interval));
      }
    }

    function op() {
      if (sync_state.enabled) {
        set_next_sync_time(Date.now() + op_delay_interval);
      }
    }

    function ensure_delete_delay() {
      if (sync_state.enabled) {
        if (sync_state.next - Date.now() < delete_delay_interval) {
          set_next_sync_time(Date.now() + delete_delay_interval);
        }
      }
    }

    return {
      enable,
      disable,
      do_sync,
      prepare_sync,
      op,
      ensure_delete_delay
    }
  })();

  setListRef({
    sync: sync_state.manager.do_sync,
    setHighlight: format => highlight.updateHighlight(highlight.value = format),
  });

  useEffect(() => {
    if (token) {
      sync_state.manager.enable();
      sync_state.time = getMenuRef().time;
    } else {
      sync_state.manager.disable();
      setList(list.map(id => {
        const [remote, setRemote] = localJson(key_remote(id));
        const [local, setLocal] = localJson(key_local(id));
        if (!local) {
          return;
        }
        const { ver, val } = local;
        if (ver > 0 && val) {
          if (!remote) {
            return id;
          } else {
            id = generate_local_id(ver);
            const [, setLocalNew] = localJson(key_local(id));
            setLocalNew({ ref: 0, ver, val });
          }
        } else {
          id = null;
        }
        setRemote(null);
        setLocal(null);
        return id;
      }).filter(id => id).sort());
    }
  }, [token]);

  function onCreate(id) {
    const index = archiveIndex;
    setList([...list.slice(0, index), id, ...list.slice(index, list.length)]);
    if (sync_state.syncing) {
      sync_state.new_item_buffer.push(id);
    }
    if (index < max_list_length) {
      sync_state.manager.op();
    }
  }

  function onUpdate(index) {
    if (index < max_list_length) {
      sync_state.manager.op();
    }
  }

  function onDelete(id) {
    if (sync_state.syncing) {
      sync_state.deleting_item_buffer.push(id);
    }
    sync_state.manager.ensure_delete_delay();
    focusNext(id);
  }

  function focusNext(id) {
    const index = list.indexOf(id);
    const begin = index < archiveIndex ? 0 : archiveIndex;
    const end = index < archiveIndex ? archiveIndex : list.length;
    let find_next = true;
    for (let next = index + 1; find_next && next < end; next++) {
      find_next = !item_map.get(list[next]).focus();
    }
    for (let prev = index - 1; find_next && prev >= begin; prev--) {
      find_next = !item_map.get(list[prev]).focus();
    }
  }

  function onArchive(id_new) {
    setList([...list, id_new]);
  }

  function onUnarchive(id_new) {
    onCreate(id_new);
  }

  async function fetch_sync(token, body) {
    try {
      const response = await fetch(API('/item/sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });
      if (response.status !== 200) {
        switch (response.status) {
          case 404: setToken(null); break;
          case 429: getErrorRef().setError('list.error.limit.sync.message'); break;
          default: throw new Error();
        }
        return null;
      } else {
        getErrorRef().setError(null);
        return await response.json();
      }
    } catch (error) {
      getMenuRef().onSync(0);
      return null;
    }
  }

  async function sync() {
    let local = [];

    list.slice(0, Math.min(max_list_length, archiveIndex)).forEach(id => {
      const item = item_map.get(id).sync();
      if (item) {
        local.push(item);
      }
    });

    getMenuRef().setSyncing(sync_state.syncing = true);
    const remote = await fetch_sync(token, local);
    getMenuRef().setSyncing(sync_state.syncing = false);

    if (!remote || !sync_state.enabled) {
      return;
    }

    sync_state.time = Date.now();
    getMenuRef().onSync(sync_state.time);
    set_next_sync_time(sync_state.time + idle_sync_interval);

    let list_add = [];
    let set_delete = new Set();

    function onAdd(id_new) {
      list_add.push(id_new);
    }

    function onRemove(id) {
      set_delete.add(id);
      item_map.delete(id);
    }

    function onMove(id, id_new) {
      onRemove(id);
      onAdd(id_new);
    }

    let current_item_set = list.reduce((set, id) => set.add(id), new Set());

    let new_item_list = remote.filter(item => {
      if (current_item_set.delete(item.id)) {
        item_map.get(item.id).merge(item, onMove);
        return false;
      }
      return true;
    });

    sync_state.deleting_item_buffer.forEach(id => {
      if (current_item_set.delete(id)) {
        item_map.get(id).merge(null, onMove);
      }
    });
    sync_state.deleting_item_buffer = [];

    current_item_set.forEach(id => {
      item_map.get(id).merge(null, onMove, onRemove);
    });

    new_item_list.forEach(({ id, ver, val }) => {
      const [, setRemoteNew] = localJson(key_remote(id));
      const [, setLocalNew] = localJson(key_local(id));
      setRemoteNew({ ver, val });
      setLocalNew({ ref: ver, ver: ver, val: null });
      onAdd(id);
    });

    setList([...list.filter(id => !set_delete.has(id)), ...list_add, ...sync_state.new_item_buffer].sort());
    sync_state.new_item_buffer = [];
  }

  const Error = () => {
    const error_display_time = 10 * 1000;
    const [error, setError] = useState(null);
    const scrollTrigger = useScrollTrigger({ threshold: 30 });

    useEffect(() => {
      if (error) {
        setTimeout(() => {
          setError(null);
        }, error_display_time);
      }
    }, [error]);

    useEffect(() => {
      if (error && scrollTrigger) {
        setError(null);
      }
    }, [scrollTrigger]);

    setErrorRef({
      setError
    });

    if (!error) {
      return null;
    }

    return (
      <PositionSticky top='50px' style={{ paddingTop: '5px', textAlign: 'center' }}>
        <Message><Text id={error} /></Message>
      </PositionSticky>
    )
  }

  const Length = () => {
    const [overlength, setOverlength] = useState(false);

    setLengthRef({
      setOverlength
    });

    return (
      <Tooltip title={overlength && <Text id='list.length.tooltip' />}>
        <div id='list-length' className={overlength && 'overlength'}>- {<Text id='list.length.text' />} {archiveIndex} -</div>
      </Tooltip>
    )
  }

  useEffect(() => {
    getLengthRef().setOverlength(token && archiveIndex > max_list_length);
  });

  return (
    <>
      <Error />
      <div className='list'>
        {
          list.slice(0, archiveIndex).map((id, index) => (
            <Item
              key={id}
              token={token}
              highlight={highlight}
              setItemRef={val => item_map.set(id, val)}
              id={id}
              onUpdate={() => onUpdate(index)}
              onDelete={() => onDelete(id)}
              onArchive={onArchive}
            />
          ))
        }
        <Length />
        {
          archiveIndex < list.length &&
          <div className='archive' >
            <div className='archive-title'><Text id='list.archive.text' /></div>
            {
              list.slice(archiveIndex, list.length).map(id => (
                <Item
                  key={id}
                  token={token}
                  highlight={highlight}
                  setItemRef={val => item_map.set(id, val)}
                  id={id}
                  onUpdate={() => {}}
                  onDelete={() => focusNext(id)}
                  onUnarchive={onUnarchive}
                />
              ))
            }
          </div>
        }
      </div>
      <PositionFixed right='20px' bottom='20px'>
        <IconButton icon={<VerticalAlignTopIcon />} title={<Text id='list.scroll_top.tooltip' />} onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })} />
        <IconButton icon={<VerticalAlignBottomIcon />} title={<Text id='list.scroll_bottom.tooltip' />} onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })} />
        <IconButton icon={<AddIcon />} title={<Text id='list.create.tooltip' />} onClick={() => onCreate(generate_local_id())} />
      </PositionFixed>
    </>
  )
}

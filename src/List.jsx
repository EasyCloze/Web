import { useEffect, useState } from 'react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import { localJson } from './utility/local';
import { useLocalStateJson } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import { useRefObj } from './utility/refObj';
import { generate_local_id, key_remote, key_local } from './utility/id';
import API from './utility/api';
import Text from './lang/Text';
import Message from './widget/Message';
import Placeholder from './widget/Placeholder';
import PositionAbsolute from './widget/PositionAbsolute';
import PositionSticky from './widget/PositionSticky';
import Item from './Item';
import './List.css';

export default function List({ token, setToken, getMenuRef, setListRef }) {
  const max_list_length = 10;
  const min_sync_interval = 15 * 1000;
  const [list, setList] = useLocalStateJson('list', []);
  const [getErrorRef, setErrorRef] = useRefGetSet();
  const item_map = useRefObj(() => new Map());
  const sync_state = useRefObj(() => {
    return {
      enabled: false,
      last_op_time: 0,
      last_sync_time: 0,
      syncing: false,
    }
  });

  async function sync_fetch(token, body) {
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
      getMenuRef().onSync(false);
      return null;
    }
  }

  async function sync() {
    let local = [];

    list.slice(0, max_list_length).forEach(id => {
      const item = item_map.get(id).sync();
      if (item) {
        local.push(item);
      }
    });

    const remote = await sync_fetch(token, local);
    if (!remote) {
      return;
    }
    if (!sync_state.enabled) {
      return;
    }

    let set_delete = new Set();
    let list_add = [];

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
      if (current_item_set.has(item.id)) {
        current_item_set.delete(item.id);
        item_map.get(item.id).merge(item, onMove, onRemove);
        return false;
      }
      return true;
    });

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

    setList([...list.filter(id => !set_delete.has(id)), ...list_add].sort());

    getMenuRef().onSync(true);
  }

  let sync_manager = sync_state.sync_manager = (function () {
    async function enable() {
      if (sync_state.enabled) {
        return;
      }
      sync_state.enabled = true;
      prepare_sync();
    }

    async function disable() {
      sync_state.enabled = false;
      sync_state.last_op_time = 0;
      sync_state.last_sync_time = 0;
    }

    async function do_sync() {
      if (sync_state.syncing) {
        return;
      }
      if (!token) {
        sync_manager.disable();
        return;
      }
      if (Date.now() < getMenuRef().time + min_sync_interval) {
        getErrorRef().setError('list.error.limit.sync.message');
        return;
      }
      sync_state.last_sync_time = Date.now();
      sync_state.syncing = true;
      getMenuRef().setSyncing(true);
      await sync();
      sync_state.syncing = false;
      getMenuRef().setSyncing(false);
    }

    async function prepare_sync() {
      if (!sync_state.enabled) {
        return;
      }
      const op_sync_waiting_time = 60 * 1000;
      const sync_period = 5 * 60 * 1000;
      const op_time_elapse = Date.now() - sync_state.last_op_time;
      const sync_time_elapse = Date.now() - sync_state.last_sync_time;
      let next_sync;
      if (op_time_elapse >= op_sync_waiting_time && sync_time_elapse >= sync_period) {
        await do_sync();
        next_sync = sync_period;
      } else {
        next_sync = Math.max(op_sync_waiting_time - op_time_elapse, sync_period - sync_time_elapse);
      }
      setTimeout(() => sync_state.sync_manager.prepare_sync(), next_sync);
    }

    async function op() {
      if (sync_state.enabled) {
        sync_state.last_op_time = Date.now();
      }
    }

    return {
      enable,
      disable,
      do_sync,
      prepare_sync,
      op
    }
  })();

  useEffect(() => {
    if (token) {
      sync_manager.enable();
    } else {
      sync_manager.disable();
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

  function onCreate() {
    sync_manager.op();
    setList([...list, generate_local_id()]);
  }

  function onUpdate() {
    sync_manager.op();
  }

  setListRef({
    sync: () => sync_manager.do_sync()
  });

  const Error = () => {
    const error_display_time = 10 * 1000;
    const [error, setError] = useState(null);

    useEffect(() => {
      setTimeout(() => {
        setError(null);
      }, error_display_time);
    });

    setErrorRef({
      setError
    });

    if (!error) {
      return null;
    }

    return (
      <PositionSticky top='0px'>
        <Placeholder height='10px' />
        <Message><Text id={error} /></Message>
        <Placeholder height='5px' />
      </PositionSticky>
    )
  }

  useEffect(() => {
    if (token && list.length > max_list_length) {
      getErrorRef().setError('list.error.overlength.message');
    }
  });

  return (
    <div className='list'>
      <Error />
      {
        list.map(id => (
          <Item
            key={id}
            item_map={item_map}
            id={id}
            onUpdate={onUpdate}
          />
        ))
      }
      <PositionAbsolute right='20px' bottom='20px'>
        <Tooltip title={<Text id='list.create.tooltip' />}>
          <IconButton onClick={onCreate} >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </PositionAbsolute>
    </div>
  )
}

import { useEffect, useMemo } from 'react';
import { localJson } from './utility/local';
import { useLocalStateJson } from './utility/localState';
import { generate_local_id, key_remote, key_local } from './utility/id';
import API from './utility/api';
import Text from './lang/Text';
import Button from './widget/Button';
import Message from './widget/Message';
import Placeholder from './widget/Placeholder';
import PositionAbsolute from './widget/PositionAbsolute';
import PositionSticky from './widget/PositionSticky';
import Item from './Item';
import './List.css';

export default function List({ token, setToken, getMenuRef, setListRef }) {
  const max_list_length = 10;
  const [list, setList] = useLocalStateJson('list', []);
  let item_map = useMemo(() => new Map(), []);
  let sync_state = useMemo(() => {
    return {
      enabled: false,
      last_op_time: 0,
      last_sync_time: 0,
      syncing: false,
    }
  }, []);

  async function sync_fetch(token, body) {
    try {
      const response = await fetch(API('/item/sync'), {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      if (response.status !== 200) {
        setToken(null);
        return null;
      }

      return await response.json();
    } catch (error) {
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
      getMenuRef().onSync(false);
      return;
    }
    if (!sync_state.enabled) {
      return;
    }

    let set_delete = new Set();
    let list_add = [];

    function onRemove(id) {
      set_delete.add(id);
    }

    function onAdd(id_new) {
      list_add.push(id_new);
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
      const op_sync_waiting_time = 10 * 1000;
      const sync_period = 60 * 1000;
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
      sync_state.last_op_time = Date.now();
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
    if (!token) {
      sync_manager.disable();
      setList(list.map(id => {
        const [remote, setRemote] = localJson(key_remote(id));
        const [{ ver, val }, setLocal] = localJson(key_local(id));
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
    } else {
      sync_manager.enable();
    }
  }, [token]);

  function onCreate() {
    setList([...list, generate_local_id()]);
    sync_manager.op();
  }

  function onUpdate() {
    sync_manager.op();
  }

  setListRef({
    sync: () => sync_manager.do_sync()
  });

  return (
    <div className='list'>
      {
        list.length > max_list_length
        &&
        <PositionSticky top='0px'>
          <Placeholder height='10px' />
          <Message text='You can create at most 10 items. The remaining items will not be synced.' />
          <Placeholder height='5px' />
        </PositionSticky>
      }
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
        <Button text='create' onClick={onCreate} />
      </PositionAbsolute>
    </div>
  )
}

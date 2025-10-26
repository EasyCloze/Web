import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import { addItem } from './data/itemCache';
import { initialItem } from './data/item';
import { generateLocalId } from './data/id';
import { useReadOnlyMetaState } from './data/metaState';
import { useListState } from './data/listState';
import { findArchiveIndex, maxSyncNumber } from './data/list';
import Text from './lang/Text';
import IconButton from './widget/IconButton';
import PositionFixed from './widget/PositionFixed';
import Item from './Item';
import './List.css';

export default function () {
  const list = useListState();
  const loggedIn = useReadOnlyMetaState('loggedIn', false);
  const archiveIndex = findArchiveIndex(list);
  const overlength = loggedIn && archiveIndex > maxSyncNumber;

  return (
    <>
      <div className='list'>
        {
          list.slice(0, archiveIndex).map((id) => <Item key={id} id={id} />)
        }
        <Tooltip title={overlength && <Text id='list.length.tooltip' />}>
          <div id='list-length' className={overlength && 'overlength'}>- {<Text id='list.length.text' />} {archiveIndex} -</div>
        </Tooltip>
        {
          archiveIndex < list.length &&
          <div className='archive' >
            <div className='archive-title'><Text id='list.archive.text' /></div>
            {
              list.slice(archiveIndex, list.length).map((id) => <Item key={id} id={id} />)
            }
          </div>
        }
      </div>
      <PositionFixed right='20px' bottom='20px'>
        <IconButton icon={<VerticalAlignTopIcon />} title={<Text id='list.scrollTop.tooltip' />} onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })} />
        <IconButton icon={<VerticalAlignBottomIcon />} title={<Text id='list.scrollBottom.tooltip' />} onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })} />
        <IconButton icon={<AddIcon />} title={<Text id='list.create.tooltip' />} onClick={() => addItem(initialItem(generateLocalId()))} />
      </PositionFixed>
    </>
  )
}

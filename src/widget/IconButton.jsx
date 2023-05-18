import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

export default function ({ icon, title, onClick }) {
  return (
    <Tooltip title={title}>
      <IconButton onClick={onClick} >
        {icon}
      </IconButton>
    </Tooltip>
  )
}

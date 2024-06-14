import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

export default function ({ icon, title, disabled, onClick }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton disabled={disabled} onClick={onClick} >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  )
}

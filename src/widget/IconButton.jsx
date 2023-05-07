import './IconButton.css';

export default function ({ onClick, children, ...props }) {
  return <button type="button" className="icon-button" onClick={onClick} {...props}>{children}</button>
}

import './Button.css';

export default function ({ onClick, children, ...props }) {
  return <button type="button" className="button" onClick={onClick} {...props}>{children}</button>
}

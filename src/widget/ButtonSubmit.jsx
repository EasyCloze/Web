import './Button.css';

export default function ({ children, ...props }) {
  return <button type="submit" className="button" {...props}>{children}</button>
}

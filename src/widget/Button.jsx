import './Button.css'

export default function ({ text, onClick, ...props }) {
  return <button type="button" className="button" onClick={onClick} {...props}>{text}</button>
}

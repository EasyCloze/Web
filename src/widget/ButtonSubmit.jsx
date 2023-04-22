import './Button.css'

export default function ({ text, ...props }) {
  return <button type="submit" className="button" {...props}>{text}</button>
}

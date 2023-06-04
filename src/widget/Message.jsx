import './Message.css';

export default function ({ children, ...props }) {
  return <div className='message' {...props}>{children}</div>
}

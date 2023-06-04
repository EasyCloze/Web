import './Label.css';

export default function ({ children, ...props }) {
  return <div className='label' {...props}>{children}</div>
}

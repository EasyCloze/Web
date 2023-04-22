export default function ({ left, top, right, bottom, children, ...props }) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 1,
        left,
        top,
        right,
        bottom
      }}
      {...props}
    >
      {children}
    </div>
  )
}

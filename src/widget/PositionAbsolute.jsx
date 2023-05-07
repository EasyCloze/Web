export default function ({ zIndex = 1, left, top, right, bottom, width, height, children, ...props }) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex,
        left,
        top,
        right,
        bottom,
        width,
        height,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

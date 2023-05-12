export default function ({ innerRef, zIndex = 1, left, top, right, bottom, width, height, style, children, ...props }) {
  return (
    <div
      ref={innerRef}
      style={{
        position: 'absolute',
        zIndex,
        left,
        top,
        right,
        bottom,
        width,
        height,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  )
}

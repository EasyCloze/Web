export default function ({ width, height }) {
  if (width) {
    return (
      <div
        style={{
          display: 'inline-block',
          width,
        }}
      >
      </div>
    )
  }
  if (height) {
    return (
      <div
        style={{
          display: 'block',
          height,
        }}
      >
      </div>
    )
  }
  return null;
}

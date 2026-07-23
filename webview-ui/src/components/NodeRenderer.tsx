export default function NodeRenderer({ node }: { node: any }) {
  const { position, dimensions, style, type, content } = node;
  const x = position?.x || 0;
  const y = position?.y || 0;
  const width = dimensions?.width || 220;
  const height = dimensions?.height || 90;

  const bgColor = style?.backgroundColor || '#2c2c2c';
  const borderColor = style?.borderColor || '#555555';
  const textColor = style?.color || '#ffffff';

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: textColor,
    fontFamily: 'sans-serif',
    fontSize: '14px',
    textAlign: 'center',
    padding: '10px',
    boxSizing: 'border-box',
    border: `2px solid ${borderColor}`,
    backgroundColor: bgColor,
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    wordBreak: 'break-word',
  };

  let specificStyle: React.CSSProperties = {};

  if (type === 'pill') {
    specificStyle.borderRadius = '50px';
  } else if (type === 'diamond') {
    specificStyle.transform = 'rotate(45deg)';
    // To keep text straight, we wrap content in an un-rotated div
  } else if (type === 'database') {
    specificStyle.borderRadius = '10px / 20px';
  } else {
    // box, etc
    specificStyle.borderRadius = '4px';
  }

  return (
    <div style={{ ...baseStyle, ...specificStyle }}>
      {type === 'diamond' ? (
        <div style={{ transform: 'rotate(-45deg)' }}>{content}</div>
      ) : (
        <div>{content}</div>
      )}
    </div>
  );
}

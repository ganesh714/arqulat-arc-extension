export function mapNodeTypeAlias(type: string): string {
  if (!type) return 'box';
  switch (type.toLowerCase().trim()) {
    case 'rhombus':
    case 'decision':
    case 'condition':
      return 'diamond';
    case 'capsule':
    case 'ellipse':
    case 'oval':
    case 'start':
    case 'end':
      return 'pill';
    case 'rectangle':
    case 'action':
    case 'process':
      return 'box';
    case 'database':
    case 'db':
      return 'database';
    case 'document':
    case 'doc':
      return 'document';
    default:
      return type;
  }
}

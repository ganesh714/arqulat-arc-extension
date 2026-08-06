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
    case 'terminator':
      return 'pill';
    case 'rectangle':
    case 'action':
    case 'process':
    case 'rect':
      return 'box';
    case 'database':
    case 'db':
    case 'storage':
    case 'datastore':
      return 'database';
    case 'document':
    case 'doc':
      return 'document';
    case 'cloud':
    case 'internet':
    case 'network':
    case 'cdn':
      return 'cloud';
    case 'server':
    case 'host':
    case 'infrastructure':
    case 'vm':
      return 'server';
    case 'browser':
    case 'client':
    case 'web':
    case 'webapp':
      return 'browser';
    case 'cylinder':
    case 'queue':
    case 'message-queue':
    case 'buffer':
    case 'broker':
      return 'cylinder';
    case 'component':
    case 'service':
    case 'microservice':
    case 'module':
      return 'component';
    case 'mobile':
    case 'app':
    case 'phone':
      return 'mobile';
    case 'rounded-rect':
    case 'rounded':
    case 'api':
    case 'gateway':
      return 'rounded-rect';
    default:
      return type;
  }
}

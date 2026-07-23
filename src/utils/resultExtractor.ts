export function extractResultTag(rawResponse: string): string {
  const startTag = "<RESULT>";
  const endTag = "</RESULT>";
  
  const startIndex = rawResponse.indexOf(startTag);
  const endIndex = rawResponse.indexOf(endTag);
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return rawResponse.substring(startIndex + startTag.length, endIndex).trim();
  }
  
  return rawResponse.trim();
}

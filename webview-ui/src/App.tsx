import { useState, useEffect } from 'react';
import DiagramViewer from './components/DiagramViewer';

function App() {
  const [diagram, setDiagram] = useState<any>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'renderDiagram') {
        setDiagram(message.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!diagram) {
    return (
      <div style={{ padding: '20px', color: 'var(--vscode-editor-foreground)', fontFamily: 'sans-serif' }}>
        <h2>Arqulat Arc</h2>
        <p>Waiting for architecture data from extension...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
      <DiagramViewer diagram={diagram} />
    </div>
  );
}

export default App;

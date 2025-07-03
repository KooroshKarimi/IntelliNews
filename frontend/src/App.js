import React from 'react';

function Health() {
  const [status, setStatus] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('error'));
  }, []);

  return <p>Status: {status || 'loading...'}</p>;
}

function App() {
  return (
    <div style={{ textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>Hello from React Frontend</h1>
      <p>This React app is served by the same Node.js container.</p>
      <Health />
    </div>
  );
}

export default App;
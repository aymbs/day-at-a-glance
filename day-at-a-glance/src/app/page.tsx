'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Redirect to the static dashboard page
    window.location.href = '/dashboard.html';
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: "'Jost', sans-serif",
      background: '#f8f4f0',
      color: '#1a1a2e'
    }}>
      <p>Loading Day at a Glance...</p>
    </div>
  );
}

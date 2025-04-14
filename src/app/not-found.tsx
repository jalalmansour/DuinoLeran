import React from 'react';

const NotFound = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f0f0' }}>
      <div>
        <h1 style={{ fontSize: '3em', color: '#333', marginBottom: '0.5em' }}>404 - Page Not Found</h1>
        <p style={{ fontSize: '1.5em', color: '#666' }}>The page you are looking for does not exist.</p>
      </div>
    </div>
  );
};

export default NotFound;
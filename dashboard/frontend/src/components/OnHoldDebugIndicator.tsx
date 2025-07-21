import React from 'react';

const OnHoldDebugIndicator: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'red',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: 'bold',
      border: '2px solid yellow'
    }}>
      🔍 ONHOLD FIELD DEBUG: If you can see this, the onhold field should be visible in forms!
    </div>
  );
};

export default OnHoldDebugIndicator;

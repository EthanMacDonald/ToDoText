import React from 'react';

// Debug component to verify onhold field exists
const DebugOnHoldField: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'red',
      color: 'white',
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      🔍 OnHold Debug: Field should be visible in forms
    </div>
  );
};

export default DebugOnHoldField;

import React from 'react';

interface SimpleTestProps {
  message?: string;
}

export default function SimpleTest({ message = 'Hello from SimpleTest!' }: SimpleTestProps) {
  return (
    <div className="simple-test p-4 bg-blue-100 border border-blue-300 rounded" style={{backgroundColor: 'lightblue', padding: '16px', border: '2px solid blue', margin: '8px'}}>
      <h3 className="font-bold" style={{fontWeight: 'bold', fontSize: '18px'}}>Simple Test Component</h3>
      <p style={{margin: '8px 0'}}>{message}</p>
    </div>
  );
}
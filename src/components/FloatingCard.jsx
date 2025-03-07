import React from 'react';
import { useNavigate } from 'react-router-dom';

export function FloatingCard({ title, items, linkTo }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (linkTo) {
      navigate(linkTo);
    }
  };

  return (
    <div className="floating-card" onClick={handleClick}>
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-content">
        {items && items.length > 0 && (
          <>
            <h4 className="text-base font-medium">Principais Colunas:</h4>
            <ul>
              {items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
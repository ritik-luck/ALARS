import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({ options, value, onChange, placeholder = 'Select...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-dropdown-container" ref={containerRef}>
      <div 
        className="custom-dropdown-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedOption ? 'var(--text-primary)' : 'var(--muted)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease',
          opacity: 0.5
        }} />
      </div>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((option) => (
            <div
              key={option.id || option.value}
              className={`custom-dropdown-item ${value === (option.id || option.value) ? 'custom-dropdown-item--active' : ''}`}
              onClick={() => {
                onChange(option.id || option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;

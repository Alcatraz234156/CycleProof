import React from 'react';

interface Props {
  options: string[];
  active: string;
  onChange: (v: string) => void;
}

const FilterRow: React.FC<Props> = ({ options, active, onChange }) => (
  <div className="cp-filter-row" role="group" aria-label="Filter options">
    {options.map((opt) => (
      <button
        key={opt}
        className={active === opt ? 'active' : ''}
        aria-pressed={active === opt}
        onClick={() => onChange(opt)}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default FilterRow;

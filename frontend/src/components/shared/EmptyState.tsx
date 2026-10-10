import React from 'react';

interface Action {
  label: string;
  onClick: () => void;
}

interface Props {
  icon?: string;
  title: string;
  body?: string;
  action?: Action;
}

const EmptyState: React.FC<Props> = ({ icon, title, body, action }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '3rem 2rem',
      gap: '0.75rem',
    }}
  >
    {icon && (
      <span
        style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: '0.25rem' }}
        aria-hidden="true"
      >
        {icon}
      </span>
    )}

    <h3
      style={{
        fontFamily: 'var(--display)',
        fontSize: '1.5rem',
        fontWeight: 800,
        lineHeight: 1.1,
        color: 'var(--ink)',
      }}
    >
      {title}
    </h3>

    {body && (
      <p
        style={{
          color: 'var(--muted)',
          fontSize: '0.9rem',
          lineHeight: 1.55,
          maxWidth: '36ch',
        }}
      >
        {body}
      </p>
    )}

    {action && (
      <button
        className="btn"
        onClick={action.onClick}
        style={{ marginTop: '0.5rem' }}
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;

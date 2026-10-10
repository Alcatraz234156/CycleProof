import React from 'react';

interface Props {
  status: string;
}

/**
 * Converts a status label to a CSS-class-safe slug.
 * e.g. "Needs review" → "needs-review", "Under Review" → "under-review"
 */
function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-');
}

const StatusBadge: React.FC<Props> = ({ status }) => (
  <span className={`cp-status ${slugify(status)}`}>{status}</span>
);

export default StatusBadge;

export function HamburgerIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12">
      <path d="M0.5 1h13M0.5 6h13M0.5 11h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" style={{ flex: 'none' }}>
      <path d="M8.8 1.6l2.6 2.6L4.6 11H2v-2.6l6.8-6.8z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" style={{ opacity: 0.55 }}>
      <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function SidebarToggleIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13">
      <rect x="0.5" y="0.5" width="14" height="12" rx="2" stroke="currentColor" fill="none" />
      <line x1="5" y1="0.5" x2="5" y2="12.5" stroke="currentColor" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FileIcon({ dashed }: { dashed?: boolean }) {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" style={{ flex: 'none' }}>
      <path
        d="M1.5 1h6L11 4.5V13H1.5V1z"
        stroke="currentColor"
        fill="none"
        strokeLinejoin="round"
        strokeDasharray={dashed ? '2.5 2' : undefined}
      />
      <path d="M7.5 1v3.5H11" stroke="currentColor" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function DropHintIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" style={{ flex: 'none' }}>
      <rect x="0.5" y="0.5" width="12" height="12" rx="3" stroke="currentColor" strokeDasharray="2.5 2" fill="none" />
      <path d="M6.5 3.5v4M4.7 6l1.8 1.8L8.3 6" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DragDropIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ color: 'var(--link)' }}>
      <path d="M20 8v18M12 18l8 8 8-8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 32h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyDocIcon() {
  return (
    <svg width="34" height="40" viewBox="0 0 12 14" style={{ color: 'var(--border)' }}>
      <path d="M1.5 1h6L11 4.5V13H1.5V1z" stroke="currentColor" fill="none" strokeLinejoin="round" />
      <path d="M7.5 1v3.5H11" stroke="currentColor" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function BrokenImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <rect x="1" y="1" width="20" height="20" rx="4" stroke="currentColor" fill="none" />
      <path d="M1 16l6-6 5 5 3-3 6 6" stroke="currentColor" fill="none" />
      <circle cx="8" cy="7" r="1.6" fill="currentColor" />
      <path d="M2 2l18 18" stroke="currentColor" />
    </svg>
  );
}

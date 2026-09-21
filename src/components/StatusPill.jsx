export default function StatusPill({ level, children }) { return <span className={`status-pill ${level?.toLowerCase() || 'medium'}`}><i /> {children || level}</span> }

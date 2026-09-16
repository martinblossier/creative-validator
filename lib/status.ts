// Plain constants with no server-only dependencies, safe to import from
// client components. lib/sheets.ts (which pulls in googleapis) re-exports
// these for server-side code.
export const STATUS_VALIDATED = 'Validé';
export const STATUS_REJECTED = 'À retravailler';

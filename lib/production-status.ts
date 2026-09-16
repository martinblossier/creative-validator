// Plain constants, safe to import from client components.
export const PRODUCTION_STATUSES = ['Non assignée', 'Assignée', 'En cours', 'Prête'] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

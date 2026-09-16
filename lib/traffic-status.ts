// Plain constants, safe to import from client components.
export const TRAFFIC_STATUSES = ['a_commencer', 'en_cours', 'termine'] as const;
export type TrafficStatus = (typeof TRAFFIC_STATUSES)[number];

export const TRAFFIC_STATUS_LABELS: Record<TrafficStatus, string> = {
  a_commencer: 'À commencer',
  en_cours: 'En cours',
  termine: 'Terminé',
};

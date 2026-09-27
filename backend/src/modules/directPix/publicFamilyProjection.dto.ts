/**
 * Donor-safe Direct Pix eligibility. This is deliberately a closed vocabulary:
 * neither operational causes nor any payment/identity state is public.
 */
export const DIRECT_PIX_PUBLIC_FAMILY_AVAILABILITY = [
  'AVAILABLE',
  'IN_PROGRESS',
  'SERVED_THIS_CYCLE',
  'UNAVAILABLE',
] as const;

export type DirectPixPublicFamilyAvailability =
  (typeof DIRECT_PIX_PUBLIC_FAMILY_AVAILABILITY)[number];

/**
 * The entire public Direct Pix projection. Do not add a key, assignment, reason,
 * civil name, address, person count, or other family-identifying field here.
 */
export interface DirectPixPublicFamilyProjection {
  id: string;
  availability: DirectPixPublicFamilyAvailability;
}

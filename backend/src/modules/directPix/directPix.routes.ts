import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { acceptCurrentTerms, getCurrentTerms } from './terms.controller';
import { getReadiness } from './readiness.controller';
import { requireVerifiedEmail } from './verifiedEmailGuard';
import { acceptFamilyResponsibleInvitation, endFamilyResponsibleAssignment, getOwnFamilyResponsibleState, inviteFamilyResponsible } from './responsible.controller';
import { getCurrentOwnEvpKey, revokeOwnEvpKey, submitOwnEvpKey } from './evpKey.controller';
import { confirmAssistedEvpKey, listOwnAwaitingAssistedEvpKeys, submitAssistedEvpKey } from './assistedEvp.controller';
import { getEvpReviewQueue, reviewEvpKey, secondApproveEvpKey } from './evpReview.controller';
import { cancelDonorDeclaration, confirmReceiptByResponsible, listEntityFollowUpCases, recordAssistedReceiptResponse } from './receiptResponse.controller';
import { createIntent, grantDisclosure, disclose, declare, familyPublicProjection } from './directPixIntent.controller';

export const directPixRoutes = Router();

// The acceptance/read routes have a responsible-specific contract and remain separate
// from donor operations to prevent accidental cross-role authorization.
directPixRoutes.post('/family-responsible-invitations/accept', authGuard, roleGuard('beneficiary'), acceptFamilyResponsibleInvitation);
directPixRoutes.get('/responsible/state', authGuard, getOwnFamilyResponsibleState);
directPixRoutes.get('/responsible/evp-key-versions/current', authGuard, roleGuard('beneficiary'), getCurrentOwnEvpKey);
directPixRoutes.post('/responsible/evp-key-versions', authGuard, roleGuard('beneficiary'), submitOwnEvpKey);
directPixRoutes.post('/responsible/evp-key-versions/:versionId/revoke', authGuard, roleGuard('beneficiary'), revokeOwnEvpKey);
// Assisted submission is entity-scoped in the service; confirmation is always bound to the active responsible.
directPixRoutes.post('/families/:familyId/assisted-evp-key-versions', authGuard, roleGuard('entity'), submitAssistedEvpKey);
directPixRoutes.get('/responsible/assisted-evp-key-versions', authGuard, listOwnAwaitingAssistedEvpKeys);
directPixRoutes.post('/responsible/evp-key-versions/:versionId/confirm-assisted', authGuard, confirmAssistedEvpKey);
directPixRoutes.post('/families/:familyId/responsible-invitations', authGuard, roleGuard('entity', 'admin'), inviteFamilyResponsible);
directPixRoutes.post('/families/:familyId/responsible-assignments/:assignmentId/end', authGuard, roleGuard('entity', 'admin'), endFamilyResponsibleAssignment);
// Review scope and maker/checker separation are resolved again in the domain service.
directPixRoutes.get('/evp-key-reviews/queue', authGuard, roleGuard('entity'), getEvpReviewQueue);
directPixRoutes.post('/evp-key-versions/:versionId/reviews', authGuard, roleGuard('entity'), reviewEvpKey);
directPixRoutes.post('/evp-key-versions/:versionId/second-approval', authGuard, roleGuard('entity'), secondApproveEvpKey);
// Receipt statements remain distinct from donor operations and preserve the real declarant.
directPixRoutes.post('/responsible/intents/:intentId/receipt-confirmations', authGuard, roleGuard('beneficiary'), confirmReceiptByResponsible);
directPixRoutes.post('/entity/intents/:intentId/assisted-receipt-confirmations', authGuard, roleGuard('entity'), recordAssistedReceiptResponse);
directPixRoutes.get('/entity/follow-up-cases', authGuard, roleGuard('entity'), listEntityFollowUpCases);
directPixRoutes.get('/families/:familyId/public-projection', familyPublicProjection);

directPixRoutes.use(authGuard, roleGuard('donor'));
directPixRoutes.get('/readiness', getReadiness);
directPixRoutes.get('/terms/current', requireVerifiedEmail, getCurrentTerms);
directPixRoutes.post('/terms/acceptances', requireVerifiedEmail, acceptCurrentTerms);
directPixRoutes.post('/intents/:intentId/cancel-declaration', cancelDonorDeclaration);
directPixRoutes.post('/intents', requireVerifiedEmail, createIntent);
directPixRoutes.post('/intents/:id/disclosure-grants', requireVerifiedEmail, grantDisclosure);
directPixRoutes.get('/intents/:id/disclosure', requireVerifiedEmail, disclose);
directPixRoutes.post('/intents/:id/declaration', requireVerifiedEmail, declare);
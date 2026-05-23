namespace Mealfy.Application.Contracts.Donations;

public record CreateDonationRequest(string FamilyId, decimal Amount, string? Message = null, string? CommunityId = null);

public record BatchDonationRequest(IReadOnlyList<string> FamilyIds, decimal? AmountPerFamily = null);

public record RegionalDonationRequest(string CommunityId, decimal TotalAmount, string? Message = null);

public record GiftCardDto(
    string Id,
    string DonationId,
    string FamilyId,
    string DonorId,
    decimal Amount,
    string Provider,
    string Code,
    string Label,
    string Status,
    string? Message,
    string CreatedAt,
    string? RedeemedAt);

public record DonationDto(
    string Id,
    string DonorId,
    string FamilyId,
    decimal Amount,
    string? CommunityId,
    string? Message,
    string CreatedAt,
    string? GiftCardId);

public record DonationWithGiftDto(
    DonationDto Donation,
    GiftCardDto GiftCard,
    FamilySummaryDto? Family);

public record FamilySummaryDto(
    string Id,
    string RepresentativeName,
    string? Region,
    int ChildrenCount,
    string SupportStatus);

public record BigDonationResultDto(
    string CommunityId,
    decimal TotalDistributedAmount,
    int ImpactedFamiliesCount,
    IReadOnlyList<string> FamilyIds,
    IReadOnlyList<DonationDto> Donations,
    IReadOnlyList<GiftCardDto> GiftCards,
    string SupportTierDesc);

public record IfoodIntegrationInfoDto(
    string Provider,
    string PartnerName,
    string RedeemInstructions,
    string RedeemDeepLink,
    string WalletPath);

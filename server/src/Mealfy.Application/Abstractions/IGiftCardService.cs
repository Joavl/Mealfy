using Mealfy.Application.Contracts.Donations;

namespace Mealfy.Application.Abstractions;

public interface IGiftCardService
{
    Task<IReadOnlyList<GiftCardDto>> ListByFamilyAsync(Guid familyId, CancellationToken ct = default);
    Task<GiftCardDto?> GetActiveForFamilyAsync(Guid familyId, CancellationToken ct = default);
    Task<GiftCardDto> RedeemAsync(Guid beneficiaryUserId, Guid giftCardId, CancellationToken ct = default);
    IfoodIntegrationInfoDto GetIfoodInfo(string code);
}

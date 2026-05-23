using Mealfy.Application.Contracts.Donations;

namespace Mealfy.Application.Abstractions;

public interface IIfoodGiftService
{
    string GenerateGiftCode();
    string BuildLabel(decimal amount);
    GiftCardDto ToDto(Domain.Entities.GiftCard card);
    IfoodIntegrationInfoDto GetIntegrationInfo(string giftCode);
}

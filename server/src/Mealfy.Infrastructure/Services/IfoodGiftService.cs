using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Donations;
using Mealfy.Domain.Entities;
using Mealfy.Domain.Enums;

namespace Mealfy.Infrastructure.Services;

public class IfoodGiftService : IIfoodGiftService
{
    public string GenerateGiftCode()
    {
        var segment = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"MEALFY-{segment}";
    }

    public string BuildLabel(decimal amount) => $"Crédito iFood — R$ {amount:0}";

    public GiftCardDto ToDto(GiftCard card) => new(
        card.Id.ToString(),
        card.DonationId.ToString(),
        card.FamilyId.ToString(),
        card.DonorId.ToString(),
        card.Amount,
        card.Provider,
        card.Code,
        card.Label,
        StatusToApi(card.Status),
        card.Message,
        card.CreatedAt.ToString("o"),
        card.RedeemedAt?.ToString("o"));

    public IfoodIntegrationInfoDto GetIntegrationInfo(string giftCode) => new(
        "ifood",
        "iFood",
        "Abra o app iFood → Perfil → Carteira / Gift Card → Adicionar código → cole o código Mealfy.",
        $"https://www.ifood.com.br/gift-card?code={Uri.EscapeDataString(giftCode)}",
        "Perfil → Carteira → Gift Card");

    private static string StatusToApi(GiftCardStatus status) => status switch
    {
        GiftCardStatus.Generated => "generated",
        GiftCardStatus.Sent => "sent",
        GiftCardStatus.Delivered => "delivered",
        GiftCardStatus.Redeemed => "redeemed",
        _ => "sent"
    };
}

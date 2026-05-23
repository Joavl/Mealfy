using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Donations;
using Mealfy.Domain.Enums;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Services;

public class GiftCardService : IGiftCardService
{
    private readonly MealfyDbContext _db;
    private readonly IIfoodGiftService _ifood;

    public GiftCardService(MealfyDbContext db, IIfoodGiftService ifood)
    {
        _db = db;
        _ifood = ifood;
    }

    public async Task<IReadOnlyList<GiftCardDto>> ListByFamilyAsync(Guid familyId, CancellationToken ct = default)
    {
        var cards = await _db.GiftCards.AsNoTracking()
            .Where(g => g.FamilyId == familyId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);

        return cards.Select(_ifood.ToDto).ToList();
    }

    public async Task<GiftCardDto?> GetActiveForFamilyAsync(Guid familyId, CancellationToken ct = default)
    {
        var card = await _db.GiftCards.AsNoTracking()
            .Where(g => g.FamilyId == familyId &&
                        (g.Status == GiftCardStatus.Sent ||
                         g.Status == GiftCardStatus.Delivered ||
                         g.Status == GiftCardStatus.Generated))
            .OrderByDescending(g => g.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return card is null ? null : _ifood.ToDto(card);
    }

    public async Task<GiftCardDto> RedeemAsync(Guid beneficiaryUserId, Guid giftCardId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == beneficiaryUserId, ct)
            ?? throw new InvalidOperationException("Usuário não encontrado");

        if (user.Role != UserRole.Beneficiary || user.BeneficiaryId is null)
            throw new UnauthorizedAccessException("Apenas beneficiários podem resgatar créditos iFood");

        var card = await _db.GiftCards.FirstOrDefaultAsync(g => g.Id == giftCardId, ct)
            ?? throw new InvalidOperationException("Gift card não encontrado");

        if (card.FamilyId != user.BeneficiaryId)
            throw new UnauthorizedAccessException("Este crédito não pertence à sua família");

        if (card.Status == GiftCardStatus.Redeemed)
            return _ifood.ToDto(card);

        card.Status = GiftCardStatus.Redeemed;
        card.RedeemedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return _ifood.ToDto(card);
    }

    public IfoodIntegrationInfoDto GetIfoodInfo(string code) => _ifood.GetIntegrationInfo(code);
}

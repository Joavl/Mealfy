using Mealfy.Application.Abstractions;
using Mealfy.Domain.Enums;
using Mealfy.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Api.Controllers;

[ApiController]
[Route("giftcards")]
public class GiftCardsController : ControllerBase
{
    private readonly IGiftCardService _giftCards;
    private readonly MealfyDbContext _db;

    public GiftCardsController(IGiftCardService giftCards, MealfyDbContext db)
    {
        _giftCards = giftCards;
        _db = db;
    }

    [HttpGet("ifood/info")]
    public IActionResult IfoodInfo([FromQuery] string? code)
    {
        var info = _giftCards.GetIfoodInfo(code ?? "MEALFY-DEMO");
        return Ok(info);
    }

    [HttpGet("family/{familyId:guid}")]
    public async Task<IActionResult> ListByFamily(Guid familyId, CancellationToken ct)
    {
        await EnsureCanAccessFamilyAsync(familyId, ct);
        var list = await _giftCards.ListByFamilyAsync(familyId, ct);
        return Ok(list);
    }

    [HttpGet("family/{familyId:guid}/active")]
    public async Task<IActionResult> ActiveForFamily(Guid familyId, CancellationToken ct)
    {
        await EnsureCanAccessFamilyAsync(familyId, ct);
        var card = await _giftCards.GetActiveForFamilyAsync(familyId, ct);
        return card is null ? Ok(null) : Ok(card);
    }

    [HttpPost("{giftCardId:guid}/redeem")]
    public async Task<IActionResult> Redeem(Guid giftCardId, CancellationToken ct)
    {
        var userId = await RequireBeneficiaryAsync(ct);
        var card = await _giftCards.RedeemAsync(userId, giftCardId, ct);
        return Ok(new { giftCard = card, ifood = _giftCards.GetIfoodInfo(card.Code) });
    }

    private async Task EnsureCanAccessFamilyAsync(Guid familyId, CancellationToken ct)
    {
        if (!Guid.TryParse(HttpContext.Items["UserId"]?.ToString(), out var userId))
            throw new UnauthorizedAccessException();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedAccessException();

        if (user.Role == UserRole.Beneficiary)
        {
            if (user.BeneficiaryId != familyId)
                throw new UnauthorizedAccessException();
            return;
        }

        if (user.Role is UserRole.Donor or UserRole.Admin or UserRole.Entity)
            return;

        throw new UnauthorizedAccessException();
    }

    private async Task<Guid> RequireBeneficiaryAsync(CancellationToken ct)
    {
        if (!Guid.TryParse(HttpContext.Items["UserId"]?.ToString(), out var userId))
            throw new UnauthorizedAccessException();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || user.Role != UserRole.Beneficiary || user.BeneficiaryId is null)
            throw new UnauthorizedAccessException();

        return userId;
    }
}

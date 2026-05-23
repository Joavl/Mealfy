using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Donations;
using Mealfy.Domain.Entities;
using Mealfy.Domain.Enums;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Services;

public class DonationService : IDonationService
{
    private readonly MealfyDbContext _db;
    private readonly IIfoodGiftService _ifood;

    public DonationService(MealfyDbContext db, IIfoodGiftService ifood)
    {
        _db = db;
        _ifood = ifood;
    }

    public async Task<DonationWithGiftDto> CreateAsync(Guid donorId, CreateDonationRequest request, CancellationToken ct = default)
    {
        if (!Guid.TryParse(request.FamilyId, out var familyId))
            throw new InvalidOperationException("Família inválida");

        var donor = await _db.Users.FirstOrDefaultAsync(u => u.Id == donorId, ct)
            ?? throw new InvalidOperationException("Doador não encontrado");

        if (donor.Role != UserRole.Donor && donor.Role != UserRole.Admin)
            throw new UnauthorizedAccessException("Apenas doadores podem enviar crédito iFood");

        var family = await _db.Families.FirstOrDefaultAsync(f => f.Id == familyId, ct)
            ?? throw new InvalidOperationException("Família não encontrada");

        if (request.Amount <= 0)
            throw new InvalidOperationException("Valor inválido");

        var donation = new Donation
        {
            Id = Guid.NewGuid(),
            DonorId = donorId,
            FamilyId = familyId,
            Amount = request.Amount,
            CommunityId = request.CommunityId,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow,
        };

        var giftCard = new GiftCard
        {
            Id = Guid.NewGuid(),
            DonationId = donation.Id,
            FamilyId = familyId,
            DonorId = donorId,
            Amount = request.Amount,
            Provider = "ifood",
            Code = _ifood.GenerateGiftCode(),
            Label = _ifood.BuildLabel(request.Amount),
            Status = GiftCardStatus.Sent,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow,
        };

        family.SupportStatus = SupportStatus.Fed;
        family.LastFedAt = DateTime.UtcNow;
        donor.TotalDonated += request.Amount;

        _db.Donations.Add(donation);
        _db.GiftCards.Add(giftCard);
        await _db.SaveChangesAsync(ct);

        return ToResult(donation, giftCard, family);
    }

    public async Task<IReadOnlyList<DonationWithGiftDto>> CreateBatchAsync(
        Guid donorId, BatchDonationRequest request, CancellationToken ct = default)
    {
        var results = new List<DonationWithGiftDto>();
        foreach (var familyIdStr in request.FamilyIds)
        {
            var amount = request.AmountPerFamily ?? 30;
            try
            {
                var res = await CreateAsync(donorId, new CreateDonationRequest(familyIdStr, amount), ct);
                results.Add(res);
            }
            catch
            {
                // skip invalid families in batch
            }
        }

        if (results.Count == 0)
            throw new InvalidOperationException("Nenhuma doação foi processada");

        return results;
    }

    public async Task<BigDonationResultDto> CreateRegionalAsync(
        Guid donorId, RegionalDonationRequest request, CancellationToken ct = default)
    {
        var families = await _db.Families
            .Where(f => f.SupportStatus == SupportStatus.NeedsHelp &&
                        (f.Region.Contains(request.CommunityId) || f.City == request.CommunityId))
            .ToListAsync(ct);

        if (families.Count == 0)
            throw new InvalidOperationException("Nenhuma família carente nesta região");

        var perFamily = Math.Floor(request.TotalAmount / families.Count);
        if (perFamily <= 0)
            throw new InvalidOperationException("Valor insuficiente para distribuir");

        var donations = new List<DonationDto>();
        var giftCards = new List<GiftCardDto>();
        var familyIds = new List<string>();

        foreach (var family in families)
        {
            var res = await CreateAsync(donorId,
                new CreateDonationRequest(family.Id.ToString(), perFamily, request.Message, request.CommunityId), ct);
            donations.Add(res.Donation);
            giftCards.Add(res.GiftCard);
            familyIds.Add(family.Id.ToString());
        }

        var tier = families.Count <= 2 && request.TotalAmount > 200
            ? "Apoio Extraordinário Focado"
            : "Apoio Regional Ampliado";

        return new BigDonationResultDto(
            request.CommunityId,
            request.TotalAmount,
            families.Count,
            familyIds,
            donations,
            giftCards,
            tier);
    }

    public async Task<IReadOnlyList<DonationWithGiftDto>> ListByDonorAsync(Guid donorId, CancellationToken ct = default)
    {
        var donations = await _db.Donations.AsNoTracking()
            .Where(d => d.DonorId == donorId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(ct);

        var giftCards = await _db.GiftCards.AsNoTracking()
            .Where(g => g.DonorId == donorId)
            .ToListAsync(ct);

        var families = await _db.Families.AsNoTracking().ToListAsync(ct);

        return donations.Select(d =>
        {
            var gc = giftCards.First(g => g.DonationId == d.Id);
            var fam = families.FirstOrDefault(f => f.Id == d.FamilyId);
            return ToResult(d, gc, fam);
        }).ToList();
    }

    private DonationWithGiftDto ToResult(Donation d, GiftCard gc, Family? family) => new(
        new DonationDto(
            d.Id.ToString(),
            d.DonorId.ToString(),
            d.FamilyId.ToString(),
            d.Amount,
            d.CommunityId,
            d.Message,
            d.CreatedAt.ToString("o"),
            gc.Id.ToString()),
        _ifood.ToDto(gc),
        family is null ? null : new FamilySummaryDto(
            family.Id.ToString(),
            family.RepresentativeName,
            family.Region,
            family.ChildrenCount,
            family.SupportStatus.ToString().ToLowerInvariant()));
}

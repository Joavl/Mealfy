using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Donations;
using Mealfy.Domain.Enums;
using Mealfy.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Api.Controllers;

[ApiController]
[Route("donations")]
public class DonationsController : ControllerBase
{
    private readonly IDonationService _donations;
    private readonly MealfyDbContext _db;

    public DonationsController(IDonationService donations, MealfyDbContext db)
    {
        _donations = donations;
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDonationRequest request, CancellationToken ct)
    {
        var donorId = await RequireUserIdAsync(UserRole.Donor, UserRole.Admin, ct);
        var result = await _donations.CreateAsync(donorId, request, ct);
        return StatusCode(201, new { donation = MapDonation(result), giftCard = result.GiftCard, familyAssigned = result.Family });
    }

    [HttpPost("batch")]
    public async Task<IActionResult> Batch([FromBody] BatchDonationRequest request, CancellationToken ct)
    {
        var donorId = await RequireUserIdAsync(UserRole.Donor, UserRole.Admin, ct);
        var results = await _donations.CreateBatchAsync(donorId, request, ct);
        return StatusCode(201, results.Select(r => new { donation = MapDonation(r), giftCard = r.GiftCard, family = r.Family }));
    }

    [HttpPost("regional")]
    public async Task<IActionResult> Regional([FromBody] RegionalDonationRequest request, CancellationToken ct)
    {
        var donorId = await RequireUserIdAsync(UserRole.Donor, UserRole.Admin, ct);
        var result = await _donations.CreateRegionalAsync(donorId, request, ct);
        return StatusCode(201, result);
    }

    [HttpGet("me")]
    public async Task<IActionResult> MyDonations(CancellationToken ct)
    {
        var donorId = await RequireUserIdAsync(UserRole.Donor, UserRole.Admin, ct);
        var list = await _donations.ListByDonorAsync(donorId, ct);
        return Ok(list.Select(r => new
        {
            r.Donation.Id,
            donorId = r.Donation.DonorId,
            familyId = r.Donation.FamilyId,
            amount = r.Donation.Amount,
            communityId = r.Donation.CommunityId,
            message = r.Donation.Message,
            createdAt = r.Donation.CreatedAt,
            giftCardId = r.Donation.GiftCardId,
            giftCard = r.GiftCard,
            family = r.Family,
        }));
    }

    private static object MapDonation(DonationWithGiftDto r) => new
    {
        r.Donation.Id,
        donorId = r.Donation.DonorId,
        familyId = r.Donation.FamilyId,
        amount = r.Donation.Amount,
        communityId = r.Donation.CommunityId,
        message = r.Donation.Message,
        createdAt = r.Donation.CreatedAt,
        giftCardId = r.Donation.GiftCardId,
    };

    private async Task<Guid> RequireUserIdAsync(UserRole role1, UserRole role2, CancellationToken ct)
    {
        if (!Guid.TryParse(HttpContext.Items["UserId"]?.ToString(), out var userId))
            throw new UnauthorizedAccessException();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || (user.Role != role1 && user.Role != role2))
            throw new UnauthorizedAccessException();

        return userId;
    }
}

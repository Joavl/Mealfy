using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Families;
using Mealfy.Domain.Enums;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Services;

public class FamilyService : IFamilyService
{
    private readonly MealfyDbContext _db;

    public FamilyService(MealfyDbContext db) => _db = db;

    public async Task<IReadOnlyList<FamilyDto>> GetPublicAsync(CancellationToken ct = default)
    {
        var families = await _db.Families.AsNoTracking()
            .Where(f => f.Status == FamilyStatus.Approved)
            .OrderByDescending(f => f.CreatedAt)
            .Take(100)
            .ToListAsync(ct);

        return families.Select(ToDto).ToList();
    }

    public async Task<FamilyDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var family = await _db.Families.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct);
        return family is null ? null : ToDto(family);
    }

    private static FamilyDto ToDto(Domain.Entities.Family f) => new(
        f.Id.ToString(),
        f.RepresentativeName,
        f.Region,
        f.ChildrenCount,
        f.Status.ToString().ToLowerInvariant(),
        f.SupportStatus.ToString().ToLowerInvariant(),
        f.SourceType,
        f.SourceLabel,
        f.Latitude,
        f.Longitude,
        f.City,
        f.State);
}

using System.Text.Json;
using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Families;
using Mealfy.Domain.Entities;
using Mealfy.Domain.Enums;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Services;

public class FamilyService : IFamilyService
{
    private readonly MealfyDbContext _db;
    private readonly IFirestoreCadastroService _firestore;

    private static readonly Dictionary<string, (double Lat, double Lng)> RegionCoords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Heliópolis"] = (-23.612, -46.593),
        ["Paraisópolis"] = (-23.617, -46.728),
        ["Cidade Tiradentes"] = (-23.58, -46.74),
        ["Grajaú"] = (-23.75, -46.68),
    };

    public FamilyService(MealfyDbContext db, IFirestoreCadastroService firestore)
    {
        _db = db;
        _firestore = firestore;
    }

    public async Task<IReadOnlyList<FamilyDto>> GetPublicAsync(string? region = null, CancellationToken ct = default)
    {
        var query = _db.Families.AsNoTracking().Where(f => f.Status == FamilyStatus.Approved);
        if (!string.IsNullOrWhiteSpace(region))
        {
            var r = region.Trim();
            query = query.Where(f => f.Region == r || f.Neighborhood == r);
        }

        var families = await query.OrderByDescending(f => f.CreatedAt).Take(100).ToListAsync(ct);
        return families.Select(ToDto).ToList();
    }

    public async Task<FamilyDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var family = await _db.Families.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct);
        return family is null ? null : ToDto(family);
    }

    public async Task<FamilyDto> CreateAsync(CreateFamilyRequest request, Guid? createdByEntityId, CancellationToken ct = default)
    {
        var family = new Family
        {
            Id = Guid.NewGuid(),
            RepresentativeName = request.RepresentativeName,
            FamilyName = request.FamilyName ?? request.RepresentativeName,
            Region = request.Region,
            Neighborhood = request.Neighborhood ?? request.Region,
            City = request.City ?? "São Paulo",
            State = request.State ?? "SP",
            ChildrenCount = request.ChildrenCount,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            ShortAddress = request.ShortAddress,
            Description = request.Description,
            MainNeed = request.MainNeed ?? "Alimentação básica",
            PhotoUrl = request.PhotoUrl,
            ResponsibleCpf = request.ResponsibleCpf,
            ChildrenNamesJson = request.ChildrenNamesJson,
            PriorityLevel = request.PriorityLevel,
            NeedsEntitySupport = request.NeedsEntitySupport,
            Status = FamilyStatus.Approved,
            SupportStatus = SupportStatus.NeedsHelp,
            SourceType = request.SourceType,
            SourceLabel = request.SourceLabel ?? "Cadastro Mealfy",
            CreatedByEntityId = createdByEntityId,
        };

        _db.Families.Add(family);
        await _db.SaveChangesAsync(ct);
        var dto = ToDto(family);
        await _firestore.SaveFamilyAsync(family.Id.ToString(), dto, ct);
        return dto;
    }

    public async Task<IReadOnlyList<FamilyDto>> GetAwaitingEntityAsync(string? region, CancellationToken ct = default)
    {
        var query = _db.Families.AsNoTracking()
            .Where(f => f.NeedsEntitySupport && f.CreatedByEntityId == null && f.Status == FamilyStatus.Approved);

        if (!string.IsNullOrWhiteSpace(region))
        {
            var r = region.Trim();
            query = query.Where(f => f.Region.Contains(r) || (f.Neighborhood != null && f.Neighborhood.Contains(r)));
        }

        var list = await query.OrderByDescending(f => f.CreatedAt).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<FamilyDto> AssignEntityAsync(Guid familyId, Guid entityId, string entityName, CancellationToken ct = default)
    {
        var family = await _db.Families.FirstOrDefaultAsync(f => f.Id == familyId, ct)
            ?? throw new InvalidOperationException("Family not found");

        family.CreatedByEntityId = entityId;
        family.NeedsEntitySupport = false;
        family.SourceType = "entity";
        family.SourceLabel = $"Acolhida por {entityName}";

        await _db.SaveChangesAsync(ct);
        var dto = ToDto(family);
        await _firestore.SaveFamilyAsync(family.Id.ToString(), dto, ct);
        return dto;
    }

    public static (double Lat, double Lng) CoordsForRegion(string region)
    {
        if (RegionCoords.TryGetValue(region.Trim(), out var c))
        {
            var j = Random.Shared.NextDouble() * 0.012 - 0.006;
            return (c.Lat + j, c.Lng + j);
        }
        return (-23.5505 + Random.Shared.NextDouble() * 0.01, -46.6333 + Random.Shared.NextDouble() * 0.01);
    }

    private static FamilyDto ToDto(Family f)
    {
        object[]? children = null;
        if (!string.IsNullOrEmpty(f.ChildrenNamesJson))
        {
            try
            {
                var names = JsonSerializer.Deserialize<string[]>(f.ChildrenNamesJson) ?? Array.Empty<string>();
                children = names.Select((n, i) => (object)new { id = $"ch-{i}", name = n, age = 0, school = "A informar" }).ToArray();
            }
            catch { /* ignore */ }
        }

        return new FamilyDto(
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
            f.State,
            f.Neighborhood,
            f.ShortAddress,
            f.Description,
            f.MainNeed,
            f.PhotoUrl,
            f.FamilyName,
            f.RepresentativeName,
            f.ResponsibleCpf,
            children,
            f.NeedsEntitySupport,
            f.PriorityLevel);
    }
}

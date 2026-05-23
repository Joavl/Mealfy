using Mealfy.Application.Contracts.Families;

namespace Mealfy.Application.Abstractions;

public interface IFamilyService
{
    Task<IReadOnlyList<FamilyDto>> GetPublicAsync(string? region = null, CancellationToken ct = default);
    Task<FamilyDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<FamilyDto> CreateAsync(CreateFamilyRequest request, Guid? createdByEntityId, CancellationToken ct = default);
    Task<IReadOnlyList<FamilyDto>> GetAwaitingEntityAsync(string? region, CancellationToken ct = default);
    Task<FamilyDto> AssignEntityAsync(Guid familyId, Guid entityId, string entityName, CancellationToken ct = default);
}

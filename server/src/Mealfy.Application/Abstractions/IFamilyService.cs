using Mealfy.Application.Contracts.Families;

namespace Mealfy.Application.Abstractions;

public interface IFamilyService
{
    Task<IReadOnlyList<FamilyDto>> GetPublicAsync(CancellationToken ct = default);
    Task<FamilyDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
}

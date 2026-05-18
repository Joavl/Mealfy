using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities;

public class FamilyValidation
{
    public Guid Id { get; set; }
    public Guid FamilyId { get; set; }
    public ValidationSource Source { get; set; }
    public bool Verified { get; set; }
    public DateTime? CheckedAt { get; set; }
    public string? Notes { get; set; }

    public Family Family { get; set; } = null!;
}

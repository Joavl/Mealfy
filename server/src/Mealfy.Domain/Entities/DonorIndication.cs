using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities;

public class DonorIndication
{
    public Guid Id { get; set; }
    public string RepresentativeName { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public int ChildrenCount { get; set; }
    public string Observation { get; set; } = string.Empty;
    public string? Contact { get; set; }
    public Guid IndicatedByUserId { get; set; }
    public IndicationStatus Status { get; set; } = IndicationStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? ConvertedFamilyId { get; set; }
    public DateTimeOffset? ConvertedAt { get; set; }
    public Guid? ConvertedByUserId { get; set; }

    public User IndicatedByUser { get; set; } = null!;
}

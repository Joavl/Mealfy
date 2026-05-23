using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities;

public class Family
{
    public Guid Id { get; set; }
    public string RepresentativeName { get; set; } = string.Empty;
    public string? FamilyName { get; set; }
    public string? ResponsibleCpf { get; set; }
    public string? ChildrenNamesJson { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Description { get; set; }
    public string? ShortAddress { get; set; }
    public string? MainNeed { get; set; }
    public int PriorityLevel { get; set; } = 3;
    public bool NeedsEntitySupport { get; set; }
    public string Region { get; set; } = string.Empty;
    public string? Neighborhood { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public int ChildrenCount { get; set; }
    public FamilyStatus Status { get; set; } = FamilyStatus.Pending;
    public SupportStatus SupportStatus { get; set; } = SupportStatus.NeedsHelp;
    public DateTime? LastFedAt { get; set; }
    public Guid? CreatedByEntityId { get; set; }
    public string SourceType { get; set; } = "entity";
    public string SourceLabel { get; set; } = string.Empty;
    public Guid? OriginalIndicationId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public float? IvcadScore { get; set; }
    public string? InternalRef { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AuthorizingEntity? CreatedByEntity { get; set; }
    public ICollection<FamilyValidation> Validations { get; set; } = new List<FamilyValidation>();
    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}

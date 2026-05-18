using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public AccountStatus Status { get; set; } = AccountStatus.Active;
    public Guid? EntityId { get; set; }
    public Guid? BeneficiaryId { get; set; }
    public string? Phone { get; set; }
    public string? DocumentType { get; set; }
    public string? DocumentNumber { get; set; }
    public string? Instagram { get; set; }
    public string? FirebaseUid { get; set; }
    public decimal TotalDonated { get; set; }
    public bool ShowOnRanking { get; set; } = true;
    public bool ShowInstagram { get; set; }
    public bool AnonymousMode { get; set; }
    public string? PreferredRegion { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public AuthorizingEntity? Entity { get; set; }
}

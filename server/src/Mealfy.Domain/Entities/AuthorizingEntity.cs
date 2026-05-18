using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities;

public class AuthorizingEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Cnpj { get; set; } = string.Empty;
    public EntityType Type { get; set; }
    public string ResponsibleName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string? AddressOrDistrict { get; set; }
    public string? WebsiteOrInstagram { get; set; }
    public string? ShortDescription { get; set; }
    public AccountStatus Status { get; set; } = AccountStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Family> Families { get; set; } = new List<Family>();
}

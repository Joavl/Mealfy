namespace Mealfy.Domain.Entities;

public class Donation
{
    public Guid Id { get; set; }
    public Guid DonorId { get; set; }
    public Guid FamilyId { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Donor { get; set; } = null!;
    public Family Family { get; set; } = null!;
}

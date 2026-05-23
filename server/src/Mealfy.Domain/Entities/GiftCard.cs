using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities;

public class GiftCard
{
    public Guid Id { get; set; }
    public Guid DonationId { get; set; }
    public Guid FamilyId { get; set; }
    public Guid DonorId { get; set; }
    public decimal Amount { get; set; }
    public string Provider { get; set; } = "ifood";
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public GiftCardStatus Status { get; set; } = GiftCardStatus.Sent;
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RedeemedAt { get; set; }

    public Donation Donation { get; set; } = null!;
    public Family Family { get; set; } = null!;
    public User Donor { get; set; } = null!;
}

using Mealfy.Application.Contracts.Users;
using Mealfy.Domain.Entities;
using Mealfy.Domain.Enums;

namespace Mealfy.Application.Mapping;

public static class UserMapper
{
    public static UserDto ToDto(User user) => new(
        user.Id.ToString(),
        user.Name,
        user.Email,
        RoleToApi(user.Role),
        StatusToApi(user.Status),
        user.EntityId?.ToString(),
        user.BeneficiaryId?.ToString(),
        user.Phone,
        user.DocumentType,
        user.DocumentNumber,
        user.TotalDonated,
        new PrivacySettingsDto(user.ShowOnRanking, user.ShowInstagram, user.AnonymousMode),
        string.IsNullOrEmpty(user.PreferredRegion)
            ? null
            : new ImpactPreferencesDto(user.PreferredRegion, null, null));

    public static string RoleToApi(UserRole role) => role switch
    {
        UserRole.Donor => "donor",
        UserRole.Entity => "entity",
        UserRole.Beneficiary => "beneficiary",
        UserRole.Admin => "admin",
        _ => "donor"
    };

    public static string StatusToApi(AccountStatus status) => status switch
    {
        AccountStatus.Pending => "pending",
        AccountStatus.Approved => "approved",
        AccountStatus.Rejected => "rejected",
        AccountStatus.Active => "active",
        _ => "active"
    };

    public static UserRole ParseRole(string role) => role.ToLowerInvariant() switch
    {
        "entity" => UserRole.Entity,
        "beneficiary" => UserRole.Beneficiary,
        "admin" => UserRole.Admin,
        _ => UserRole.Donor
    };

    public static EntityType ParseEntityType(string type) => type.ToLowerInvariant() switch
    {
        "igreja" => EntityType.Igreja,
        "escola" => EntityType.Escola,
        "instituto" => EntityType.Instituto,
        _ => EntityType.ONG
    };
}

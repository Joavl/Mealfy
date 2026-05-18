namespace Mealfy.Application.Contracts.Users;

public record UserDto(
    string Id,
    string Name,
    string Email,
    string Role,
    string? Status,
    string? EntityId,
    string? BeneficiaryId,
    string? Phone,
    string? DocumentType,
    string? DocumentNumber,
    decimal TotalDonated,
    PrivacySettingsDto? PrivacySettings,
    ImpactPreferencesDto? ImpactPreferences);

public record PrivacySettingsDto(bool ShowOnRanking, bool ShowInstagram, bool AnonymousMode);

public record ImpactPreferencesDto(string? PreferredRegion, string? PreferredCommunityId, double? PreferredRadiusKm);

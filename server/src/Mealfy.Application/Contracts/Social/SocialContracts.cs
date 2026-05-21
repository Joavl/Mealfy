namespace Mealfy.Application.Contracts.Social;

public record SocialRedirectDto(
    string Platform,
    string Url,
    string? UserId,
    string? UserName,
    string Source);

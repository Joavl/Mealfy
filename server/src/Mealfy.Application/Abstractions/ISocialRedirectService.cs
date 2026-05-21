using Mealfy.Application.Contracts.Social;

namespace Mealfy.Application.Abstractions;

public interface ISocialRedirectService
{
    string GetMealfyFacebookUrl();
    Task<SocialRedirectDto> ResolveDonorFacebookAsync(Guid userId, CancellationToken ct = default);
}

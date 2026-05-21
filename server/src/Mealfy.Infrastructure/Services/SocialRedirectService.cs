using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Social;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Mealfy.Infrastructure.Services;

public class SocialRedirectService : ISocialRedirectService
{
    private readonly MealfyDbContext _db;
    private readonly string _mealfyFacebookUrl;

    public SocialRedirectService(MealfyDbContext db, IConfiguration config)
    {
        _db = db;
        _mealfyFacebookUrl = config["Social:FacebookPageUrl"] ?? "https://www.facebook.com/mealfy";
    }

    public string GetMealfyFacebookUrl() => _mealfyFacebookUrl;

    public async Task<SocialRedirectDto> ResolveDonorFacebookAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException("Doador não encontrado");

        if (user.AnonymousMode)
        {
            return new SocialRedirectDto("facebook", _mealfyFacebookUrl, userId.ToString(), "Anônimo", "mealfy_default");
        }

        var donorUrl = ToFacebookProfileUrl(user.Facebook);
        if (donorUrl is not null)
        {
            return new SocialRedirectDto("facebook", donorUrl, userId.ToString(), user.Name, "donor_profile");
        }

        return new SocialRedirectDto("facebook", _mealfyFacebookUrl, userId.ToString(), user.Name, "mealfy_default");
    }

    private static string? ToFacebookProfileUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var raw = value.Trim();
        if (raw.Contains("facebook.com", StringComparison.OrdinalIgnoreCase))
            return raw.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? raw : $"https://{raw}";
        var handle = raw.TrimStart('@').Replace(" ", "");
        return string.IsNullOrEmpty(handle) ? null : $"https://www.facebook.com/{handle}";
    }
}

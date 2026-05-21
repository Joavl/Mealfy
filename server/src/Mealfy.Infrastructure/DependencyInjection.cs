using Mealfy.Application.Abstractions;
using Mealfy.Infrastructure.Firebase;
using Mealfy.Infrastructure.Persistence;
using Mealfy.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Mealfy.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=mealfy.db";
        var provider = configuration["Database:Provider"] ?? "Sqlite";

        services.AddDbContext<MealfyDbContext>(options =>
        {
            if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
                options.UseSqlServer(connectionString);
            else
                options.UseSqlite(connectionString);
        });

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IFamilyService, FamilyService>();
        services.AddScoped<ISocialRedirectService, SocialRedirectService>();
        services.AddSingleton<IFirebaseTokenVerifier, FirebaseTokenVerifier>();

        return services;
    }
}

using Mealfy.Domain.Entities;
using Mealfy.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(MealfyDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        var donorId = Guid.Parse("11111111-1111-1111-1111-111111111101");
        var entityUserId = Guid.Parse("11111111-1111-1111-1111-111111111102");
        var entityId = Guid.Parse("22222222-2222-2222-2222-222222222201");

        db.Entities.Add(new AuthorizingEntity
        {
            Id = entityId,
            Name = "Instituto Esperança",
            Cnpj = "12345678000199",
            Type = EntityType.ONG,
            ResponsibleName = "Maria Silva",
            Email = "entidade@mealfy.com",
            Phone = "81999990000",
            Region = "Recife",
            Status = AccountStatus.Approved,
        });

        db.Users.AddRange(
            new User
            {
                Id = donorId,
                Name = "Doador Demo",
                Email = "doador@mealfy.com",
                Role = UserRole.Donor,
                Status = AccountStatus.Active,
                TotalDonated = 150,
                Instagram = "@doadordemo",
                Facebook = "mealfy.doadores",
                ShowInstagram = true,
                ShowOnRanking = true,
            },
            new User
            {
                Id = entityUserId,
                Name = "Maria Silva",
                Email = "entidade@mealfy.com",
                Role = UserRole.Entity,
                Status = AccountStatus.Approved,
                EntityId = entityId,
            });

        var familyId = Guid.NewGuid();
        db.Families.Add(new Family
        {
            Id = familyId,
            RepresentativeName = "Ana Costa",
            Region = "Recife · PE",
            City = "Recife",
            State = "PE",
            ChildrenCount = 2,
            Status = FamilyStatus.Approved,
            SupportStatus = SupportStatus.NeedsHelp,
            CreatedByEntityId = entityId,
            SourceType = "entity",
            SourceLabel = "Instituto Esperança",
            Latitude = -8.05,
            Longitude = -34.88,
            IvcadScore = 0.82f,
        });

        foreach (ValidationSource source in Enum.GetValues<ValidationSource>())
        {
            db.FamilyValidations.Add(new FamilyValidation
            {
                Id = Guid.NewGuid(),
                FamilyId = familyId,
                Source = source,
                Verified = false,
            });
        }

        await db.SaveChangesAsync();
    }
}

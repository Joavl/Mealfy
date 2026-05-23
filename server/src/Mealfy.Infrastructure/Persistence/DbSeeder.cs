using Mealfy.Domain.Entities;
using Mealfy.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Persistence;

public static class DbSeeder
{
    public static readonly Guid DonorId = Guid.Parse("11111111-1111-1111-1111-111111111101");
    public static readonly Guid EntityUserId = Guid.Parse("11111111-1111-1111-1111-111111111102");
    public static readonly Guid BeneficiaryUserId = Guid.Parse("11111111-1111-1111-1111-111111111103");
    public static readonly Guid AdminUserId = Guid.Parse("11111111-1111-1111-1111-111111111104");
    public static readonly Guid EntityId = Guid.Parse("22222222-2222-2222-2222-222222222201");
    public static readonly Guid FamilyId = Guid.Parse("33333333-3333-3333-3333-333333333301");

    public static async Task SeedAsync(MealfyDbContext db)
    {
        if (await db.Users.AnyAsync())
        {
            await EnsureDemoUsersAsync(db);
            return;
        }

        db.Entities.Add(new AuthorizingEntity
        {
            Id = EntityId,
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
                Id = DonorId,
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
                Id = EntityUserId,
                Name = "Maria Silva",
                Email = "entidade@mealfy.com",
                Role = UserRole.Entity,
                Status = AccountStatus.Approved,
                EntityId = EntityId,
            },
            new User
            {
                Id = BeneficiaryUserId,
                Name = "Ana Costa",
                Email = "beneficiario@mealfy.com",
                Role = UserRole.Beneficiary,
                Status = AccountStatus.Active,
                BeneficiaryId = FamilyId,
                Phone = "81988887777",
                DocumentType = "cpf",
                DocumentNumber = "12345678900",
            },
            new User
            {
                Id = AdminUserId,
                Name = "Admin Mealfy",
                Email = "admin@mealfy.com",
                Role = UserRole.Admin,
                Status = AccountStatus.Active,
            });

        db.Families.Add(new Family
        {
            Id = FamilyId,
            RepresentativeName = "Ana Costa",
            Region = "Recife · PE",
            Neighborhood = "Boa Viagem",
            City = "Recife",
            State = "PE",
            ChildrenCount = 2,
            Status = FamilyStatus.Approved,
            SupportStatus = SupportStatus.NeedsHelp,
            CreatedByEntityId = EntityId,
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
                FamilyId = FamilyId,
                Source = source,
                Verified = false,
            });
        }

        await db.SaveChangesAsync();
    }

    /// <summary>Garante contas demo se o banco ja existia sem elas (ex.: admin).</summary>
    private static async Task EnsureDemoUsersAsync(MealfyDbContext db)
    {
        if (!await db.Users.AnyAsync(u => u.Email == "admin@mealfy.com"))
        {
            db.Users.Add(new User
            {
                Id = AdminUserId,
                Name = "Admin Mealfy",
                Email = "admin@mealfy.com",
                Role = UserRole.Admin,
                Status = AccountStatus.Active,
            });
        }

        if (!await db.Users.AnyAsync(u => u.Email == "doador@mealfy.com"))
        {
            db.Users.Add(new User
            {
                Id = DonorId,
                Name = "Doador Demo",
                Email = "doador@mealfy.com",
                Role = UserRole.Donor,
                Status = AccountStatus.Active,
                TotalDonated = 150,
                Instagram = "@doadordemo",
                Facebook = "mealfy.doadores",
                ShowInstagram = true,
                ShowOnRanking = true,
            });
        }

        if (!await db.Users.AnyAsync(u => u.Email == "entidade@mealfy.com"))
        {
            if (!await db.Entities.AnyAsync(e => e.Id == EntityId))
            {
                db.Entities.Add(new AuthorizingEntity
                {
                    Id = EntityId,
                    Name = "Instituto Esperança",
                    Cnpj = "12345678000199",
                    Type = EntityType.ONG,
                    ResponsibleName = "Maria Silva",
                    Email = "entidade@mealfy.com",
                    Phone = "81999990000",
                    Region = "Recife",
                    Status = AccountStatus.Approved,
                });
            }

            db.Users.Add(new User
            {
                Id = EntityUserId,
                Name = "Maria Silva",
                Email = "entidade@mealfy.com",
                Role = UserRole.Entity,
                Status = AccountStatus.Approved,
                EntityId = EntityId,
            });
        }

        await db.SaveChangesAsync();
    }
}

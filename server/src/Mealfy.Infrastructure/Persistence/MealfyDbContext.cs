using Mealfy.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Persistence;

public class MealfyDbContext : DbContext
{
    public MealfyDbContext(DbContextOptions<MealfyDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<AuthorizingEntity> Entities => Set<AuthorizingEntity>();
    public DbSet<Family> Families => Set<Family>();
    public DbSet<FamilyValidation> FamilyValidations => Set<FamilyValidation>();
    public DbSet<DonorIndication> Indications => Set<DonorIndication>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<GiftCard> GiftCards => Set<GiftCard>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.FirebaseUid);
            e.Property(x => x.TotalDonated).HasPrecision(18, 2);
        });

        modelBuilder.Entity<AuthorizingEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Cnpj);
            e.HasIndex(x => x.Email);
        });

        modelBuilder.Entity<Family>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasQueryFilter(x => !x.IsDeleted);
            e.HasOne(x => x.CreatedByEntity)
                .WithMany(x => x.Families)
                .HasForeignKey(x => x.CreatedByEntityId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<FamilyValidation>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.FamilyId, x.Source }).IsUnique();
            e.HasOne(x => x.Family)
                .WithMany(x => x.Validations)
                .HasForeignKey(x => x.FamilyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DonorIndication>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Status, x.CreatedAt }).HasDatabaseName("IX_Indications_Status_CreatedAt");
            
            // Unique nullable index on ConvertedFamilyId with partial filter for PostgreSQL
            var indexBuilder = e.HasIndex(x => x.ConvertedFamilyId).IsUnique();
            if (Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
            {
                indexBuilder.HasFilter("\"ConvertedFamilyId\" IS NOT NULL");
            }
            else
            {
                indexBuilder.HasFilter("ConvertedFamilyId IS NOT NULL");
            }

            e.HasOne(x => x.IndicatedByUser)
                .WithMany()
                .HasForeignKey(x => x.IndicatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne<Family>()
                .WithOne()
                .HasForeignKey<DonorIndication>(x => x.ConvertedFamilyId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Donation>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Donor).WithMany().HasForeignKey(x => x.DonorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Family).WithMany(x => x.Donations).HasForeignKey(x => x.FamilyId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.GiftCard).WithOne(x => x.Donation).HasForeignKey<GiftCard>(x => x.DonationId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GiftCard>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasIndex(x => x.FamilyId);
            e.HasIndex(x => x.DonorId);
            e.HasOne(x => x.Family).WithMany().HasForeignKey(x => x.FamilyId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Donor).WithMany().HasForeignKey(x => x.DonorId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Action).IsRequired().HasMaxLength(100);
            e.Property(x => x.EntityType).IsRequired().HasMaxLength(50);
            e.Property(x => x.IpAddress).HasMaxLength(45);

            if (Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
            {
                e.Property(x => x.PreviousValue).HasColumnType("jsonb");
                e.Property(x => x.NewValue).HasColumnType("jsonb");
            }

            e.HasIndex(x => new { x.UserId, x.CreatedAt }).HasDatabaseName("IX_AuditLogs_UserId_CreatedAt");
            e.HasIndex(x => new { x.EntityType, x.EntityId }).HasDatabaseName("IX_AuditLogs_EntityType_EntityId");
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

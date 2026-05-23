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
            e.HasOne(x => x.CreatedByEntity)
                .WithMany(x => x.Families)
                .HasForeignKey(x => x.CreatedByEntityId)
                .OnDelete(DeleteBehavior.SetNull);
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
            e.HasOne(x => x.IndicatedByUser)
                .WithMany()
                .HasForeignKey(x => x.IndicatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Donation>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Donor).WithMany().HasForeignKey(x => x.DonorId);
            e.HasOne(x => x.Family).WithMany(x => x.Donations).HasForeignKey(x => x.FamilyId);
            e.HasOne(x => x.GiftCard).WithOne(x => x.Donation).HasForeignKey<GiftCard>(x => x.DonationId);
        });

        modelBuilder.Entity<GiftCard>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasIndex(x => x.FamilyId);
            e.HasIndex(x => x.DonorId);
            e.HasOne(x => x.Family).WithMany().HasForeignKey(x => x.FamilyId);
            e.HasOne(x => x.Donor).WithMany().HasForeignKey(x => x.DonorId);
        });
    }
}

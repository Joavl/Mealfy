using Mealfy.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Mealfy.Infrastructure.Configuration
{
    public class VoucherConfiguration : IEntityTypeConfiguration<Voucher>
    {
        public void Configure(EntityTypeBuilder<Voucher> builder)
        {
            builder.HasKey(v => v.Id);
            builder.HasIndex(v => v.Codigo).IsUnique();
            builder.Property(v => v.Codigo).HasMaxLength(50).IsRequired();
            builder.Property(v => v.Valor).HasColumnType("decimal(18,2)");
            builder.Property(v => v.Status).HasConversion<string>();
        }
    }

}

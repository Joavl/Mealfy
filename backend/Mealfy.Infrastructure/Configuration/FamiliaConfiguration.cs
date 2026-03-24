using Mealfy.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Mealfy.Infrastructure.Configuration
{
    public class FamiliaConfiguration : IEntityTypeConfiguration<Familia>
    {
        public void Configure(EntityTypeBuilder<Familia> builder)
        {
            builder.HasKey(f => f.Id);
            builder.Property(f => f.NomeResponsavel).HasMaxLength(200).IsRequired();
            builder.Property(f => f.RendaMensal).HasColumnType("decimal(18,2)");
            builder.Property(f => f.Status).HasConversion<string>();
            builder.Property(f => f.Origem).HasConversion<string>();

            builder.OwnsOne(f => f.Documento, d =>
            {
                d.Property(x => x.Numero).HasColumnName("Documento").HasMaxLength(14);
                d.Property(x => x.Tipo).HasColumnName("TipoDocumento").HasConversion<string>();
            });

            builder.OwnsOne(f => f.Email, e =>
                e.Property(x => x.Endereco).HasColumnName("Email").HasMaxLength(250));

            builder.OwnsOne(f => f.Telefone, t =>
            {
                t.Property(x => x.DDD).HasColumnName("TelefoneDDD").HasMaxLength(2);
                t.Property(x => x.Numero).HasColumnName("TelefoneNumero").HasMaxLength(9);
            });

            builder.OwnsOne(f => f.Endereco, e =>
            {
                e.Property(x => x.Logradouro).HasColumnName("Logradouro").HasMaxLength(300);
                e.Property(x => x.Numero).HasColumnName("EnderecoNumero").HasMaxLength(10);
                e.Property(x => x.Complemento).HasColumnName("Complemento").HasMaxLength(100);
                e.Property(x => x.Bairro).HasColumnName("Bairro").HasMaxLength(100);
                e.Property(x => x.Cidade).HasColumnName("Cidade").HasMaxLength(100);
                e.Property(x => x.UF).HasColumnName("UF").HasMaxLength(2);
                e.Property(x => x.CEP).HasColumnName("CEP").HasMaxLength(8);
            });

            builder.HasMany(f => f.Criancas)
                .WithOne(c => c.Familia)
                .HasForeignKey(c => c.FamiliaId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

}

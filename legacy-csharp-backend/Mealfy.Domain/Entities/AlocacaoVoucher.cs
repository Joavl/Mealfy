namespace Mealfy.Domain.Entities
{
    public class AlocacaoVoucher : BaseEntity
    {
        public Guid VoucherId { get; private set; }
        public Guid CriancaId { get; private set; }
        public DateTime DataAlocacao { get; private set; }
        public DateTime? DataUtilizacao { get; private set; }

        public Voucher? Voucher { get; private set; }
        public Crianca? Crianca { get; private set; }

        private AlocacaoVoucher() { }

        public static AlocacaoVoucher Criar(Guid voucherId, Guid criancaId)
        {
            return new AlocacaoVoucher
            {
                VoucherId = voucherId,
                CriancaId = criancaId,
                DataAlocacao = DateTime.UtcNow
            };
        }

        public void RegistrarUtilizacao()
        {
            if (DataUtilizacao.HasValue)
                throw new ArgumentException("Voucher já foi utilizado nesta alocação.");
            DataUtilizacao = DateTime.UtcNow;
            MarcarAtualizado();
        }
    }

}

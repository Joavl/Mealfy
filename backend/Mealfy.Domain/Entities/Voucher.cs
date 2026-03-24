using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities
{
    public class Voucher : BaseEntity
    {
        public string Codigo { get; private set; }
        public decimal Valor { get; private set; }
        public Guid FornecedorId { get; private set; }
        public Guid DoacaoLoteId { get; private set; }
        public VoucherStatus Status { get; private set; }
        public DateTime DataValidade { get; private set; }
        public Guid? CriadoPorDoadorId { get; private set; }

        public Fornecedor? Fornecedor { get; private set; }

        private Voucher() { }

        public static Voucher Criar(string codigo, decimal valor, Guid fornecedorId,
            Guid doacaoLoteId, DateTime dataValidade, Guid doadorId)
        {
            if (string.IsNullOrWhiteSpace(codigo))
                throw new ArgumentException("Código do voucher é obrigatório.");
            if (valor <= 0)
                throw new ArgumentException("Valor do voucher deve ser positivo.");
            if (dataValidade <= DateTime.UtcNow)
                throw new ArgumentException("Data de validade deve ser futura.");
            return new Voucher
            {
                Codigo = codigo.ToUpper().Trim(),
                Valor = valor,
                FornecedorId = fornecedorId,
                DoacaoLoteId = doacaoLoteId,
                Status = VoucherStatus.Disponivel,
                DataValidade = dataValidade,
                CriadoPorDoadorId = doadorId
            };
        }

        public void Alocar()
        {
            if (Status != VoucherStatus.Disponivel)
                throw new ArgumentException($"Voucher não pode ser alocado. Status atual: {Status}.");
            if (DateTime.UtcNow > DataValidade)
                throw new ArgumentException("Voucher expirado.");
            Status = VoucherStatus.Alocado;
            MarcarAtualizado();
        }

        public void Utilizar()
        {
            if (Status != VoucherStatus.Alocado)
                throw new ArgumentException("Apenas vouchers alocados podem ser utilizados.");
            Status = VoucherStatus.Utilizado;
            MarcarAtualizado();
        }

        public void Expirar()
        {
            if (Status == VoucherStatus.Utilizado)
                throw new ArgumentException("Voucher já utilizado não pode ser expirado.");
            Status = VoucherStatus.Expirado;
            MarcarAtualizado();
        }

        public bool EstaDisponivel() =>
            Status == VoucherStatus.Disponivel && DateTime.UtcNow <= DataValidade;
    }

}

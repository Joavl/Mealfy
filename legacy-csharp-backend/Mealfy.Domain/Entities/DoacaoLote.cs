using Mealfy.Domain.Enums;

namespace Mealfy.Domain.Entities
{
    public class DoacaoLote : BaseEntity
    {
        public Guid DoadorId { get; private set; }
        public Guid FornecedorId { get; private set; }
        public decimal ValorUnitario { get; private set; }
        public int QuantidadeVouchers { get; private set; }
        public decimal ValorTotal => ValorUnitario * QuantidadeVouchers;
        public StatusLote Status { get; private set; }
        public string? ObservacaoDoador { get; private set; }
        public DateTime? DataConfirmacao { get; private set; }
        public DateTime? DataDistribuicao { get; private set; }

        private readonly List<Voucher> _vouchers = new();
        public IReadOnlyCollection<Voucher> Vouchers => _vouchers.AsReadOnly();

        private DoacaoLote() { }

        public static DoacaoLote Criar(Guid doadorId, Guid fornecedorId,
            decimal valorUnitario, int quantidade, string? obs = null)
        {
            if (valorUnitario <= 0)
                throw new ArgumentException("Valor unitário do voucher deve ser positivo.");
            if (quantidade <= 0)
                throw new ArgumentException("Quantidade de vouchers deve ser positiva.");
            return new DoacaoLote
            {
                DoadorId = doadorId,
                FornecedorId = fornecedorId,
                ValorUnitario = valorUnitario,
                QuantidadeVouchers = quantidade,
                Status = StatusLote.AguardandoConfirmacao,
                ObservacaoDoador = obs
            };
        }

        public void Confirmar()
        {
            if (Status != StatusLote.AguardandoConfirmacao)
                throw new ArgumentException("Lote não está aguardando confirmação.");
            Status = StatusLote.Confirmado;
            DataConfirmacao = DateTime.UtcNow;
            MarcarAtualizado();
        }

        public void MarcarDistribuido()
        {
            if (Status != StatusLote.Confirmado)
                throw new ArgumentException("Lote precisa estar confirmado para ser distribuído.");
            Status = StatusLote.Distribuido;
            DataDistribuicao = DateTime.UtcNow;
            MarcarAtualizado();
        }

        public void Cancelar()
        {
            if (Status == StatusLote.Distribuido)
                throw new ArgumentException("Lote já distribuído não pode ser cancelado.");
            Status = StatusLote.Cancelado;
            MarcarAtualizado();
        }

        public bool PodeDistribuir() => Status == StatusLote.Confirmado;
    }

}

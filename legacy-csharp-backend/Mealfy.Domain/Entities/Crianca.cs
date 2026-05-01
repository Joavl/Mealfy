using Mealfy.Domain.Enums;
using Mealfy.Domain.ValueObjects;

namespace Mealfy.Domain.Entities
{
    // Mealfy.Domain/Entities/Crianca.cs
    public class Crianca : BaseEntity
    {
        public Guid FamiliaId { get; private set; }
        public string Nome { get; private set; }
        public DateTime DataNascimento { get; private set; }
        public Documento CPF { get; private set; }
        public bool PossuiDeficiencia { get; private set; }
        public StatusAprovacao Status { get; private set; }
        public string? ObservacaoDeficiencia { get; private set; }

        public Familia? Familia { get; private set; }

        private readonly List<AlocacaoVoucher> _alocacoes = new();
        public IReadOnlyCollection<AlocacaoVoucher> Alocacoes => _alocacoes.AsReadOnly();

        private Crianca() { }

        public static Crianca Criar(Guid familiaId, string nome,
            DateTime dataNascimento, Documento cpf,
            bool possuiDeficiencia, string? obsDeficiencia = null)
        {
            if (string.IsNullOrWhiteSpace(nome))
                throw new ArgumentException("Nome da criança é obrigatório.");
            if (dataNascimento > DateTime.UtcNow)
                throw new ArgumentException("Data de nascimento inválida.");
            if (cpf.Tipo != TipoDocumento.CPF)
                throw new ArgumentException("Documento da criança deve ser CPF.");

            return new Crianca
            {
                FamiliaId = familiaId,
                Nome = nome,
                DataNascimento = dataNascimento,
                CPF = cpf,
                PossuiDeficiencia = possuiDeficiencia,
                ObservacaoDeficiencia = possuiDeficiencia ? obsDeficiencia : null,
                Status = StatusAprovacao.Pendente
            };
        }

        public int IdadeAnos() =>
            DateTime.UtcNow.Year - DataNascimento.Year -
            (DateTime.UtcNow.DayOfYear < DataNascimento.DayOfYear ? 1 : 0);

        public void Aprovar()
        {
            if (Status == StatusAprovacao.Aprovada)
                throw new ArgumentException("Criança já está aprovada.");
            Status = StatusAprovacao.Aprovada;
            MarcarAtualizado();
        }

        public void Rejeitar()
        {
            Status = StatusAprovacao.Rejeitada;
            MarcarAtualizado();
        }
    }

}

using Mealfy.Domain.Enums;
using Mealfy.Domain.ValueObjects;

namespace Mealfy.Domain.Entities
{
    // Mealfy.Domain/Entities/Familia.cs
    public class Familia : BaseEntity
    {
        public string NomeResponsavel { get; private set; }
        public Documento Documento { get; private set; }
        public Email Email { get; private set; }
        public Telefone Telefone { get; private set; }
        public decimal RendaMensal { get; private set; }
        public Endereco Endereco { get; private set; }
        public StatusAprovacao Status { get; private set; }
        public OrigemCadastro Origem { get; private set; }
        public string? MotivoRejeicao { get; private set; }
        public Guid? OngResponsavelId { get; private set; }

        private readonly List<Crianca> _criancas = new();
        public IReadOnlyCollection<Crianca> Criancas => _criancas.AsReadOnly();

        private Familia() { }

        public static Familia Criar(string nomeResponsavel, Documento documento,
            Email email, Telefone telefone, decimal rendaMensal,
            Endereco endereco, OrigemCadastro origem, Guid? ongId = null)
        {
            if (rendaMensal < 0) throw new ArgumentException("Renda mensal não pode ser negativa.");
            return new Familia
            {
                NomeResponsavel = nomeResponsavel,
                Documento = documento,
                Email = email,
                Telefone = telefone,
                RendaMensal = rendaMensal,
                Endereco = endereco,
                Status = StatusAprovacao.Pendente,
                Origem = origem,
                OngResponsavelId = ongId
            };
        }

        public void Aprovar()
        {
            if (Status == StatusAprovacao.Aprovada)
                throw new ArgumentException("Família já está aprovada.");
            Status = StatusAprovacao.Aprovada;
            MotivoRejeicao = null;
            MarcarAtualizado();
        }

        public void Rejeitar(string motivo)
        {
            if (string.IsNullOrWhiteSpace(motivo))
                throw new ArgumentException("Motivo de rejeição é obrigatório.");
            Status = StatusAprovacao.Rejeitada;
            MotivoRejeicao = motivo;
            MarcarAtualizado();
        }

        public void AtualizarRenda(decimal novaRenda)
        {
            if (novaRenda < 0) throw new ArgumentException("Renda inválida.");
            RendaMensal = novaRenda;
            MarcarAtualizado();
        }

        public bool EstaAprovada() => Status == StatusAprovacao.Aprovada;
    }

}

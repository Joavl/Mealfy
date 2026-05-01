using Mealfy.Domain.Enums;
using Mealfy.Domain.ValueObjects;

namespace Mealfy.Domain.Entities
{
    public class Ong : BaseEntity
    {
        public string Nome { get; private set; }
        public Documento CNPJ { get; private set; }
        public string NomeResponsavel { get; private set; }
        public Email Email { get; private set; }
        public Telefone Telefone { get; private set; }
        public Endereco Endereco { get; private set; }
        public bool Ativa { get; private set; }

        private readonly List<Familia> _familias = new();
        public IReadOnlyCollection<Familia> Familias => _familias.AsReadOnly();

        private Ong() { }

        public static Ong Criar(string nome, Documento cnpj, string nomeResponsavel,
            Email email, Telefone telefone, Endereco endereco)
        {
            if (string.IsNullOrWhiteSpace(nome)) throw new ArgumentException("Nome da ONG é obrigatório.");
            if (cnpj.Tipo != TipoDocumento.CNPJ) throw new ArgumentException("Documento deve ser CNPJ.");
            return new Ong
            {
                Nome = nome,
                CNPJ = cnpj,
                NomeResponsavel = nomeResponsavel,
                Email = email,
                Telefone = telefone,
                Endereco = endereco,
                Ativa = true
            };
        }

        public void Desativar() { Ativa = false; MarcarAtualizado(); }
        public void Ativar() { Ativa = true; MarcarAtualizado(); }
    }

}

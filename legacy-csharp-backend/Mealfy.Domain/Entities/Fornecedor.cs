using Mealfy.Domain.Enums;
using Mealfy.Domain.ValueObjects;

namespace Mealfy.Domain.Entities
{
    public class Fornecedor : BaseEntity
    {
        public string Nome { get; private set; }
        public Documento CNPJ { get; private set; }
        public TipoFornecedor Tipo { get; private set; }
        public Email Email { get; private set; }
        public Telefone Telefone { get; private set; }
        public string? IntegracaoApiUrl { get; private set; }
        public bool Ativo { get; private set; }

        private Fornecedor() { }

        public static Fornecedor Criar(string nome, Documento cnpj,
            TipoFornecedor tipo, Email email, Telefone telefone,
            string? integracaoApiUrl = null)
        {
            if (cnpj.Tipo != TipoDocumento.CNPJ)
                throw new ArgumentException("Documento do fornecedor deve ser CNPJ.");
            return new Fornecedor
            {
                Nome = nome,
                CNPJ = cnpj,
                Tipo = tipo,
                Email = email,
                Telefone = telefone,
                IntegracaoApiUrl = integracaoApiUrl,
                Ativo = true
            };
        }

        public void Desativar() { Ativo = false; MarcarAtualizado(); }
        public void AtualizarApiUrl(string url) { IntegracaoApiUrl = url; MarcarAtualizado(); }
    }

}

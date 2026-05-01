namespace Mealfy.Domain.ValueObjects
{
    public record Endereco
    {
        public string Logradouro { get; init; }
        public string Numero { get; init; }
        public string Complemento { get; init; }
        public string Bairro { get; init; }
        public string Cidade { get; init; }
        public string UF { get; init; }
        public string CEP { get; init; }

        private Endereco() { }

        public Endereco(string logradouro, string numero, string complemento,
            string bairro, string cidade, string uf, string cep)
        {
            if (string.IsNullOrWhiteSpace(logradouro)) throw new ArgumentException("Logradouro obrigatório.");
            if (string.IsNullOrWhiteSpace(cep)) throw new ArgumentException("CEP obrigatório.");
            if (uf?.Length != 2) throw new ArgumentException("UF deve ter 2 caracteres.");
            Logradouro = logradouro;
            Numero = numero;
            Complemento = complemento;
            Bairro = bairro;
            Cidade = cidade;
            UF = uf.ToUpper();
            CEP = cep.Replace("-", "");
        }
    }

}

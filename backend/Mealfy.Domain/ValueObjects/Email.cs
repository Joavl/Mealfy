namespace Mealfy.Domain.ValueObjects
{
    public record Email
    {
        public string Endereco { get; init; }

        private Email() { }

        public Email(string endereco)
        {
            if (string.IsNullOrWhiteSpace(endereco) || !endereco.Contains('@'))
                throw new ArgumentException("E-mail inválido.");
            Endereco = endereco.Trim().ToLower();
        }

        public override string ToString() => Endereco;
    }

}

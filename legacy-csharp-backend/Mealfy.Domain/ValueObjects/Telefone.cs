namespace Mealfy.Domain.ValueObjects
{
    public record Telefone
    {
        public string Numero { get; init; }
        public string DDD { get; init; }

        private Telefone() { }

        public Telefone(string ddd, string numero)
        {
            if (ddd?.Length != 2) throw new ArgumentException("DDD inválido.");
            if (numero?.Length < 8) throw new ArgumentException("Telefone inválido.");
            DDD = ddd;
            Numero = new string(numero.Where(char.IsDigit).ToArray());
        }

        public string Completo => $"({DDD}) {Numero}";
    }

}

using Mealfy.Domain.Enums;

namespace Mealfy.Domain.ValueObjects
{
    public record Documento
    {
        public string Numero { get; init; }
        public TipoDocumento Tipo { get; init; }

        private Documento() { }

        public Documento(string numero, TipoDocumento tipo)
        {
            var numeros = new string(numero.Where(char.IsDigit).ToArray());
            if (tipo == TipoDocumento.CPF && numeros.Length != 11)
                throw new ArgumentException("CPF inválido.");
            if (tipo == TipoDocumento.CNPJ && numeros.Length != 14)
                throw new ArgumentException("CNPJ inválido.");
            Numero = numeros;
            Tipo = tipo;
        }

        public string Formatado => Tipo == TipoDocumento.CPF
            ? $"{Numero[..3]}.{Numero[3..6]}.{Numero[6..9]}-{Numero[9..]}"
            : $"{Numero[..2]}.{Numero[2..5]}.{Numero[5..8]}/{Numero[8..12]}-{Numero[12..]}";
    }

}

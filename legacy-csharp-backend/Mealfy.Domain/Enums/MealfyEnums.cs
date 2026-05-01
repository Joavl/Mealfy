namespace Mealfy.Domain.Enums
{
    public enum StatusAprovacao { Pendente, Aprovada, Rejeitada }
    public enum VoucherStatus { Criado, Disponivel, Alocado, Utilizado, Expirado }
    public enum StatusLote { AguardandoConfirmacao, Confirmado, Distribuido, Cancelado }
    public enum TipoDocumento { CPF, CNPJ }
    public enum TipoFornecedor { Mercado, Delivery, CartaoAlimentacao }
    public enum OrigemCadastro { Governo, ONG, Manual }
    public enum TipoDoador { PessoaFisica, PessoaJuridica }

}

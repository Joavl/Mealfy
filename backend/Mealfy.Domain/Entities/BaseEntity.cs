namespace Mealfy.Domain.Entities
{
    public abstract class BaseEntity
    {
        public Guid Id { get; protected set; } = Guid.NewGuid();
        public DateTime CriadoEm { get; protected set; } = DateTime.UtcNow;
        public DateTime? AtualizadoEm { get; protected set; }

        protected void MarcarAtualizado() => AtualizadoEm = DateTime.UtcNow;
    }

}

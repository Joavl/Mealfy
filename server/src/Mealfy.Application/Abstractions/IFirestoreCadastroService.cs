namespace Mealfy.Application.Abstractions;

public interface IFirestoreCadastroService
{
    Task SaveUserAsync(string documentId, object data, CancellationToken ct = default);
    Task SaveEntityAsync(string entityId, object data, CancellationToken ct = default);
    Task SaveFamilyAsync(string familyId, object data, CancellationToken ct = default);
    Task SaveIndicationAsync(string indicationId, object data, CancellationToken ct = default);
}

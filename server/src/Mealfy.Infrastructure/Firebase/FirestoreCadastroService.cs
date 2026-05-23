using Google.Cloud.Firestore;
using Mealfy.Application.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mealfy.Infrastructure.Firebase;

public class FirestoreCadastroService : IFirestoreCadastroService
{
    private readonly FirestoreDb? _db;
    private readonly ILogger<FirestoreCadastroService> _logger;

    public FirestoreCadastroService(IConfiguration configuration, ILogger<FirestoreCadastroService> logger)
    {
        _logger = logger;
        var projectId = configuration["Firebase:ProjectId"];
        if (string.IsNullOrWhiteSpace(projectId))
        {
            _logger.LogWarning("Firebase:ProjectId ausente — cadastros não serão replicados no Firestore pelo servidor.");
            return;
        }

        try
        {
            _db = FirestoreDb.Create(projectId);
            _logger.LogInformation("Firestore Admin ativo para projeto {ProjectId}.", projectId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Firestore Admin indisponível. Use firebase-service-account.json na API.");
        }
    }

    public Task SaveUserAsync(string documentId, object data, CancellationToken ct = default) =>
        SetAsync("users", documentId, data, ct);

    public Task SaveEntityAsync(string entityId, object data, CancellationToken ct = default) =>
        SetAsync("entities", entityId, data, ct);

    public Task SaveFamilyAsync(string familyId, object data, CancellationToken ct = default) =>
        SetAsync("families", familyId, data, ct);

    public Task SaveIndicationAsync(string indicationId, object data, CancellationToken ct = default) =>
        SetAsync("indications", indicationId, data, ct);

    private async Task SetAsync(string collection, string id, object data, CancellationToken ct)
    {
        if (_db is null) return;
        try
        {
            var dict = ToDictionary(data);
            dict["updatedAt"] = Timestamp.GetCurrentTimestamp();
            if (!dict.ContainsKey("createdAt"))
                dict["createdAt"] = Timestamp.GetCurrentTimestamp();

            await _db.Collection(collection).Document(id).SetAsync(dict, SetOptions.MergeAll, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao gravar {Collection}/{Id} no Firestore.", collection, id);
        }
    }

    private static Dictionary<string, object> ToDictionary(object data)
    {
        if (data is Dictionary<string, object> d) return new Dictionary<string, object>(d);
        var json = System.Text.Json.JsonSerializer.Serialize(data);
        return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json)
               ?? new Dictionary<string, object>();
    }
}

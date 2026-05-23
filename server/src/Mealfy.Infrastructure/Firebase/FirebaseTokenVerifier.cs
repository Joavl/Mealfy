using System.Net.Http.Json;
using System.Text.Json.Serialization;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Mealfy.Application.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mealfy.Infrastructure.Firebase;

public class FirebaseTokenVerifier : IFirebaseTokenVerifier
{
    private readonly ILogger<FirebaseTokenVerifier> _logger;
    private readonly string? _webApiKey;
    private readonly bool _useAdminSdk;

    public bool IsConfigured { get; private set; }

    public FirebaseTokenVerifier(IConfiguration configuration, ILogger<FirebaseTokenVerifier> logger)
    {
        _logger = logger;
        var credentialsPath = configuration["Firebase:CredentialsPath"];
        var projectId = configuration["Firebase:ProjectId"];
        _webApiKey = configuration["Firebase:WebApiKey"];

        var credsFile = ResolveCredentialsPath(credentialsPath);
        if (!string.IsNullOrWhiteSpace(credsFile) && File.Exists(credsFile))
        {
            if (FirebaseApp.DefaultInstance is null)
            {
                FirebaseApp.Create(new AppOptions
                {
                    Credential = GoogleCredential.FromFile(credsFile),
                    ProjectId = projectId,
                });
            }
            _useAdminSdk = true;
            IsConfigured = true;
            _logger.LogInformation("Firebase Admin SDK ativo ({Path}).", credsFile);
            return;
        }

        if (!string.IsNullOrWhiteSpace(_webApiKey))
        {
            IsConfigured = true;
            _useAdminSdk = false;
            _logger.LogInformation(
                "Firebase via REST (WebApiKey). Para produção, use firebase-service-account.json.");
            return;
        }

        _logger.LogWarning(
            "Firebase: defina CredentialsPath ou WebApiKey em appsettings.");
    }

    public async Task<FirebaseUserClaims> VerifyAsync(string idToken, CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException(
                "Firebase não configurado. Defina Firebase:WebApiKey ou firebase-service-account.json.");

        if (_useAdminSdk)
            return await VerifyWithAdminSdkAsync(idToken, ct);

        return await VerifyWithRestAsync(idToken, ct);
    }

    private async Task<FirebaseUserClaims> VerifyWithAdminSdkAsync(string idToken, CancellationToken ct)
    {
        var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken, ct);
        var email = decoded.Claims.TryGetValue("email", out var e) ? e?.ToString() : null;
        var name = decoded.Claims.TryGetValue("name", out var n) ? n?.ToString() : null;

        if (string.IsNullOrEmpty(email))
            throw new InvalidOperationException("Token Firebase sem e-mail.");

        return new FirebaseUserClaims(decoded.Uid, email, name);
    }

    private async Task<FirebaseUserClaims> VerifyWithRestAsync(string idToken, CancellationToken ct)
    {
        using var http = new HttpClient();
        var url = $"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={_webApiKey}";
        var response = await http.PostAsJsonAsync(url, new { idToken }, ct);
        var body = await response.Content.ReadFromJsonAsync<LookupResponse>(cancellationToken: ct);

        if (!response.IsSuccessStatusCode || body?.Users is null || body.Users.Count == 0)
            throw new InvalidOperationException("Token Firebase inválido ou expirado.");

        var user = body.Users[0];
        if (string.IsNullOrEmpty(user.LocalId) || string.IsNullOrEmpty(user.Email))
            throw new InvalidOperationException("Token Firebase sem dados de usuário.");

        return new FirebaseUserClaims(user.LocalId, user.Email, user.DisplayName);
    }

    private static string? ResolveCredentialsPath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;
        if (Path.IsPathRooted(path)) return path;

        var baseDir = AppContext.BaseDirectory;
        var candidates = new[]
        {
            Path.Combine(baseDir, path),
            Path.Combine(baseDir, "..", path),
            Path.Combine(Directory.GetCurrentDirectory(), path),
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    private sealed class LookupResponse
    {
        [JsonPropertyName("users")]
        public List<LookupUser>? Users { get; set; }
    }

    private sealed class LookupUser
    {
        [JsonPropertyName("localId")]
        public string? LocalId { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }
    }
}

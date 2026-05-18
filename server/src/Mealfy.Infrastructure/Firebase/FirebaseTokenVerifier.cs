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
    public bool IsConfigured { get; private set; }

    public FirebaseTokenVerifier(IConfiguration configuration, ILogger<FirebaseTokenVerifier> logger)
    {
        _logger = logger;
        var credentialsPath = configuration["Firebase:CredentialsPath"];
        var projectId = configuration["Firebase:ProjectId"];

        if (string.IsNullOrWhiteSpace(credentialsPath) || !File.Exists(credentialsPath))
        {
            _logger.LogWarning("Firebase não configurado. Coloque Firebase:CredentialsPath no appsettings após criar o projeto.");
            return;
        }

        if (FirebaseApp.DefaultInstance is null)
        {
            FirebaseApp.Create(new AppOptions
            {
                Credential = GoogleCredential.FromFile(credentialsPath),
                ProjectId = projectId,
            });
        }

        IsConfigured = true;
    }

    public async Task<FirebaseUserClaims> VerifyAsync(string idToken, CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException(
                "Firebase não configurado. Baixe o JSON de service account e defina Firebase:CredentialsPath.");

        var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken, ct);
        var email = decoded.Claims.TryGetValue("email", out var e) ? e?.ToString() : null;
        var name = decoded.Claims.TryGetValue("name", out var n) ? n?.ToString() : null;

        if (string.IsNullOrEmpty(email))
            throw new InvalidOperationException("Token Firebase sem e-mail.");

        return new FirebaseUserClaims(decoded.Uid, email, name);
    }
}

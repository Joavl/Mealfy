namespace Mealfy.Application.Abstractions;

public interface IFirebaseTokenVerifier
{
    bool IsConfigured { get; }
    Task<FirebaseUserClaims> VerifyAsync(string idToken, CancellationToken ct = default);
}

public record FirebaseUserClaims(string Uid, string Email, string? Name);

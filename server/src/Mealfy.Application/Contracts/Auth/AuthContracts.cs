using Mealfy.Application.Contracts.Users;

namespace Mealfy.Application.Contracts.Auth;

public record RegisterDonorRequest(
    string Name,
    string Email,
    string DocumentType,
    string DocumentNumber,
    string? Phone,
    string? Instagram,
    bool ShowOnRanking = true,
    bool ShowInstagram = false,
    bool AnonymousMode = false);

public record RegisterEntityRequest(
    string Name,
    string Email,
    string Cnpj,
    string Region,
    string Type,
    string ResponsibleName,
    string Phone);

public record LoginResponse(string Token, UserDto User);

public record FirebaseLoginRequest(string IdToken);

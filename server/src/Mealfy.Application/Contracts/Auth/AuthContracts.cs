using Mealfy.Application.Contracts.Families;
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
    bool AnonymousMode = false,
    string? IdToken = null);

public record RegisterEntityRequest(
    string Name,
    string Email,
    string Cnpj,
    string Region,
    string Type,
    string ResponsibleName,
    string Phone,
    string? IdToken = null);

public record LoginResponse(string Token, UserDto User);

public record FirebaseLoginRequest(string IdToken);

public record RegisterBeneficiaryRequest(
    string FamilyName,
    string ResponsibleName,
    string ResponsibleCpf,
    int ChildrenCount,
    string[] ChildrenNames,
    string PhotoUrl,
    string Region,
    string? Neighborhood = null,
    string? ShortAddress = null);

public record RegisterBeneficiaryResponse(string Token, UserDto User, FamilyDto Family);

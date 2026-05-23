using Mealfy.Application.Contracts.Auth;
using Mealfy.Application.Contracts.Users;

namespace Mealfy.Application.Abstractions;

public interface IAuthService
{
    Task<UserDto> RegisterDonorAsync(RegisterDonorRequest request, CancellationToken ct = default);
    Task<UserDto> RegisterEntityAsync(RegisterEntityRequest request, CancellationToken ct = default);
    Task<RegisterBeneficiaryResponse> RegisterBeneficiaryAsync(RegisterBeneficiaryRequest request, CancellationToken ct = default);
    Task<LoginResponse> LoginMockAsync(string email, string password, CancellationToken ct = default);
    Task<LoginResponse> LoginWithFirebaseAsync(string idToken, CancellationToken ct = default);
    Task<UserDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
}

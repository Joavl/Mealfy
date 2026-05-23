using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register/donor")]
    public async Task<IActionResult> RegisterDonor([FromBody] RegisterDonorRequest request, CancellationToken ct)
    {
        var user = await _auth.RegisterDonorAsync(request, ct);
        return StatusCode(201, user);
    }

    [HttpPost("register/entity")]
    public async Task<IActionResult> RegisterEntity([FromBody] RegisterEntityRequest request, CancellationToken ct)
    {
        var user = await _auth.RegisterEntityAsync(request, ct);
        return StatusCode(201, user);
    }

    [HttpPost("register/beneficiary")]
    public async Task<IActionResult> RegisterBeneficiary([FromBody] RegisterBeneficiaryRequest request, CancellationToken ct)
    {
        var result = await _auth.RegisterBeneficiaryAsync(request, ct);
        return StatusCode(201, new { token = result.Token, user = result.User, family = result.Family });
    }

    [HttpPost("login/mock")]
    public async Task<IActionResult> LoginMock([FromBody] LoginMockRequest request, CancellationToken ct)
    {
        var result = await _auth.LoginMockAsync(request.Email, request.Password, ct);
        return Ok(new { token = result.Token, user = result.User });
    }

    [HttpPost("login/firebase")]
    public async Task<IActionResult> LoginFirebase([FromBody] FirebaseLoginRequest request, CancellationToken ct)
    {
        var result = await _auth.LoginWithFirebaseAsync(request.IdToken, ct);
        return Ok(new { token = result.Token, user = result.User });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!Guid.TryParse(HttpContext.Items["UserId"]?.ToString(), out var userId))
            return Unauthorized();

        var user = await _auth.GetByIdAsync(userId, ct);
        return user is null ? NotFound() : Ok(user);
    }
}

public record LoginMockRequest(string Email, string Password);

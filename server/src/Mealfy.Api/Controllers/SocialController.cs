using Mealfy.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.Api.Controllers;

[ApiController]
[Route("social")]
public class SocialController : ControllerBase
{
    private readonly ISocialRedirectService _social;

    public SocialController(ISocialRedirectService social) => _social = social;

    [HttpGet("facebook")]
    public IActionResult RedirectMealfyFacebook()
    {
        return Redirect(_social.GetMealfyFacebookUrl());
    }

    [HttpGet("facebook/donor/{userId:guid}")]
    public async Task<IActionResult> RedirectDonorFacebook(Guid userId, CancellationToken ct)
    {
        var result = await _social.ResolveDonorFacebookAsync(userId, ct);
        return Redirect(result.Url);
    }

    [HttpGet("resolve/facebook")]
    public IActionResult ResolveMealfyFacebook()
    {
        return Ok(new
        {
            platform = "facebook",
            url = _social.GetMealfyFacebookUrl(),
            source = "mealfy_default"
        });
    }

    [HttpGet("resolve/facebook/{userId:guid}")]
    public async Task<IActionResult> ResolveDonorFacebook(Guid userId, CancellationToken ct)
    {
        var result = await _social.ResolveDonorFacebookAsync(userId, ct);
        return Ok(result);
    }
}

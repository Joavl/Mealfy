using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Families;
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.Api.Controllers;

[ApiController]
[Route("families")]
public class FamiliesController : ControllerBase
{
    private readonly IFamilyService _families;

    public FamiliesController(IFamilyService families) => _families = families;

    [HttpGet("public")]
    public async Task<IActionResult> GetPublic([FromQuery] string? region, CancellationToken ct)
    {
        var list = await _families.GetPublicAsync(region, ct);
        return Ok(list);
    }

    [HttpGet("awaiting-entity")]
    public async Task<IActionResult> GetAwaitingEntity([FromQuery] string? region, CancellationToken ct)
    {
        if (!Guid.TryParse(HttpContext.Items["UserId"]?.ToString(), out _))
            return Unauthorized();

        var list = await _families.GetAwaitingEntityAsync(region, ct);
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var familyId))
            return BadRequest();

        var family = await _families.GetByIdAsync(familyId, ct);
        return family is null ? NotFound() : Ok(family);
    }

    [HttpPatch("{id}/assign-entity")]
    public async Task<IActionResult> AssignEntity(string id, CancellationToken ct)
    {
        if (!Guid.TryParse(HttpContext.Items["UserId"]?.ToString(), out var userId))
            return Unauthorized();
        if (!Guid.TryParse(id, out var familyId))
            return BadRequest();

        var user = await HttpContext.RequestServices
            .GetRequiredService<IAuthService>()
            .GetByIdAsync(userId, ct);
        if (user?.EntityId is null || !Guid.TryParse(user.EntityId, out var entityId))
            return Forbid();

        var family = await _families.AssignEntityAsync(familyId, entityId, user.Name, ct);
        return Ok(family);
    }
}

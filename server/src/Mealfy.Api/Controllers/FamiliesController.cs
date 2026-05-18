using Mealfy.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.Api.Controllers;

[ApiController]
[Route("families")]
public class FamiliesController : ControllerBase
{
    private readonly IFamilyService _families;

    public FamiliesController(IFamilyService families) => _families = families;

    [HttpGet("public")]
    public async Task<IActionResult> GetPublic(CancellationToken ct)
    {
        var list = await _families.GetPublicAsync(ct);
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
}

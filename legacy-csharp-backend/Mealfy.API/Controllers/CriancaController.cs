// Mealfy.API/Controllers/CriancaController.cs
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CriancaController : ControllerBase
{
    [HttpPost]
    public IActionResult Criar([FromBody] object dto)
    {
        var mock = new
        {
            id = Guid.NewGuid(),
            nome = "Lucas Silva",
            dataNascimento = new DateTime(2017, 5, 10),
            cpf = "321.654.987-00",
            possuiDeficiencia = false,
            status = "Pendente",
            familiaId = Guid.NewGuid(),
            criadoEm = DateTime.UtcNow
        };
        return CreatedAtAction(nameof(ObterPorId), new { id = mock.id }, mock);
    }

    [HttpGet("{id:guid}")]
    public IActionResult ObterPorId(Guid id)
    {
        var mock = new
        {
            id,
            nome = "Lucas Silva",
            dataNascimento = new DateTime(2017, 5, 10),
            idadeAnos = 8,
            cpf = "321.654.987-00",
            possuiDeficiencia = false,
            status = "Aprovada",
            familiaId = Guid.NewGuid()
        };
        return Ok(mock);
    }

    [HttpGet("familia/{familiaId:guid}")]
    public IActionResult ListarPorFamilia(Guid familiaId)
    {
        var mock = new[]
        {
            new { id = Guid.NewGuid(), nome = "Lucas Silva",   idadeAnos = 8,  status = "Aprovada" },
            new { id = Guid.NewGuid(), nome = "Beatriz Silva", idadeAnos = 5,  status = "Aprovada" },
            new { id = Guid.NewGuid(), nome = "Pedro Silva",   idadeAnos = 11, status = "Pendente" }
        };
        return Ok(mock);
    }

    [HttpPut("aprovar/{id:guid}")]
    public IActionResult Aprovar(Guid id)
    {
        return Ok(new { mensagem = $"Criança {id} aprovada com sucesso." });
    }

    [HttpPut("rejeitar/{id:guid}")]
    public IActionResult Rejeitar(Guid id)
    {
        return Ok(new { mensagem = $"Criança {id} rejeitada." });
    }
}

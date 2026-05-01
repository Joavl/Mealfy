// Mealfy.API/Controllers/OngController.cs
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OngController : ControllerBase
{
    [HttpPost]
    public IActionResult Criar([FromBody] object dto)
    {
        var mock = new
        {
            id = Guid.NewGuid(),
            nome = "ONG Alimentar Esperança",
            cnpj = "12.345.678/0001-99",
            nomeResponsavel = "Carlos Mendes",
            email = "contato@ongalimentar.org",
            ativa = true,
            criadoEm = DateTime.UtcNow
        };
        return CreatedAtAction(nameof(ObterPorId), new { id = mock.id }, mock);
    }

    [HttpGet]
    public IActionResult Listar()
    {
        var mock = new[]
        {
            new { id = Guid.NewGuid(), nome = "ONG Alimentar Esperança", ativa = true,  totalFamilias = 32 },
            new { id = Guid.NewGuid(), nome = "Instituto Criança Feliz",  ativa = true,  totalFamilias = 18 },
            new { id = Guid.NewGuid(), nome = "Associação Pão e Vida",    ativa = false, totalFamilias = 5  }
        };
        return Ok(mock);
    }

    [HttpGet("{id:guid}")]
    public IActionResult ObterPorId(Guid id)
    {
        var mock = new
        {
            id,
            nome = "ONG Alimentar Esperança",
            cnpj = "12.345.678/0001-99",
            nomeResponsavel = "Carlos Mendes",
            email = "contato@ongalimentar.org",
            telefone = "(21) 3333-4444",
            ativa = true,
            totalFamiliasCadastradas = 32
        };
        return Ok(mock);
    }

    [HttpPut("desativar/{id:guid}")]
    public IActionResult Desativar(Guid id)
    {
        return Ok(new { mensagem = $"ONG {id} desativada." });
    }

    [HttpPut("ativar/{id:guid}")]
    public IActionResult Ativar(Guid id)
    {
        return Ok(new { mensagem = $"ONG {id} ativada." });
    }
}
